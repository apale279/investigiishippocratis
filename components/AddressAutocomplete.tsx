"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GeocodeSuggestion = {
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  id: string;
  label: string;
  value: string;
  /** `pick` = scelta da elenco; `input` = digitazione (per azzerare coordinate lato form). */
  onChange: (value: string, source: "input" | "pick") => void;
  onPick: (s: GeocodeSuggestion) => void;
  /** Messaggio sotto il campo (es. errore) */
  hint?: string | null;
};

export function AddressAutocomplete({ id, label, value, onChange, onPick, hint }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GeocodeSuggestion[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [close]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=6`);
          const data = (await res.json()) as { results?: GeocodeSuggestion[] };
          setItems(data.results ?? []);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        value={value}
        onChange={(e) => {
          onChange(e.target.value, "input");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Inizia a digitare: via, città, paese…"
      />
      {loading && (
        <p className="mt-1 text-xs text-stone-500">Ricerca indirizzi…</p>
      )}
      {hint && !loading && (
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">{hint}</p>
      )}
      {open && items.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg dark:border-stone-600 dark:bg-stone-900"
          role="listbox"
        >
          {items.map((s, i) => (
            <li key={`${s.lat}-${s.lng}-${i}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(s);
                  onChange(s.label, "pick");
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
