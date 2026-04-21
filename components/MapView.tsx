"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useRouter, useSearchParams } from "next/navigation";
import type { Place } from "@/lib/types";
import { MapUrlFocus } from "@/components/MapUrlFocus";
import { PlaceMapPopup } from "@/components/PlaceMapPopup";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { DEFAULT_SEARCH_RADIUS_KM, haversineKm } from "@/lib/geo";
import { categoryDisplayName } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import { normalizeTagParam, placeHasTag } from "@/lib/hashtags";
import { getMarkerIconForCategory, getSearchCenterIcon } from "@/lib/mapCategoryIcons";
import "leaflet/dist/leaflet.css";

const RADIUS_MIN_KM = 1;
const RADIUS_MAX_KM = 500;

function clampRadiusKm(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_SEARCH_RADIUS_KM;
  return Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, Math.round(n)));
}

function MapFlyTo({
  target,
}: {
  target: { lat: number; lng: number; seq: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 15, { duration: 0.55 });
  }, [target, map]);
  return null;
}

function MapFitController({
  placesForInitialFit,
  displayPlaces,
  searchCenter,
}: {
  placesForInitialFit: Place[];
  displayPlaces: Place[];
  searchCenter: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!searchCenter) {
      if (placesForInitialFit.length > 0) {
        const bounds = L.latLngBounds(
          placesForInitialFit.map((p) => [p.lat, p.lng] as [number, number])
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
  }, [map, placesForInitialFit, displayPlaces, searchCenter]);
  return null;
}

function MapViewInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFilter = normalizeTagParam(searchParams.get("tag"));
  const focusId = searchParams.get("focus");

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
  const [radiusKm, setRadiusKm] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const [radiusInput, setRadiusInput] = useState(String(DEFAULT_SEARCH_RADIUS_KM));
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; seq: number } | null>(null);
  const flySeq = useRef(0);

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
          .select(
            "id, name, address, description, lat, lng, category, status, submitted_by, limited_hours, hours_note, extra_info, tags, photo_urls"
          )
          .eq("status", "approved");

        if (qErr) throw qErr;
        if (!cancelled) setAllPlaces((data as Place[]) ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("map.loadError");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tagFilteredPlaces = useMemo(() => {
    if (!tagFilter) return allPlaces;
    return allPlaces.filter((p) => placeHasTag(p, tagFilter));
  }, [allPlaces, tagFilter]);

  const nearbySorted = useMemo(() => {
    if (!searchCenter) return [];
    const r = clampRadiusKm(radiusKm);
    return tagFilteredPlaces
      .map((p) => ({
        place: p,
        distKm: haversineKm(searchCenter.lat, searchCenter.lng, p.lat, p.lng),
      }))
      .filter((x) => x.distKm <= r)
      .sort((a, b) => a.distKm - b.distKm);
  }, [tagFilteredPlaces, searchCenter, radiusKm]);

  const displayPlaces = useMemo(() => {
    let list = searchCenter ? nearbySorted.map((x) => x.place) : tagFilteredPlaces;
    if (focusId) {
      const fp = allPlaces.find((p) => p.id === focusId);
      if (fp && !list.some((p) => p.id === fp.id)) {
        list = [...list, fp];
      }
    }
    return list;
  }, [searchCenter, nearbySorted, tagFilteredPlaces, allPlaces, focusId]);

  const center: [number, number] = [42.5, 12.5];
  const zoom = allPlaces.length === 0 ? 5 : 6;

  function clearTagFilter() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tag");
    const q = p.toString();
    router.push(q ? `/?${q}` : "/");
  }

  async function runSearch() {
    const q = searchQuery.trim();
    setSearchError(null);
    if (q.length < 2) {
      setSearchError("map.searchMinChars");
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
        setSearchError(data.error ?? "map.searchFailed");
        return;
      }
      const first = data.results?.[0];
      if (!first) {
        setSearchError("map.searchNoResults");
        setSearchCenter(null);
        return;
      }
      setSearchCenter({ lat: first.lat, lng: first.lng, label: first.label });
    } catch (e) {
      console.error(e);
      setSearchError("map.searchNetworkError");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchCenter(null);
    setSearchError(null);
    setFlyTarget(null);
  }

  function onPickPlaceFromList(p: Place) {
    flySeq.current += 1;
    setFlyTarget({ lat: p.lat, lng: p.lng, seq: flySeq.current });
  }

  const effectiveRadius = searchCenter ? clampRadiusKm(radiusKm) : radiusKm;

  const showTagEmpty = !loading && tagFilter && displayPlaces.length === 0;

  return (
    <div className="relative min-h-0 flex-1 bg-stone-200 dark:bg-stone-800">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1000] flex flex-col gap-2 p-3 sm:left-3 sm:right-auto sm:max-w-xl">
        <div className="pointer-events-auto flex max-h-[min(85vh,32rem)] flex-col gap-3 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-md backdrop-blur dark:border-stone-600 dark:bg-stone-900/95">
          {tagFilter && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50/95 px-3 py-2 text-xs text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
              <span className="font-medium">{t("tags.filterActive", { tag: tagFilter })}</span>
              <button
                type="button"
                onClick={clearTagFilter}
                className="shrink-0 rounded border border-teal-300 bg-white px-2 py-1 text-[11px] font-medium text-teal-900 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900 dark:text-teal-100 dark:hover:bg-teal-800"
              >
                {t("tags.clear")}
              </button>
            </div>
          )}

          <label htmlFor="map-search" className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {t("map.searchLabel")}
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
              placeholder={t("map.searchPlaceholder")}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={searching}
                onClick={() => void runSearch()}
                className="whitespace-nowrap rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {searching ? "…" : t("map.search")}
              </button>
              {searchCenter && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="whitespace-nowrap rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                >
                  {t("map.showAll")}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-md border border-stone-100 bg-stone-50/90 px-3 py-2 dark:border-stone-700 dark:bg-stone-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="map-radius" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                {t("map.radiusLabel")}
              </label>
              <span className="text-xs tabular-nums text-stone-600 dark:text-stone-400">
                {RADIUS_MIN_KM}–{RADIUS_MAX_KM} km
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="map-radius"
                type="range"
                min={RADIUS_MIN_KM}
                max={RADIUS_MAX_KM}
                step={1}
                value={clampRadiusKm(radiusKm)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setRadiusKm(v);
                  setRadiusInput(String(v));
                }}
                className="min-w-[120px] flex-1 accent-teal-800 dark:accent-teal-600"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={RADIUS_MIN_KM}
                  max={RADIUS_MAX_KM}
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(e.target.value)}
                  onBlur={() => {
                    const v = clampRadiusKm(parseFloat(radiusInput.replace(",", ".")));
                    setRadiusKm(v);
                    setRadiusInput(String(v));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-16 rounded border border-stone-300 bg-white px-2 py-1 text-center text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                />
                <span className="text-xs text-stone-600 dark:text-stone-400">{t("map.km")}</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">{t("map.radiusHint")}</p>
          </div>

          {searchCenter && (
            <>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {t("map.pointFrom")}{" "}
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {effectiveRadius} {t("map.km")}
                </span>{" "}
                {t("map.from")}{" "}
                <span className="line-clamp-2 text-stone-800 dark:text-stone-200">{searchCenter.label}</span>
                {" · "}
                <span className="font-medium">{nearbySorted.length}</span> {t("map.poiInArea")}
              </p>

              <div className="min-h-0 flex flex-col gap-1">
                <p className="text-xs font-medium text-stone-700 dark:text-stone-300">{t("map.nearbyTitle")}</p>
                <ul
                  className="max-h-52 overflow-y-auto rounded-md border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950/80"
                  role="list"
                >
                  {nearbySorted.length === 0 ? (
                    <li className="px-3 py-4 text-center text-xs text-stone-500 dark:text-stone-400">
                      {t("map.noPoiInRadius")}
                    </li>
                  ) : (
                    nearbySorted.map(({ place: p, distKm }) => (
                      <li key={p.id} className="border-b border-stone-100 last:border-b-0 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={() => onPickPlaceFromList(p)}
                          className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-teal-50 dark:hover:bg-stone-800"
                        >
                          <span className="shrink-0 tabular-nums text-xs text-teal-800 dark:text-teal-400">
                            {distKm < 10 ? distKm.toFixed(1) : Math.round(distKm)} {t("map.km")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-stone-900 dark:text-stone-100">{p.name}</span>
                            <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                              {categoryDisplayName(p.category, locale)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
          {searchError && (
            <p className="text-xs text-red-700 dark:text-red-400">
              {searchError.startsWith("map.") ? t(searchError) : searchError}
            </p>
          )}
          {showTagEmpty && (
            <p className="text-xs text-amber-800 dark:text-amber-200">{t("tags.empty")}</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-stone-100/80 text-stone-600 dark:bg-stone-900/80 dark:text-stone-300">
          {t("map.loading")}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 text-center text-red-700 dark:text-red-400">
          {error && t(error)}
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
          placesForInitialFit={tagFilteredPlaces}
          displayPlaces={displayPlaces}
          searchCenter={searchCenter ? { lat: searchCenter.lat, lng: searchCenter.lng } : null}
        />
        <MapFlyTo target={flyTarget} />
        <MapUrlFocus places={allPlaces} />
        {searchCenter && (
          <>
            <Circle
              center={[searchCenter.lat, searchCenter.lng]}
              radius={effectiveRadius * 1000}
              pathOptions={{
                color: "#0d9488",
                weight: 1,
                fillColor: "#0d9488",
                fillOpacity: 0.08,
              }}
            />
            <Marker position={[searchCenter.lat, searchCenter.lng]} icon={getSearchCenterIcon()}>
              <Popup>
                <div
                  className="max-w-xs text-sm text-stone-900"
                  style={{ color: "#1c1917" }}
                >
                  <p className="m-0 font-semibold" style={{ color: "#0c0a09" }}>
                    {t("map.popupSearch")}
                  </p>
                  <p className="mt-1 text-stone-800" style={{ color: "#292524" }}>
                    {searchCenter.label}
                  </p>
                  <p className="mt-2 text-xs text-stone-600" style={{ color: "#57534e" }}>
                    {t("map.popupSearchHint", { radius: effectiveRadius })}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}
        {displayPlaces.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={getMarkerIconForCategory(p.category)}>
            <Popup minWidth={260}>
              <PlaceMapPopup place={p} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function MapView() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-0 flex-1 bg-stone-200 dark:bg-stone-800" aria-hidden />
      }
    >
      <MapViewInner />
    </Suspense>
  );
}
