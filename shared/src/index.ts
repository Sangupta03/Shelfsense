// Every request and response that crosses the wire between web and API lives here.
// Both apps import these with `import type`, so if I rename a field the other side
// stops compiling instead of breaking quietly in the browser.

// ---------- enums (kept in sync with prisma/schema.prisma) ----------

export type Slot = "AM" | "PM" | "BOTH";
export type ProductType =
  | "CLEANSER"
  | "TONER"
  | "SERUM"
  | "MOISTURIZER"
  | "SUNSCREEN"
  | "TREATMENT"
  | "OTHER";
export type Severity = "LOW" | "MEDIUM" | "HIGH";
export type InputMethod = "PASTE" | "UPLOAD" | "SCAN";

// ---------- misc ----------

export interface HealthResponse {
  ok: boolean;
}

/** field name -> what's wrong with it */
export type FieldErrors = Record<string, string>;

export interface ApiErrorBody {
  error: string;
  fields?: FieldErrors;
}

// ---------- auth ----------

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  isDemo: boolean;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MeResponse {
  user: PublicUser;
}

// ---------- parsing (shape comes from the python service) ----------

/** matched = sure, check = probably right but look at it, unknown = no idea */
export type MatchStatus = "matched" | "check" | "unknown";

export interface ParsedItem {
  position: number;
  raw: string;
  inci: string | null;
  confidence: number;
  status: MatchStatus;
}

export interface ParseResult {
  source: "text" | "image";
  rawText: string;
  items: ParsedItem[];
}

export interface ParseTextInput {
  text: string;
}

// ---------- products ----------

export interface ProductIngredient {
  position: number;
  rawText: string;
  inci: string | null;
  confidence: number;
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  type: ProductType;
  slot: Slot;
  inputMethod: InputMethod;
  createdAt: string;
  ingredients: ProductIngredient[];
}

export interface ProductsResponse {
  products: Product[];
}

export interface NewIngredient {
  raw: string;
  inci: string | null;
  confidence: number;
}

export interface CreateProductInput {
  brand: string;
  name: string;
  type: ProductType;
  slot: Slot;
  inputMethod: InputMethod;
  ingredients: NewIngredient[];
}

export interface ProductResponse {
  product: Product;
}

// ---------- report ----------

export interface FindingProduct {
  id: string;
  brand: string;
  name: string;
  slot: Slot;
}

export interface ConflictSide extends FindingProduct {
  className: string;
  ingredient: string;
}

export interface ConflictFinding {
  id: string;
  kind: "conflict";
  ruleId: number;
  severity: Severity;
  message: string;
  a: ConflictSide;
  b: ConflictSide;
}

export interface DoubleEntry extends FindingProduct {
  ingredient: string;
  position: number;
  /** only filled when the product name itself says it, e.g. "10%" */
  percent: string | null;
}

export interface DoubleFinding {
  id: string;
  kind: "double";
  classSlug: string;
  className: string;
  message: string;
  products: DoubleEntry[];
}

export interface GapFinding {
  id: string;
  kind: "gap";
  ruleId: number;
  severity: Severity;
  slot: Slot;
  message: string;
  requiredClass: string | null;
  requiredType: ProductType | null;
}

export type Finding = ConflictFinding | DoubleFinding | GapFinding;

export interface ReportCounts {
  conflicts: number;
  doubles: number;
  gaps: number;
}

export interface ReportResponse {
  conflicts: ConflictFinding[];
  doubles: DoubleFinding[];
  gaps: GapFinding[];
  counts: ReportCounts;
}

// ---------- coach ----------

// These three are `type` instead of `interface` on purpose: the API stores them in a
// Prisma Json column, and only type aliases count as plain JSON objects to TypeScript.

export type CoachStep = {
  product: string;
  why: string;
};

export type CoachNight = {
  nights: string;
  steps: CoachStep[];
};

export type CoachOutput = {
  headline: string;
  am: CoachStep[];
  pm: CoachNight[];
  tips: string[];
};

/** "llm" = written by the model, "rules" = built by our own code (no API key set) */
export type CoachSource = "llm" | "rules";

export interface CoachResponse {
  coach: CoachOutput;
  cached: boolean;
  source: CoachSource;
  createdAt: string;
}
