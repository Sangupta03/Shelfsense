import type { ErrorRequestHandler, Request, Response } from "express";
import multer from "multer";
import type { ApiErrorBody } from "@shelfsense/shared";
import { HttpError } from "../lib/httpError.js";
import { isRecord } from "../validators/validate.js";

function send(res: Response, status: number, body: ApiErrorBody): void {
  res.status(status).json(body);
}

// express.json() throws errors shaped like { status: 400, type: "entity.parse.failed" }
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return isRecord(err) && typeof err.status === "number" && typeof err.type === "string";
}

// Last stop for every error. Express 5 forwards errors from async routes here
// automatically, so routes can just `throw`.
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof HttpError) {
    send(res, err.status, err.fields ? { error: err.message, fields: err.fields } : { error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    send(res, tooBig ? 413 : 400, { error: tooBig ? "That photo is over 4 MB. Try a smaller or closer photo." : "Upload one image at a time." });
    return;
  }

  if (isBodyParserError(err)) {
    const message = err.type === "entity.too.large" ? "Request is too large." : "Request body isn't valid JSON.";
    send(res, err.status, { error: message });
    return;
  }

  // Something we didn't plan for. Log the route and the error, but never the
  // body or cookies - those can hold passwords and session tokens.
  console.error(`[error] ${req.method} ${req.path}`, err);
  send(res, 500, { error: "Something went wrong on our side. Please try again." });
};

export function apiNotFound(_req: Request, res: Response): void {
  send(res, 404, { error: "No such API route." });
}
