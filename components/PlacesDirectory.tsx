"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Place } from "@/lib/types";
import { PLACE_CATEGORIES } from "@/lib/categories";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const PLACE_FIELDS =
  "id, name, address, description, lat, lng, category, submitted_by, limited_hours, hours_note, extra_info";

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

export function PlacesDirectory() {
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
        if (!cancelled) setError("Impossibile caricare l’elenco. Controlla la connessione e Supabase.");
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
      return matchesSearch(p, query);
    });
  }, [places, categoryFilter, query]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold text-stone-800 dark:text-stone-100">
        Tutti i luoghi
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Cerca per nome, indirizzo o contenuto delle descrizioni; filtra per categoria e apri il punto sulla{" "}
        <Link href="/" className="text-teal-800 underline dark:text-teal-400">
          mappa
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="dir-q" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Cerca
          </label>
          <input
            id="dir-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, indirizzo, descrizione…"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            autoComplete="off"
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="dir-cat" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Categoria
          </label>
          <select
            id="dir-cat"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="__all__">Tutte le categorie</option>
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        {loading ? "Caricamento…" : `${filtered.length} luog${filtered.length === 1 ? "o" : "hi"} mostrati su ${places.length}`}
      </p>

      {error && <p className="mt-4 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="mt-8 text-stone-600 dark:text-stone-400">Nessun risultato. Modifica ricerca o filtro.</p>
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
                  <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">{p.category}</span>
                  {p.address && (
                    <span className="mt-1 line-clamp-2 block text-sm text-stone-600 dark:text-stone-300">
                      {p.address}
                    </span>
                  )}
                </button>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href={`/?focus=${encodeURIComponent(p.id)}`}
                    className="inline-flex items-center justify-center rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 dark:bg-teal-700 dark:hover:bg-teal-600"
                  >
                    Apri sulla mappa
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : p.id)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                  >
                    {open ? "Chiudi dettagli" : "Dettagli"}
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
  const limited = p.limited_hours ?? false;
  const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;

  return (
    <div className="border-t border-stone-100 bg-stone-50/90 px-4 py-4 text-sm dark:border-stone-800 dark:bg-stone-950/50">
      <dl className="space-y-3 text-stone-800 dark:text-stone-200">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Indirizzo
          </dt>
          <dd className="mt-0.5">{p.address?.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Descrizione
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{p.description?.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Orario limitato
          </dt>
          <dd className="mt-0.5">{limited ? "Sì" : "No"}</dd>
        </div>
        {limited && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Orari
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{p.hours_note?.trim() || "—"}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Altre informazioni sul luogo
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{p.extra_info?.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Autore
          </dt>
          <dd className="mt-0.5">{p.submitted_by?.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Coordinate
          </dt>
          <dd className="mt-0.5 font-mono text-xs">
            {p.lat.toFixed(6)}, {p.lng.toFixed(6)}{" "}
            <a
              href={osm}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-teal-800 underline dark:text-teal-400"
            >
              OpenStreetMap
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
