import type { Place } from "@/lib/types";

/**
 * Cerca nei campi testuali del luogo e nei tag (con o senza #).
 * Più parole (separate da spazi) devono comparire tutte (AND).
 */
export function matchesPlaceTextSearch(p: Place, raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return true;

  const tags = (p.tags ?? []).filter((t): t is string => typeof t === "string" && t.trim() !== "");
  const tagLower = tags.map((t) => t.toLowerCase());

  const hay = [
    p.name,
    p.address ?? "",
    p.description ?? "",
    p.extra_info ?? "",
    p.hours_note ?? "",
    p.category,
    p.submitted_by ?? "",
    ...tagLower,
    ...tagLower.map((t) => `#${t}`),
  ]
    .join("\n")
    .toLowerCase();

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((tok) => hay.includes(tok));
}
