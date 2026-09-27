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
import { api } from "./api";

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

export function parseImage(file: File): Promise<ParseResult> {
  const form = new FormData();
  form.append("image", file);
  return api<ParseResult, FormData>("POST", "/parse/image", form);
}

export function useCoach() {
  return useMutation({
    mutationFn: () => api<CoachResponse>("POST", "/coach"),
  });
}
