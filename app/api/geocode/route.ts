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

type NominatimReverse = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

async function reverseNominatim(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as NominatimReverse;
  const la = data.lat != null ? Number.parseFloat(data.lat) : NaN;
  const lo = data.lon != null ? Number.parseFloat(data.lon) : NaN;
  const label = data.display_name?.trim();
  if (!label || Number.isNaN(la) || Number.isNaN(lo)) return null;
  return { lat: la, lng: lo, label };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reverse = searchParams.get("reverse") === "1" || searchParams.get("reverse") === "true";
  if (reverse) {
    const latRaw = searchParams.get("lat");
    const lngRaw = searchParams.get("lng") ?? searchParams.get("lon");
    const lat = latRaw != null ? Number.parseFloat(latRaw.replace(",", ".")) : NaN;
    const lng = lngRaw != null ? Number.parseFloat(lngRaw.replace(",", ".")) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "invalid_coordinates", results: [] as GeocodeResult[] }, { status: 400 });
    }
    try {
      const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN?.trim();
      if (mapboxToken) {
        const u = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
        );
        u.searchParams.set("access_token", mapboxToken);
        u.searchParams.set("limit", "1");
        u.searchParams.set("language", "it");
        const res = await fetch(u.toString(), { headers: { Accept: "application/json" }, next: { revalidate: 0 } });
        if (res.ok) {
          const data = (await res.json()) as MapboxGeocodeResponse;
          const f = data.features?.[0];
          const coords = f?.geometry?.coordinates;
          if (coords && coords.length >= 2) {
            const lngM = coords[0];
            const latM = coords[1];
            const label = (f?.place_name ?? f?.text ?? "").trim();
            if (label && Number.isFinite(latM) && Number.isFinite(lngM)) {
              return NextResponse.json({
                results: [{ lat: latM, lng: lngM, label }] satisfies GeocodeResult[],
              });
            }
          }
        }
      }
      const one = await reverseNominatim(lat, lng);
      if (!one) {
        return NextResponse.json({ results: [] as GeocodeResult[] });
      }
      return NextResponse.json({ results: [one] satisfies GeocodeResult[] });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "reverse_geocode_failed", results: [] as GeocodeResult[] },
        { status: 500 }
      );
    }
  }

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
