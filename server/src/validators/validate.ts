import type {
  CreateProductInput,
  FieldErrors,
  InputMethod,
  LoginInput,
  MatchStatus,
  NewIngredient,
  ParseResult,
  ParseTextInput,
  ParsedItem,
  ProductType,
  SignupInput,
  Slot,
} from "@shelfsense/shared";

// Hand-written validation. Every function takes `unknown` (we have no idea what a
// stranger POSTed) and hands back either a clean, typed value or a list of errors.
// The caller has to check `ok` before touching `value`, and TypeScript enforces that.

export type Result<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

const SLOTS: readonly Slot[] = ["AM", "PM", "BOTH"];
const PRODUCT_TYPES: readonly ProductType[] = [
  "CLEANSER",
  "TONER",
  "SERUM",
  "MOISTURIZER",
  "SUNSCREEN",
  "TREATMENT",
  "OTHER",
];
const INPUT_METHODS: readonly InputMethod[] = ["PASTE", "UPLOAD", "SCAN"];
const MATCH_STATUSES: readonly MatchStatus[] = ["matched", "check", "unknown"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INGREDIENTS = 120;

// ---------- small type guards ----------

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function isSlot(x: unknown): x is Slot {
  return typeof x === "string" && (SLOTS as readonly string[]).includes(x);
}

export function isProductType(x: unknown): x is ProductType {
  return typeof x === "string" && (PRODUCT_TYPES as readonly string[]).includes(x);
}

export function isInputMethod(x: unknown): x is InputMethod {
  return typeof x === "string" && (INPUT_METHODS as readonly string[]).includes(x);
}

function isMatchStatus(x: unknown): x is MatchStatus {
  return typeof x === "string" && (MATCH_STATUSES as readonly string[]).includes(x);
}

/** Pulls a trimmed string out of the body, or "" if it's missing / not a string. */
function readText(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function done<T>(errors: FieldErrors, value: T): Result<T> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

// ---------- auth ----------

function checkEmail(email: string, errors: FieldErrors): void {
  if (!email) errors.email = "Email is required.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "That doesn't look like an email.";
}

export function parseSignup(body: unknown): Result<SignupInput> {
  if (!isRecord(body)) return { ok: false, errors: { form: "Expected a JSON object." } };

  const name = readText(body, "name");
  const email = readText(body, "email").toLowerCase();
  // don't trim passwords - a space can be part of someone's password
  const password = typeof body.password === "string" ? body.password : "";
  const errors: FieldErrors = {};

  if (!name) errors.name = "Name is required.";
  else if (name.length > 60) errors.name = "Keep it under 60 characters.";

  checkEmail(email, errors);

  if (password.length < 8) errors.password = "Use at least 8 characters.";
  // bcrypt quietly ignores everything after 72 bytes, so refuse longer ones
  else if (Buffer.byteLength(password, "utf8") > 72) errors.password = "That's too long (72 bytes max).";

  return done(errors, { name, email, password });
}

export function parseLogin(body: unknown): Result<LoginInput> {
  if (!isRecord(body)) return { ok: false, errors: { form: "Expected a JSON object." } };

  const email = readText(body, "email").toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const errors: FieldErrors = {};

  checkEmail(email, errors);
  if (!password) errors.password = "Password is required.";

  return done(errors, { email, password });
}

// ---------- parsing ----------

export function parseTextInput(body: unknown): Result<ParseTextInput> {
  if (!isRecord(body)) return { ok: false, errors: { form: "Expected a JSON object." } };

  const text = readText(body, "text");
  const errors: FieldErrors = {};
  if (!text) errors.text = "Paste the ingredient list first.";
  else if (text.length > 5000) errors.text = "That's longer than any label I've seen (5000 characters max).";

  return done(errors, { text });
}

function isParsedItem(x: unknown): x is ParsedItem {
  return (
    isRecord(x) &&
    typeof x.position === "number" &&
    typeof x.raw === "string" &&
    (x.inci === null || typeof x.inci === "string") &&
    typeof x.confidence === "number" &&
    isMatchStatus(x.status)
  );
}

/** The python service is ours, but it's still another process - check what it sends back. */
export function isParseResult(x: unknown): x is ParseResult {
  return (
    isRecord(x) &&
    (x.source === "text" || x.source === "image") &&
    typeof x.rawText === "string" &&
    Array.isArray(x.items) &&
    x.items.every(isParsedItem)
  );
}

// ---------- products ----------

function parseIngredient(x: unknown): NewIngredient | null {
  if (!isRecord(x)) return null;
  const raw = typeof x.raw === "string" ? x.raw.trim() : "";
  const inci = typeof x.inci === "string" && x.inci.trim() ? x.inci.trim().toUpperCase() : null;
  const confidence = typeof x.confidence === "number" ? Math.round(x.confidence) : NaN;

  if (!raw || raw.length > 200) return null;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) return null;
  return { raw, inci, confidence };
}

export function parseCreateProduct(body: unknown): Result<CreateProductInput> {
  if (!isRecord(body)) return { ok: false, errors: { form: "Expected a JSON object." } };

  const brand = readText(body, "brand");
  const name = readText(body, "name");
  const { type, slot, inputMethod } = body;
  const errors: FieldErrors = {};

  if (!brand) errors.brand = "Brand is required.";
  else if (brand.length > 80) errors.brand = "Keep it under 80 characters.";

  if (!name) errors.name = "Product name is required.";
  else if (name.length > 80) errors.name = "Keep it under 80 characters.";

  if (!isProductType(type)) errors.type = "Pick a product type.";
  if (!isSlot(slot)) errors.slot = "Pick when you use it.";
  if (!isInputMethod(inputMethod)) errors.inputMethod = "Unknown input method.";

  const rawList = Array.isArray(body.ingredients) ? body.ingredients : [];
  const ingredients: NewIngredient[] = [];
  for (const item of rawList) {
    const parsed = parseIngredient(item);
    if (!parsed) {
      errors.ingredients = "One of the ingredients is malformed.";
      break;
    }
    ingredients.push(parsed);
  }
  if (!errors.ingredients && ingredients.length === 0) errors.ingredients = "Add at least one ingredient.";
  if (ingredients.length > MAX_INGREDIENTS) errors.ingredients = `That's more than ${MAX_INGREDIENTS} ingredients.`;

  // running the guards again here lets TypeScript narrow the three fields, no casts needed
  if (Object.keys(errors).length > 0 || !isProductType(type) || !isSlot(slot) || !isInputMethod(inputMethod)) {
    return { ok: false, errors };
  }
  return { ok: true, value: { brand, name, type, slot, inputMethod, ingredients } };
}
