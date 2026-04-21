import { NextResponse } from "next/server";
import { normalizeInstagramInput, parseInstagramReference } from "@/lib/instagramUrl";

const USER_AGENT =
  "InVestigiisHippocratis/1.0 (Next.js; import Instagram per proposte luogo)";

type OembedBody = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  provider_name?: string;
};

function appAccessToken(): string | null {
  const id = process.env.FACEBOOK_APP_ID?.trim();
  const secret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (id && secret) return `${id}|${secret}`;
  return process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? null;
}

async function fetchInstagramOembed(canonicalUrl: string): Promise<OembedBody | null> {
  const token = appAccessToken();
  if (!token) return null;

  const u = new URL("https://graph.facebook.com/v21.0/instagram_oembed");
  u.searchParams.set("url", canonicalUrl);
  u.searchParams.set("access_token", token);
  u.searchParams.set("omitscript", "true");

  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.warn("instagram_oembed HTTP", res.status);
    return null;
  }

  return (await res.json()) as OembedBody;
}

export type InstagramImportResponse = {
  kind: "post" | "profile";
  canonicalUrl: string;
  shortcode?: string;
  username?: string;
  suggestedName: string;
  suggestedDescription: string;
  authorName: string | null;
  thumbnailUrl: string | null;
  source: "oembed" | "url_only" | "profile";
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const urlRaw =
    typeof body === "object" && body !== null && "url" in body && typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url
      : "";

  const normalized = normalizeInstagramInput(urlRaw.trim());
  if (!normalized || normalized.length < 8) {
    return NextResponse.json({ error: "invalid_instagram_url" }, { status: 400 });
  }

  const parsed = parseInstagramReference(normalized);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_instagram_url" }, { status: 400 });
  }

  if (parsed.type === "profile") {
    const payload: InstagramImportResponse = {
      kind: "profile",
      canonicalUrl: parsed.canonicalUrl,
      username: parsed.username,
      suggestedName: `Instagram — @${parsed.username}`,
      suggestedDescription: "",
      authorName: null,
      thumbnailUrl: null,
      source: "profile",
    };
    return NextResponse.json(payload);
  }

  let oembed: OembedBody | null = null;
  try {
    oembed = await fetchInstagramOembed(parsed.canonicalUrl);
  } catch (e) {
    console.error(e);
  }

  const authorName = oembed?.author_name?.trim() || null;
  const title = oembed?.title?.trim();
  const thumb = oembed?.thumbnail_url?.trim() || null;

  let suggestedName: string;
  if (title && title.length > 0) {
    suggestedName = title.length > 200 ? `${title.slice(0, 197)}…` : title;
  } else if (authorName) {
    suggestedName = `Instagram — ${authorName}`;
  } else {
    suggestedName = `Post Instagram (${parsed.shortcode})`;
  }

  const lines: string[] = [];
  if (title) lines.push(title);
  if (authorName) lines.push(`Autore: ${authorName}`);
  lines.push(`Link: ${parsed.canonicalUrl}`);
  if (thumb) lines.push(`Anteprima: ${thumb}`);
  const suggestedDescription = lines.join("\n\n");

  const payload: InstagramImportResponse = {
    kind: "post",
    canonicalUrl: parsed.canonicalUrl,
    shortcode: parsed.shortcode,
    suggestedName,
    suggestedDescription,
    authorName,
    thumbnailUrl: thumb,
    source: oembed ? "oembed" : "url_only",
  };

  return NextResponse.json(payload);
}
