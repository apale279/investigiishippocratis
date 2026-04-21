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

type MapboxFeature = {
  place_name?: string;
  text?: string;
  geometry?: { type?: string; coordinates?: [number, number] };
};

type MapboxGeocodeResponse = {
  features?: MapboxFeature[];
};

/** Risultati Mapbox oppure `null` se va usato il fallback (nessun token o errore HTTP). */
async function tryMapbox(q: string, limit: number): Promise<GeocodeResult[] | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const path = encodeURIComponent(q);
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("language", "it");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("Mapbox geocode HTTP", res.status);
    return null;
  }

  const data = (await res.json()) as MapboxGeocodeResponse;
  const features = data.features ?? [];

  return features
    .map((f) => {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;
      const lng = coords[0];
      const lat = coords[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = (f.place_name ?? f.text ?? "").trim();
      if (!label) return null;
      return { lat, lng, label };
    })
    .filter((x): x is GeocodeResult => x !== null);
}

async function geocodeNominatim(q: string, limit: number): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Nominatim ${res.status}`);
  }

  const data = (await res.json()) as NominatimItem[];
  return (data ?? []).map((item) => ({
    lat: Number.parseFloat(item.lat),
    lng: Number.parseFloat(item.lon),
    label: item.display_name,
  }));
}

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

  try {
    const mapboxResults = await tryMapbox(q, limit);
    if (mapboxResults !== null) {
      return NextResponse.json({ results: mapboxResults });
    }

    const results = await geocodeNominatim(q, limit);
    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore di rete durante la ricerca", results: [] },
      { status: 500 }
    );
  }
}
