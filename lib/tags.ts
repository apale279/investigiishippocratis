const MAX_TAGS = 30;
const MAX_TAG_LEN = 48;

/**
 * Converte input utente (virgole, punti e virgola, newline; # opzionale) in tag normalizzati.
 */
export function parseTagsInput(raw: string): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of raw.split(/[,;\n]+/)) {
    let t = chunk.trim().replace(/^#+/u, "").trim().toLowerCase();
    if (!t) continue;
    t = t.normalize("NFKC");
    if (t.length > MAX_TAG_LEN) t = t.slice(0, MAX_TAG_LEN);
    if (!/^[\p{L}\p{N}_]+$/u.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function normalizeTagsFromUnknown(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return parseTagsInput(v.filter((x): x is string => typeof x === "string").join(", "));
  }
  if (typeof v === "string") return parseTagsInput(v);
  return [];
}
