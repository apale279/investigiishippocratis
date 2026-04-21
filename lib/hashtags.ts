import type { Place } from "@/lib/types";

export function normalizeTagParam(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const t = raw.replace(/^#/, "").trim().toLowerCase();
  return t || null;
}

function tagSet(place: Pick<Place, "tags">): Set<string> {
  const s = new Set<string>();
  for (const t of place.tags ?? []) {
    if (typeof t === "string" && t.trim()) s.add(t.toLowerCase());
  }
  return s;
}

export function placeHasTag(place: Pick<Place, "tags">, tag: string | null): boolean {
  if (!tag) return true;
  return tagSet(place).has(tag.toLowerCase());
}
