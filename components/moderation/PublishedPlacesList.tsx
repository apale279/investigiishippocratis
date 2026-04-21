"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place } from "@/lib/types";
import { PlaceEditorCard } from "@/components/moderation/PlaceEditorCard";
import { categoryDisplayName } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";

function matchesQuery(p: Place, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    p.name,
    p.address ?? "",
    p.description ?? "",
    p.category,
    p.submitted_by ?? "",
    p.hours_note ?? "",
    p.extra_info ?? "",
    p.limited_hours ? "orario limitato sì" : "no",
    p.id,
    p.lat.toFixed(5),
    p.lng.toFixed(5),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function PublishedPlacesList({
  places,
  password,
  onRefresh,
  busyId,
  setBusyId,
  loading,
}: {
  places: Place[];
  password: string;
  onRefresh: () => Promise<void>;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  loading: boolean;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => places.filter((p) => matchesQuery(p, query)), [places, query]);

  useEffect(() => {
    if (expandedId && !filtered.some((p) => p.id === expandedId)) {
      setExpandedId(null);
    }
  }, [filtered, expandedId]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pub-search" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          {t("moderation.publishedList.searchLabel")}
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="pub-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("moderation.publishedList.searchPlaceholder")}
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            autoComplete="off"
          />
          {query.trim() !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              {t("moderation.publishedList.clear")}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          {loading
            ? t("moderation.loadingShort")
            : t("moderation.publishedList.count", { n: filtered.length, total: places.length })}
          {query.trim() !== "" && places.length > 0 && ` · ${t("moderation.publishedList.filterOn")}`}
        </p>
      </div>

      {!loading && places.length === 0 && (
        <p className="text-stone-600 dark:text-stone-400">{t("moderation.emptyPublished")}</p>
      )}

      {!loading && places.length > 0 && filtered.length === 0 && (
        <p className="text-stone-600 dark:text-stone-400">
          {t("moderation.publishedList.noneInFilter", { q: query.trim() })}
        </p>
      )}

      {filtered.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900/80">
          {filtered.map((p) => {
            const open = expandedId === p.id;
            return (
              <li key={p.id} className="border-b border-stone-100 last:border-b-0 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : p.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/80"
                >
                  <span className="mt-0.5 shrink-0 text-stone-400" aria-hidden>
                    {open ? "▼" : "▶"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-stone-900 dark:text-stone-100">{p.name}</span>
                    <span className="mt-0.5 block text-sm text-stone-500 dark:text-stone-400">
                      {categoryDisplayName(p.category, locale)}
                      {p.address ? ` · ${p.address}` : ""}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-stone-400 dark:text-stone-500">
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-teal-800 dark:text-teal-400">
                    {open ? t("moderation.publishedList.chiudi") : t("moderation.publishedList.modifica")}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-stone-100 bg-stone-50/80 px-2 py-4 dark:border-stone-800 dark:bg-stone-950/50">
                    <PlaceEditorCard
                      place={p}
                      variant="published"
                      password={password}
                      onRefresh={onRefresh}
                      busyId={busyId}
                      setBusyId={setBusyId}
                      asListItem={false}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
