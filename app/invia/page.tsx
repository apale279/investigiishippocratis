"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AddressAutocomplete, type GeocodeSuggestion } from "@/components/AddressAutocomplete";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PLACE_CATEGORIES } from "@/lib/categories";

export default function InviaPage() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [addressHint, setAddressHint] = useState<string | null>(null);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setAddressHint(null);
    const latN = parseFloat(lat.replace(",", "."));
    const lngN = parseFloat(lng.replace(",", "."));
    if (!name.trim()) {
      setMessage("Il nome è obbligatorio.");
      return;
    }
    if (!address.trim()) {
      setMessage("Inserisci un indirizzo e scegli un risultato dall’elenco per impostare le coordinate.");
      return;
    }
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setAddressHint("Seleziona un indirizzo dai suggerimenti: le coordinate si compilano da sole.");
      setMessage("Coordinate mancanti: scegli un indirizzo dall’elenco.");
      return;
    }
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      setMessage("Coordinate fuori dai limiti consentiti.");
      return;
    }

    setStatus("sending");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("places").insert({
        name: name.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        lat: latN,
        lng: lngN,
        category,
        status: "pending",
        submitted_by: submittedBy.trim() || null,
      });
      if (error) throw error;
      setStatus("ok");
      setMessage("Proposta inviata. Un moderatore la esaminerà prima che compaia in mappa.");
      setName("");
      setAddress("");
      setLat("");
      setLng("");
      setDescription("");
      setSubmittedBy("");
    } catch (err) {
      console.error(err);
      setStatus("idle");
      setMessage(
        "Invio non riuscito. Controlla .env.local, lo schema SQL su Supabase e riprova."
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="font-serif text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Proponi un luogo
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          I dati vengono salvati come &quot;in attesa&quot;. Dopo l&apos;approvazione il punto
          apparirà sulla{" "}
          <Link href="/" className="text-teal-700 underline dark:text-teal-400">
            mappa pubblica
          </Link>
          .
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Nome del luogo *
            </label>
            <input
              id="name"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <AddressAutocomplete
            id="address"
            label="Indirizzo *"
            value={address}
            onChange={onAddressChange}
            onPick={onPickAddress}
            hint={addressHint}
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Digita e scegli una voce dall’elenco: le coordinate vengono acquisite automaticamente da
            OpenStreetMap (Nominatim).
          </p>

          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/80">
            <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Coordinate (automatiche)</p>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-stone-800 dark:text-stone-200">
              <div>
                Latitudine: <span className="font-mono">{lat || "—"}</span>
              </div>
              <div>
                Longitudine: <span className="font-mono">{lng || "—"}</span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Descrizione
            </label>
            <textarea
              id="description"
              rows={4}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Categoria
            </label>
            <select
              id="category"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PLACE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="submittedBy"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Il tuo nome o email (facoltativo)
            </label>
            <input
              id="submittedBy"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
            />
          </div>

          {message && (
            <p
              className={
                status === "ok"
                  ? "text-sm text-green-800 dark:text-green-400"
                  : "text-sm text-red-700 dark:text-red-400"
              }
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            {status === "sending" ? "Invio in corso…" : "Invia proposta"}
          </button>
        </form>
      </main>
    </div>
  );
}
