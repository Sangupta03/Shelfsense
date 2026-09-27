import { ApiError } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { askModel, coachModel, coachModels } from "../src/lib/llm.js";

// Fake the Gemini SDK itself: every "call" goes to generateContent below.
// vi.hoisted makes the fake exist before vi.mock (which vitest moves to the top).
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return {
    ...actual, // keep the real ApiError class
    GoogleGenAI: vi.fn(function FakeGoogleGenAI() {
      return { models: { generateContent } };
    }),
  };
});

const rateLimited = () => new ApiError({ message: "quota exceeded", status: 429 });

beforeEach(() => {
  generateContent.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {}); // keep test output clean
  process.env.GEMINI_API_KEY = "fake-key";
  process.env.GEMINI_MODEL = "model-a, model-b ,model-c";
});

describe("model list", () => {
  it("reads a comma-separated list and trims it", () => {
    expect(coachModels()).toEqual(["model-a", "model-b", "model-c"]);
    expect(coachModel()).toBe("model-a");
  });

  it("falls back to the default when empty", () => {
    process.env.GEMINI_MODEL = "";
    expect(coachModels()).toHaveLength(1);
  });
});

describe("askModel fallback", () => {
  it("uses the first model when it works", async () => {
    generateContent.mockResolvedValueOnce({ text: ' {"ok":true} ' });
    expect(await askModel("sys", "hi")).toBe('{"ok":true}');
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0]?.[0].model).toBe("model-a");
  });

  it("moves to the next model when one is rate limited", async () => {
    generateContent.mockRejectedValueOnce(rateLimited()).mockResolvedValueOnce({ text: "from b" });
    expect(await askModel("sys", "hi")).toBe("from b");
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual(["model-a", "model-b"]);
  });

  it("gives up with the last error when every model is busy", async () => {
    generateContent.mockRejectedValue(rateLimited());
    await expect(askModel("sys", "hi")).rejects.toBeInstanceOf(ApiError);
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("does not switch models for errors another model won't fix", async () => {
    generateContent.mockRejectedValueOnce(new ApiError({ message: "bad key", status: 403 }));
    await expect(askModel("sys", "hi")).rejects.toThrow("bad key");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
