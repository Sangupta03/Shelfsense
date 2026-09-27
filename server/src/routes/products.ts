import { Router } from "express";
import type { ProductResponse, ProductsResponse } from "@shelfsense/shared";
import { prisma } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { loadProducts, toProduct, withIngredients } from "../services/products.js";
import { blockDemo, currentUser, requireAuth } from "../middleware/requireAuth.js";
import { parseCreateProduct } from "../validators/validate.js";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get("/", async (req, res) => {
  const body: ProductsResponse = { products: await loadProducts(currentUser(req).id) };
  res.json(body);
});

productsRouter.post("/", blockDemo, async (req, res) => {
  const parsed = parseCreateProduct(req.body);
  if (!parsed.ok) throw new HttpError(400, "Please fix the highlighted fields.", parsed.errors);
  const input = parsed.value;
  const userId = currentUser(req).id;

  // All or nothing: either the product AND every ingredient row get saved, or none of it.
  // Without a transaction a crash halfway could leave a product with half its label.
  const row = await prisma.$transaction(async (tx) => {
    // The browser sends standard names, but we look up the ids ourselves - never trust
    // the client to tell us database ids. Unknown names just end up as "unmatched".
    const names = [...new Set(input.ingredients.flatMap((i) => (i.inci ? [i.inci] : [])))];
    const known = await tx.ingredient.findMany({
      where: { inciName: { in: names } },
      select: { id: true, inciName: true },
    });
    const idByName = new Map(known.map((k) => [k.inciName, k.id]));

    const product = await tx.product.create({
      data: {
        userId,
        brand: input.brand,
        name: input.name,
        type: input.type,
        slot: input.slot,
        inputMethod: input.inputMethod,
      },
    });

    await tx.productIngredient.createMany({
      data: input.ingredients.map((item, index) => {
        const ingredientId = item.inci ? (idByName.get(item.inci) ?? null) : null;
        return {
          productId: product.id,
          position: index + 1, // label order is the order they were sent in
          ingredientId,
          rawText: item.raw,
          confidence: ingredientId ? item.confidence : 0,
        };
      }),
    });

    return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: withIngredients });
  });

  const body: ProductResponse = { product: toProduct(row) };
  res.status(201).json(body);
});

productsRouter.delete("/:id", blockDemo, async (req, res) => {
  // The ownership check and the delete are ONE query: "delete this id, but only if
  // it's mine". Someone guessing another user's product id just gets a 404.
  const id = req.params.id;
  if (typeof id !== "string") throw new HttpError(404, "Product not found.");

  const { count } = await prisma.product.deleteMany({
    where: { id, userId: currentUser(req).id },
  });
  if (count === 0) throw new HttpError(404, "Product not found.");
  res.status(204).end();
});
