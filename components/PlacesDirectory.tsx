"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Place } from "@/lib/types";
import { PLACE_CATEGORIES } from "@/lib/categories";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { categoryDisplayName } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import { normalizeTagParam, placeHasTag } from "@/lib/hashtags";
import { PlaceShareButtons } from "@/components/PlaceShareButtons";
import { PlaceTagLinks } from "@/components/PlaceTagLinks";

const PLACE_FIELDS =
  "id, name, address, description, lat, lng, category, submitted_by, limited_hours, hours_note, extra_info, tags, photo_urls";

function matchesSearch(p: Place, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    p.name,
    p.address ?? "",
    p.description ?? "",
    p.extra_info ?? "",
    p.hours_note ?? "",
    p.category,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function PlacesDirectoryInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFilter = normalizeTagParam(searchParams.get("tag"));

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error: qErr } = await supabase
          .from("places")
          .select(PLACE_FIELDS)
          .eq("status", "approved")
          .order("name", { ascending: true });

        if (qErr) throw qErr;
        if (!cancelled) setPlaces((data as Place[]) ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("placesPage.loadError");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return places.filter((p) => {
      if (categoryFilter !== "__all__" && p.category !== categoryFilter) return false;
      if (!matchesSearch(p, query)) return false;
      if (!placeHasTag(p, tagFilter)) return false;
      return true;
    });
  }, [places, categoryFilter, query, tagFilter]);

  function clearTagFilter() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tag");
    const q = p.toString();
    router.push(q ? `/luoghi?${q}` : "/luoghi");
  }

  const emptyMessage = useMemo(() => {
    if (loading || error) return null;
    if (filtered.length > 0) return null;
    if (tagFilter && !query.trim() && categoryFilter === "__all__") return t("tags.empty");
    return t("placesPage.noResults");
  }, [loading, error, filtered.length, tagFilter, query, categoryFilter, t]);

  const mapFocusHref = (placeId: string) => {
    const params = new URLSearchParams();
    params.set("focus", placeId);
    if (tagFilter) params.set("tag", tagFilter);
    return `/?${params.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold text-stone-800 dark:text-stone-100">
        {t("placesPage.title")}
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        {t("placesPage.intro")}{" "}
        <Link href="/" className="text-teal-800 underline dark:text-teal-400">
          {t("placesPage.mapLink")}
        </Link>
        .
      </p>

      {tagFilter && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50/95 px-3 py-2 text-sm text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
          <span className="font-medium">{t("tags.filterActive", { tag: tagFilter })}</span>
          <button
            type="button"
            onClick={clearTagFilter}
            className="shrink-0 rounded border border-teal-300 bg-white px-2 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900 dark:text-teal-100 dark:hover:bg-teal-800"
          >
            {t("tags.clear")}
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="dir-q" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("placesPage.searchLabel")}
          </label>
          <input
            id="dir-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placesPage.searchPlaceholder")}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            autoComplete="off"
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="dir-cat" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("placesPage.categoryFilter")}
          </label>
          <select
            id="dir-cat"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="__all__">{t("placesPage.allCategories")}</option>
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryDisplayName(c, locale)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        {loading
          ? t("placesPage.countLoading")
          : filtered.length === 1
            ? t("placesPage.countShownOne", { total: places.length })
            : t("placesPage.countShown", { filtered: filtered.length, total: places.length })}
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-700 dark:text-red-400">{error.startsWith("placesPage.") ? t(error) : error}</p>
      )}

      {!loading && !error && emptyMessage && (
        <p className="mt-8 text-stone-600 dark:text-stone-400">{emptyMessage}</p>
      )}

      <ul className="mt-6 space-y-3">
        {filtered.map((p) => {
          const open = expandedId === p.id;
          return (
            <li
              key={p.id}
              className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : p.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{p.name}</span>
                  <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
                    {categoryDisplayName(p.category, locale)}
                  </span>
                  {p.address && (
                    <span className="mt-1 line-clamp-2 block text-sm text-stone-600 dark:text-stone-300">
                      {p.address}
                    </span>
                  )}
                </button>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href={mapFocusHref(p.id)}
                    className="inline-flex items-center justify-center rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 dark:bg-teal-700 dark:hover:bg-teal-600"
                  >
                    {t("placesPage.openMap")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : p.id)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                  >
                    {open ? t("placesPage.closeDetails") : t("placesPage.details")}
                  </button>
                </div>
              </div>
              {open && <PlaceDirectoryDetails place={p} />}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function PlaceDirectoryDetails({ place: p }: { place: Place }) {
  const { t } = useI18n();
  const limited = p.limited_hours ?? false;
  const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;
  const dash = t("popup.dash");

  const tags = p.tags ?? [];
  const photos = p.photo_urls ?? [];

  return (
    <div className="border-t border-stone-100 bg-stone-50/90 px-4 py-4 text-sm dark:border-stone-800 dark:bg-stone-950/50">
      <PlaceShareButtons placeId={p.id} />
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-stone-200 dark:border-stone-600"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-24 object-cover sm:h-28 sm:w-28" width={112} height={112} />
            </a>
          ))}
        </div>
      )}
      <dl className="mt-4 space-y-3 text-stone-800 dark:text-stone-200">
        {tags.length > 0 && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {t("tags.fieldLabel")}
            </dt>
            <dd className="mt-1">
              <PlaceTagLinks tags={tags} basePath="/luoghi" />
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("popup.address")}
          </dt>
          <dd className="mt-0.5">{p.address?.trim() || dash}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("popup.description")}
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{p.description?.trim() || dash}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("popup.limitedHours")}
          </dt>
          <dd className="mt-0.5">{limited ? t("popup.yes") : t("popup.no")}</dd>
        </div>
        {limited && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {t("popup.hours")}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{p.hours_note?.trim() || dash}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("popup.extraInfo")}
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{p.extra_info?.trim() || dash}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("popup.author")}
          </dt>
          <dd className="mt-0.5">{p.submitted_by?.trim() || dash}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("placesPage.coordinates")}
          </dt>
          <dd className="mt-0.5 font-mono text-xs">
            {p.lat.toFixed(6)}, {p.lng.toFixed(6)}{" "}
            <a
              href={osm}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-teal-800 underline dark:text-teal-400"
            >
              {t("placesPage.osm")}
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function PlacesDirectory() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8" aria-hidden />}>
      <PlacesDirectoryInner />
    </Suspense>
  );
}
