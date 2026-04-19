"use client";

import { useState } from "react";
import { AddressAutocomplete, type GeocodeSuggestion } from "@/components/AddressAutocomplete";
import { PLACE_CATEGORIES } from "@/lib/categories";

export function ModerationNewPlace({
  password,
  onCreated,
  busy,
  setBusy,
}: {
  password: string;
  onCreated: () => Promise<void>;
  busy: boolean;
  setBusy: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [limitedHours, setLimitedHours] = useState(false);
  const [hoursNote, setHoursNote] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onPickAddress(s: GeocodeSuggestion) {
    setAddressHint(null);
    setLat(String(s.lat));
    setLng(String(s.lng));
  }

  function onAddressChange(value: string, source: "input" | "pick") {
    setAddress(value);
    if (source === "input") {
      setLat("");
      setLng("");
    }
  }

  function parseCoords(): { lat: number; lng: number } | null {
    const la = parseFloat(lat.replace(",", "."));
    const ln = parseFloat(lng.replace(",", "."));
    if (Number.isNaN(la) || Number.isNaN(ln)) return null;
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
    return { lat: la, lng: ln };
  }

  async function create(initialStatus: "draft" | "approved") {
    setMessage(null);
    setAddressHint(null);
    if (!name.trim()) {
      setMessage("Il nome è obbligatorio.");
      return;
    }
    const coords = parseCoords();
    if (!coords) {
      setAddressHint("Seleziona un indirizzo dai suggerimenti o inserisci coordinate valide.");
      setMessage("Coordinate mancanti o non valide.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          action: "create",
          name: name.trim(),
          address: address.trim() || null,
          description: description.trim() || null,
          lat: coords.lat,
          lng: coords.lng,
          category,
          submitted_by: submittedBy.trim() || null,
          limited_hours: limitedHours,
          hours_note: limitedHours ? hoursNote.trim() || null : null,
          extra_info: extraInfo.trim() || null,
          initialStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Creazione non riuscita.");
        return;
      }
      setName("");
      setAddress("");
      setLat("");
      setLng("");
      setDescription("");
      setLimitedHours(false);
      setHoursNote("");
      setExtraInfo("");
      setSubmittedBy("");
      setMessage(
        initialStatus === "draft"
          ? "Bozza salvata. La trovi nella scheda Bozze."
          : "POI pubblicato sulla mappa."
      );
      await onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
        Nuovo POI (moderatore)
      </h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        Non passa dall’approvazione utente: puoi salvare in bozza o pubblicare subito.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="mod-new-name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Nome *
          </label>
          <input
            id="mod-new-name"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </div>

        <AddressAutocomplete
          id="mod-new-address"
          label="Indirizzo (suggerimenti mentre digiti)"
          value={address}
          onChange={onAddressChange}
          onPick={onPickAddress}
          hint={addressHint}
        />

        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/80">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Coordinate (automatiche)</p>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-stone-800 dark:text-stone-200">
            <span className="font-mono">Lat: {lat || "—"}</span>
            <span className="font-mono">Lng: {lng || "—"}</span>
          </div>
        </div>

        <div>
          <label htmlFor="mod-new-desc" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Descrizione
          </label>
          <textarea
            id="mod-new-desc"
            rows={3}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50/80 px-3 py-3 dark:border-stone-700 dark:bg-stone-900/50">
          <input
            id="mod-new-lh"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-stone-400 text-teal-800 dark:border-stone-500"
            checked={limitedHours}
            onChange={(e) => {
              setLimitedHours(e.target.checked);
              if (!e.target.checked) setHoursNote("");
            }}
            disabled={busy}
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="mod-new-lh" className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Orario limitato
            </label>
            {limitedHours && (
              <textarea
                rows={3}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                value={hoursNote}
                onChange={(e) => setHoursNote(e.target.value)}
                disabled={busy}
                placeholder="Orari (testo libero)"
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="mod-new-extra" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Altre informazioni sul luogo
          </label>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            Ad esempio costo biglietto, come raggiungerlo una volta in loco…
          </p>
          <textarea
            id="mod-new-extra"
            rows={3}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            disabled={busy}
            placeholder="Ad esempio costo biglietto, come raggiungerlo una volta in loco…"
          />
        </div>

        <div>
          <label htmlFor="mod-new-cat" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Categoria
          </label>
          <select
            id="mod-new-cat"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
          >
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mod-new-by" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Crediti / riferimento (facoltativo)
          </label>
          <input
            id="mod-new-by"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            disabled={busy}
            placeholder="es. curatore, fonte…"
          />
        </div>

        {message && (
          <p
            className={
              message.includes("non") || message.includes("mancanti")
                ? "text-sm text-red-700 dark:text-red-400"
                : "text-sm text-green-800 dark:text-green-400"
            }
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void create("draft")}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
          >
            Salva bozza
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void create("approved")}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            Pubblica subito
          </button>
        </div>
      </div>
    </div>
  );
}
