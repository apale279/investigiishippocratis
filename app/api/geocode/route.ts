import { NextResponse } from "next/server";

const USER_AGENT =
  "InVestigiisHippocratis/1.0 (Next.js; geocoding per mappa educativa)";

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(
    10,
    Math.max(1, Number.parseInt(limitRaw ?? "5", 10) || 5)
  );

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] as GeocodeResult[] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Servizio di ricerca non disponibile", results: [] },
        { status: 502 }
      );
    }

    const data = (await res.json()) as NominatimItem[];
    const results: GeocodeResult[] = (data ?? []).map((item) => ({
      lat: Number.parseFloat(item.lat),
      lng: Number.parseFloat(item.lon),
      label: item.display_name,
    }));

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore di rete durante la ricerca", results: [] },
      { status: 500 }
    );
  }
}
