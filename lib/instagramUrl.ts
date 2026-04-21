/** Hostname consentiti per link Instagram pubblici. */
const IG_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "instagr.am",
  "www.instagr.am",
]);

/** Segmenti path che non sono nomi utente profilo. */
const RESERVED_PATH_SEGMENTS = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "stories",
  "explore",
  "accounts",
  "direct",
  "legal",
  "about",
  "privacy",
  "terms",
  "developer",
  "download",
  "graphql",
  "oauth",
]);

export type InstagramUrlKind = "p" | "reel" | "tv";

export type ParsedInstagramPost = {
  type: "post";
  /** URL normalizzata https://www.instagram.com/... */
  canonicalUrl: string;
  shortcode: string;
  kind: InstagramUrlKind;
};

export type ParsedInstagramProfile = {
  type: "profile";
  canonicalUrl: string;
  username: string;
};

export type ParsedInstagramReference = ParsedInstagramPost | ParsedInstagramProfile;

/**
 * Rimuove caratteri invisibili e prova a estrarre un URL http(s) Instagram dal testo incollato
 * (messaggi, markdown, virgolette).
 */
export function normalizeInstagramInput(raw: string): string {
  let s = raw.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim();
  if (!s) return s;

  const embedded = s.match(
    /https?:\/\/(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/[^\s<>"']+/i
  );
  if (embedded) {
    s = embedded[0];
  } else if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }

  s = s.replace(/[)\].,;]+$/g, "");
  return s.trim();
}

function parseHostname(u: URL): boolean {
  return IG_HOSTS.has(u.hostname.toLowerCase());
}

/**
 * Post / reel / tv pubblici.
 */
function tryParsePost(path: string): ParsedInstagramPost | null {
  const m = path.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!m?.[2]) return null;

  const shortcode = m[2];
  const segment = m[1];
  const kind: InstagramUrlKind =
    segment === "tv" ? "tv" : segment === "p" ? "p" : "reel";
  const pathSeg = kind === "reel" ? "reel" : kind === "tv" ? "tv" : "p";
  const canonicalUrl = `https://www.instagram.com/${pathSeg}/${shortcode}/`;

  return { type: "post", canonicalUrl, shortcode, kind };
}

/**
 * Solo `/username/` (home profilo), senza sottopagine.
 */
function tryParseProfile(path: string): ParsedInstagramProfile | null {
  const segs = path.split("/").filter(Boolean);
  if (segs.length !== 1) return null;
  const user = segs[0];
  if (RESERVED_PATH_SEGMENTS.has(user.toLowerCase())) return null;
  if (!/^[A-Za-z0-9._]{1,30}$/.test(user)) return null;

  const canonicalUrl = `https://www.instagram.com/${user}/`;
  return { type: "profile", canonicalUrl, username: user };
}

/**
 * Post/reel/tv oppure profilo `/nomeutente/`.
 */
export function parseInstagramReference(raw: string): ParsedInstagramReference | null {
  const normalized = normalizeInstagramInput(raw);
  if (!normalized) return null;

  let u: URL;
  try {
    u = new URL(normalized);
  } catch {
    return null;
  }
  if (!parseHostname(u)) return null;

  const path = u.pathname.replace(/\/+$/, "") || "/";

  const post = tryParsePost(path);
  if (post) return post;

  const profile = tryParseProfile(path);
  if (profile) return profile;

  return null;
}

/** @deprecated Usa parseInstagramReference */
export function parseInstagramUrl(raw: string): ParsedInstagramPost | null {
  const r = parseInstagramReference(raw);
  return r?.type === "post" ? r : null;
}
