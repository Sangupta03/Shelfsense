import type { FieldErrors } from "@shelfsense/shared";

// One fetch helper for the whole app. The generic types mean every call site says
// what it sends and what it gets back, e.g. api<MeResponse, LoginInput>("POST", "/auth/login", input)

export class ApiError extends Error {
  readonly status: number;
  readonly fields: FieldErrors;

  constructor(status: number, message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

type Method = "GET" | "POST" | "DELETE";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function toApiError(status: number, data: unknown): ApiError {
  if (!isRecord(data)) return new ApiError(status, "Something went wrong. Please try again.");

  const message = typeof data.error === "string" ? data.error : "Something went wrong. Please try again.";
  const fields: FieldErrors = {};
  if (isRecord(data.fields)) {
    for (const [key, value] of Object.entries(data.fields)) {
      if (typeof value === "string") fields[key] = value;
    }
  }
  return new ApiError(status, message, fields);
}

export async function api<TResponse, TBody = undefined>(
  method: Method,
  path: string,
  body?: TBody,
): Promise<TResponse> {
  const init: RequestInit = { method, credentials: "same-origin" }; // sends our session cookie

  if (body instanceof FormData) {
    init.body = body; // the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as TResponse; // "done, nothing to say"

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res.status, data);

  // The server is ours and speaks the shared types, so we trust the shape here.
  return data as TResponse;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}
