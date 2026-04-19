"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place } from "@/lib/types";
import { PLACE_CATEGORIES } from "@/lib/categories";

function formatDateIt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function OsmLink({ lat, lng }: { lat: number; lng: number }) {
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-800 underline dark:text-teal-400"
    >
      Apri su OpenStreetMap
    </a>
  );
}

type Draft = {
  name: string;
  address: string;
  description: string;
  lat: string;
  lng: string;
  category: string;
  submitted_by: string;
};

function placeToDraft(p: Place): Draft {
  return {
    name: p.name,
    address: p.address ?? "",
    description: p.description ?? "",
    lat: String(p.lat),
    lng: String(p.lng),
    category: p.category,
    submitted_by: p.submitted_by ?? "",
  };
}

export type EditorVariant = "pending" | "draft" | "published";

export function PlaceEditorCard({
  place,
  variant,
  password,
  onRefresh,
  busyId,
  setBusyId,
}: {
  place: Place;
  variant: EditorVariant;
  password: string;
  onRefresh: () => Promise<void>;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => placeToDraft(place));

  useEffect(() => {
    setDraft(placeToDraft(place));
  }, [place]);

  const busy = busyId === place.id;

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function parseCoords(): { lat: number; lng: number } | null {
    const lat = parseFloat(draft.lat.replace(",", "."));
    const lng = parseFloat(draft.lng.replace(",", "."));
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  async function postUpdate(): Promise<boolean> {
    if (!draft.name.trim()) {
      window.alert("Il nome è obbligatorio.");
      return false;
    }
    const coords = parseCoords();
    if (!coords) {
      window.alert("Latitudine e longitudine non valide.");
      return false;
    }

    const res = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        action: "update",
        id: place.id,
        name: draft.name.trim(),
        address: draft.address.trim() || null,
        description: draft.description.trim() || null,
        lat: coords.lat,
        lng: coords.lng,
        category: draft.category,
        submitted_by: draft.submitted_by.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "Salvataggio non riuscito.");
      return false;
    }
    return true;
  }

  async function saveOnly() {
    setBusyId(place.id);
    try {
      const ok = await postUpdate();
      if (ok) await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function approvePending() {
    setBusyId(place.id);
    try {
      const ok = await postUpdate();
      if (!ok) return;
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "approve", id: place.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "Approvazione non riuscita.");
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function rejectPending() {
    if (!window.confirm("Rifiutare e cancellare definitivamente questa proposta?")) return;
    setBusyId(place.id);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "reject", id: place.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "Operazione non riuscita.");
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function publishDraft() {
    setBusyId(place.id);
    try {
      const ok = await postUpdate();
      if (!ok) return;
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "publish", id: place.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "Pubblicazione non riuscita.");
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function unpublish() {
    if (!window.confirm("Mettere in bozza? Il POI sparirà dalla mappa pubblica.")) return;
    setBusyId(place.id);
    try {
      const ok = await postUpdate();
      if (!ok) return;
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "unpublish", id: place.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "Operazione non riuscita.");
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deletePlace(confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return;
    setBusyId(place.id);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "delete", id: place.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "Eliminazione non riuscita.");
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  const coords = parseCoords();

  const categoryOptions = useMemo(() => {
    if ((PLACE_CATEGORIES as readonly string[]).includes(draft.category)) {
      return [...PLACE_CATEGORIES];
    }
    return [draft.category, ...PLACE_CATEGORIES];
  }, [draft.category]);

  const variantTitle =
    variant === "pending"
      ? "Proposta utente"
      : variant === "draft"
        ? "Bozza"
        : "Pubblicato";

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <p className="text-xs text-stone-500 dark:text-stone-400">
        <span className="font-medium text-stone-600 dark:text-stone-300">{variantTitle}</span>
        {" · "}
        ID: <span className="font-mono text-stone-700 dark:text-stone-300">{place.id}</span>
        {" · "}
        {formatDateIt(place.created_at)}
        {" · "}
        Stato: {place.status}
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Nome *
          </label>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Indirizzo
          </label>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.address}
            onChange={(e) => setField("address", e.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Descrizione
          </label>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.description}
            onChange={(e) => setField("description", e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
              Latitudine *
            </label>
            <input
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
              value={draft.lat}
              onChange={(e) => setField("lat", e.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
              Longitudine *
            </label>
            <input
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
              value={draft.lng}
              onChange={(e) => setField("lng", e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        {coords && (
          <p className="text-xs text-stone-600 dark:text-stone-400">
            <OsmLink lat={coords.lat} lng={coords.lng} />
          </p>
        )}
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Categoria
          </label>
          <select
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.category}
            onChange={(e) => setField("category", e.target.value)}
            disabled={busy}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Proposto da
          </label>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.submitted_by}
            onChange={(e) => setField("submitted_by", e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveOnly()}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
        >
          Salva modifiche
        </button>

        {variant === "pending" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void approvePending()}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
            >
              Approva
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void rejectPending()}
              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
            >
              Rifiuta
            </button>
          </>
        )}

        {variant === "draft" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void publishDraft()}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
            >
              Pubblica
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void deletePlace("Eliminare definitivamente questa bozza?")
              }
              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
            >
              Elimina
            </button>
          </>
        )}

        {variant === "published" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void unpublish()}
              className="rounded-md border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              Metti in bozza
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void deletePlace(
                  "Eliminare definitivamente questo POI dalla mappa? L’azione non è reversibile."
                )
              }
              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
            >
              Elimina dalla mappa
            </button>
          </>
        )}
      </div>
    </li>
  );
}
