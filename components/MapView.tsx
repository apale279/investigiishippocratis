"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Place } from "@/lib/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { haversineKm, SEARCH_RADIUS_KM } from "@/lib/geo";
import "leaflet/dist/leaflet.css";

function MapFitController({
  allPlaces,
  displayPlaces,
  searchCenter,
}: {
  allPlaces: Place[];
  displayPlaces: Place[];
  searchCenter: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!searchCenter) {
      if (allPlaces.length > 0) {
        const bounds = L.latLngBounds(
          allPlaces.map((p) => [p.lat, p.lng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      }
      return;
    }
    if (displayPlaces.length > 0) {
      const pts: [number, number][] = displayPlaces.map((p) => [p.lat, p.lng]);
      pts.push([searchCenter.lat, searchCenter.lng]);
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    } else {
      map.setView([searchCenter.lat, searchCenter.lng], 10);
    }
  }, [map, allPlaces, displayPlaces, searchCenter]);
  return null;
}

const searchPinIcon = L.divIcon({
  className: "border-0 bg-transparent",
  html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">📍</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

export default function MapView() {
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const icon = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
    delete icon._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error: qErr } = await supabase
          .from("places")
          .select("id, name, address, description, lat, lng, category, status, submitted_by")
          .eq("status", "approved");

        if (qErr) throw qErr;
        if (!cancelled) setAllPlaces((data as Place[]) ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            "Impossibile caricare i luoghi. Controlla .env.local e che la tabella esista su Supabase."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPlaces = useMemo(() => {
    if (!searchCenter) return allPlaces;
    return allPlaces.filter(
      (p) =>
        haversineKm(searchCenter.lat, searchCenter.lng, p.lat, p.lng) <= SEARCH_RADIUS_KM
    );
  }, [allPlaces, searchCenter]);

  const center: [number, number] = [42.5, 12.5];
  const zoom = allPlaces.length === 0 ? 5 : 6;

  async function runSearch() {
    const q = searchQuery.trim();
    setSearchError(null);
    if (q.length < 2) {
      setSearchError("Scrivi almeno 2 caratteri (es. Berlino).");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=1`);
      const data = (await res.json()) as {
        results?: { lat: number; lng: number; label: string }[];
        error?: string;
      };
      if (!res.ok) {
        setSearchError(data.error ?? "Ricerca non riuscita.");
        return;
      }
      const first = data.results?.[0];
      if (!first) {
        setSearchError("Nessun risultato. Prova un altro nome o una città più nota.");
        setSearchCenter(null);
        return;
      }
      setSearchCenter({ lat: first.lat, lng: first.lng, label: first.label });
    } catch (e) {
      console.error(e);
      setSearchError("Errore di rete durante la ricerca.");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchCenter(null);
    setSearchError(null);
  }

  return (
    <div className="relative min-h-0 flex-1 bg-stone-200 dark:bg-stone-800">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1000] flex flex-col gap-2 p-3 sm:left-3 sm:right-auto sm:max-w-md">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-md backdrop-blur dark:border-stone-600 dark:bg-stone-900/95">
          <label htmlFor="map-search" className="text-xs font-medium text-stone-600 dark:text-stone-400">
            Cerca un luogo (città o indirizzo)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="map-search"
              className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="es. Berlino, Parigi, Via Roma Milano…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={searching}
                onClick={() => void runSearch()}
                className="whitespace-nowrap rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {searching ? "…" : "Cerca"}
              </button>
              {searchCenter && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="whitespace-nowrap rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                >
                  Mostra tutti
                </button>
              )}
            </div>
          </div>
          {searchCenter && (
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Area: <span className="font-medium text-stone-800 dark:text-stone-200">{SEARCH_RADIUS_KM} km</span> da{" "}
              <span className="line-clamp-2 text-stone-800 dark:text-stone-200">{searchCenter.label}</span>
              {" · "}
              <span className="font-medium">{displayPlaces.length}</span> luoghi in mappa
            </p>
          )}
          {searchError && (
            <p className="text-xs text-red-700 dark:text-red-400">{searchError}</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-stone-100/80 text-stone-600 dark:bg-stone-900/80 dark:text-stone-300">
          Caricamento mappa…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 text-center text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full min-h-[400px]"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFitController
          allPlaces={allPlaces}
          displayPlaces={displayPlaces}
          searchCenter={searchCenter ? { lat: searchCenter.lat, lng: searchCenter.lng } : null}
        />
        {searchCenter && (
          <>
            <Circle
              center={[searchCenter.lat, searchCenter.lng]}
              radius={SEARCH_RADIUS_KM * 1000}
              pathOptions={{
                color: "#0d9488",
                weight: 1,
                fillColor: "#0d9488",
                fillOpacity: 0.08,
              }}
            />
            <Marker position={[searchCenter.lat, searchCenter.lng]} icon={searchPinIcon}>
              <Popup>
                <div className="max-w-xs text-sm">
                  <p className="font-semibold">Ricerca</p>
                  <p className="text-stone-600">{searchCenter.label}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Cerchio ≈ {SEARCH_RADIUS_KM} km — solo i POI dentro l&apos;area sono mostrati.
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}
        {displayPlaces.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="max-w-xs text-sm">
                <p className="font-semibold">{p.name}</p>
                {p.address ? (
                  <p className="text-xs text-stone-500 dark:text-stone-400">{p.address}</p>
                ) : null}
                <p className="text-stone-600">{p.category}</p>
                {p.description ? <p className="mt-1">{p.description}</p> : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
