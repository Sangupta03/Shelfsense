import type { FieldErrors } from "@shelfsense/shared";

// Throw one of these anywhere in a route and errorHandler turns it into
// a JSON response with the right status code. Keeps the routes flat.
export class HttpError extends Error {
  readonly status: number;
  readonly fields: FieldErrors | undefined;

  constructor(status: number, message: string, fields?: FieldErrors) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fields = fields;
  }
}
