import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CoachResponse,
  CreateProductInput,
  ParseResult,
  ParseTextInput,
  ProductResponse,
  ProductsResponse,
  ReportResponse,
} from "@shelfsense/shared";
import { ApiError, api } from "./api";

// All the server data for a logged-in user: queries to read it, mutations to change it.

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => (await api<ProductsResponse>("GET", "/products")).products,
});

export const reportQuery = queryOptions({
  queryKey: ["report"],
  queryFn: () => api<ReportResponse>("GET", "/report"),
});

/** After any shelf change, both the product list and the report are out of date. */
function useRefreshShelf() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: reportQuery.queryKey }),
    ]);
}

export function useCreateProduct() {
  const refresh = useRefreshShelf();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      api<ProductResponse, CreateProductInput>("POST", "/products", input),
    onSuccess: refresh,
  });
}

export function useDeleteProduct() {
  const refresh = useRefreshShelf();
  return useMutation({
    mutationFn: (id: string) => api<void>("DELETE", `/products/${encodeURIComponent(id)}`),
    onSuccess: refresh,
  });
}

export function parseText(text: string): Promise<ParseResult> {
  return api<ParseResult, ParseTextInput>("POST", "/parse/text", { text });
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // the server's limit (Vercel caps requests at 4.5 MB)
const MAX_SIDE = 1568; // Gemini doesn't read labels any better above this, so don't send more

/**
 * Phone photos are often 3-12 MB. Shrinking them here, before uploading, keeps them far
 * under the limit (usually ~300 KB) and makes the upload fast on mobile data.
 * `imageOrientation: "from-image"` applies the phone's rotation tag while drawing.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const shrunk = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return shrunk ?? file;
  } catch {
    return file; // a format this browser can't decode - send it as it is
  }
}

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export async function parseImage(file: File): Promise<ParseResult> {
  const photo = await shrinkPhoto(file);
  if (photo.size > MAX_UPLOAD_BYTES) {
    // say it clearly BEFORE uploading, instead of a vague error from the server
    throw new ApiError(
      413,
      `This photo is ${megabytes(photo.size)} MB and the limit is 4 MB. Try a JPG or PNG, a closer photo, or a screenshot of the label.`,
    );
  }
  const form = new FormData();
  form.append("image", photo, "label.jpg");
  return api<ParseResult, FormData>("POST", "/parse/image", form);
}

export function useCoach() {
  return useMutation({
    mutationFn: () => api<CoachResponse>("POST", "/coach"),
  });
}
