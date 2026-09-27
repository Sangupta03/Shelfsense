import type { ProductType, Severity, Slot } from "@shelfsense/shared";

// Human words for the enum values, in one place.

export const SLOT_LABEL: Record<Slot, string> = {
  AM: "Morning",
  PM: "Evening",
  BOTH: "Morning & evening",
};

export const SLOT_SHORT: Record<Slot, string> = { AM: "AM", PM: "PM", BOTH: "AM + PM" };

export const TYPE_LABEL: Record<ProductType, string> = {
  CLEANSER: "Cleanser",
  TONER: "Toner",
  SERUM: "Serum",
  MOISTURIZER: "Moisturizer",
  SUNSCREEN: "Sunscreen",
  TREATMENT: "Treatment",
  OTHER: "Other",
};

export const PRODUCT_TYPES: ProductType[] = [
  "CLEANSER",
  "TONER",
  "SERUM",
  "TREATMENT",
  "MOISTURIZER",
  "SUNSCREEN",
  "OTHER",
];

export const SLOTS: Slot[] = ["AM", "PM", "BOTH"];

export const SEVERITY_LABEL: Record<Severity, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

export const DEMO_TOOLTIP = "Demo is read-only — sign up to build your own shelf.";

/**
 * "NIACINAMIDE" -> "Niacinamide", "CAPRYLIC/CAPRIC TRIGLYCERIDE" -> "Caprylic/Capric Triglyceride".
 * Codes like "NP", "PCA" or "PEG" stay in capitals ("Ceramide NP", not "Ceramide Np").
 */
const KEEP_CAPS = new Set(["NP", "AP", "EOP", "PCA", "PEG", "EDTA", "CI", "SPF", "UV", "HA", "BHA", "AHA"]);

export function prettyInci(name: string): string {
  return name.replace(/[A-Z]+/g, (word) => (KEEP_CAPS.has(word) ? word : word[0] + word.slice(1).toLowerCase()));
}
