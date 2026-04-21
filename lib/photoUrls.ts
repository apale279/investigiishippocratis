const MAX_PHOTOS = 3;

/** Valida URL HTTPS da salvare in DB (max 3). */
export function normalizePhotoUrlsFromUnknown(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string" || !x.startsWith("https://")) continue;
    try {
      const u = new URL(x);
      if (u.protocol !== "https:") continue;
      out.push(x);
    } catch {
      continue;
    }
    if (out.length >= MAX_PHOTOS) break;
  }
  return out;
}
