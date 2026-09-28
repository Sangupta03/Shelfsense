import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/db.js";
import { SESSION_COOKIE } from "../src/services/sessions.js";
import { cleanupTestUsers, cookieFor, makeProduct, makeUser, testEmail } from "./helpers.js";

const app = createApp();
const PASSWORD = "correct horse battery";

afterAll(cleanupTestUsers);

function sessionCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : [raw ?? ""];
  return cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`)) ?? "";
}

describe("auth", () => {
  it("signs up, stays logged in, logs out", async () => {
    const agent = request.agent(app); // an agent keeps cookies between requests, like a browser
    const email = testEmail("flow");

    const signup = await agent.post("/api/auth/signup").send({ name: "Sam", email, password: PASSWORD });
    expect(signup.status).toBe(201);
    expect(signup.body.user).toMatchObject({ email, name: "Sam", isDemo: false });

    const cookie = sessionCookie(signup);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    expect((await agent.get("/api/auth/me")).status).toBe(200);
    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("stores only a hash of the session token", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Hash", email: testEmail("hash"), password: PASSWORD });

    const token = decodeURIComponent(sessionCookie(res).split(";")[0]!.split("=")[1]!);
    const hashed = createHash("sha256").update(token).digest("hex");

    expect(await prisma.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: hashed } })).not.toBeNull();
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const email = testEmail("wrongpw");
    await request(app).post("/api/auth/signup").send({ name: "W", email, password: PASSWORD });

    const wrongPassword = await request(app).post("/api/auth/login").send({ email, password: "nope-nope-nope" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail("ghost"), password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });

  it("logs in with the right password, email case doesn't matter", async () => {
    const email = testEmail("rightpw");
    await request(app).post("/api/auth/signup").send({ name: "R", email, password: PASSWORD });

    const res = await request(app).post("/api/auth/login").send({ email: email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it("refuses a duplicate email with 409", async () => {
    const email = testEmail("dupe");
    await request(app).post("/api/auth/signup").send({ name: "D", email, password: PASSWORD });
    const again = await request(app).post("/api/auth/signup").send({ name: "D2", email, password: PASSWORD });

    expect(again.status).toBe(409);
    expect(again.body.fields.email).toBeDefined();
  });

  it("returns field errors for bad input", async () => {
    const res = await request(app).post("/api/auth/signup").send({ name: "", email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(["email", "name", "password"]);
  });

  it("never sends the password or its hash back", async () => {
    const agent = request.agent(app);
    const email = testEmail("leak");
    const responses = [
      await agent.post("/api/auth/signup").send({ name: "L", email, password: PASSWORD }),
      await agent.post("/api/auth/login").send({ email, password: PASSWORD }),
      await agent.get("/api/auth/me"),
    ];
    for (const res of responses) {
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(PASSWORD);
      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("$2"); // bcrypt hashes start with $2a$/$2b$
    }
  });

  it("logs anyone into the seeded demo account with one click", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/demo");
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "demo@shelfsense.app", isDemo: true });

    // and the demo shelf is really there
    const products = await agent.get("/api/products");
    expect(products.body.products.length).toBeGreaterThan(0);
  });

  it("keeps the demo account read-only", async () => {
    const demo = await makeUser("demo", true);
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", await cookieFor(demo.id))
      .send({ brand: "x", name: "y", type: "SERUM", slot: "AM", inputMethod: "PASTE", ingredients: [] });
    expect(res.status).toBe(403);
  });

  it("never lets one user delete or see another user's product", async () => {
    const owner = await makeUser("owner");
    const stranger = await makeUser("stranger");
    const product = await makeProduct(owner.id, { name: "Mine", type: "SERUM", slot: "PM", inci: ["RETINOL"] });

    const del = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Cookie", await cookieFor(stranger.id));
    expect(del.status).toBe(404); // not "forbidden" - a stranger doesn't even learn it exists

    const strangerShelf = await request(app).get("/api/products").set("Cookie", await cookieFor(stranger.id));
    expect(strangerShelf.body.products).toHaveLength(0);

    const ownerShelf = await request(app).get("/api/products").set("Cookie", await cookieFor(owner.id));
    expect(ownerShelf.body.products).toHaveLength(1); // still there
  });

  it("answers 401 to private routes without a cookie", async () => {
    expect((await request(app).get("/api/products")).status).toBe(401);
    expect((await request(app).get("/api/report")).status).toBe(401);
  });
});
