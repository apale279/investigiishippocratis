"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AddressAutocomplete, type GeocodeSuggestion } from "@/components/AddressAutocomplete";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PLACE_CATEGORIES } from "@/lib/categories";
import { categoryDisplayName } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import { PlacePhotoPicker } from "@/components/PlacePhotoPicker";
import { uploadImagesToCloudinary } from "@/lib/cloudinaryUpload";
import { parseTagsInput } from "@/lib/tags";

const ProposalMapPicker = dynamic(
  () => import("@/components/ProposalMapPicker").then((m) => m.ProposalMapPicker),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-md bg-stone-200 dark:bg-stone-800" /> }
);

export default function InviaPage() {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  /** Se true, digitare nell’indirizzo non azzera le coordinate (mappa / coordinate manuali). */
  const [coordLock, setCoordLock] = useState(false);
  const [description, setDescription] = useState("");
  const [limitedHours, setLimitedHours] = useState(false);
  const [hoursNote, setHoursNote] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "ok">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [addressHint, setAddressHint] = useState<string | null>(null);

  const [reverseBusy, setReverseBusy] = useState(false);

  const latNum = parseFloat(lat.replace(",", "."));
  const lngNum = parseFloat(lng.replace(",", "."));
  const coordsValid =
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180;

  function onPickAddress(s: GeocodeSuggestion) {
    setAddressHint(null);
    setCoordLock(false);
    setLat(String(s.lat));
    setLng(String(s.lng));
  }

  function onAddressChange(value: string, source: "input" | "pick") {
    setAddress(value);
    if (source === "pick") {
      setCoordLock(false);
      return;
    }
    if (!coordLock) {
      setLat("");
      setLng("");
    }
  }

  function applyCoords(latitude: number, longitude: number, opts?: { reverseIfNoAddress?: boolean }) {
    setLat(String(latitude));
    setLng(String(longitude));
    setCoordLock(true);
    if (opts?.reverseIfNoAddress && !address.trim()) {
      void reverseLookupAddress(latitude, longitude);
    }
  }

  const reverseLookupAddress = useCallback(async (latitude: number, longitude: number) => {
    setReverseBusy(true);
    setAddressHint(null);
    try {
      const res = await fetch(
        `/api/geocode?reverse=1&lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`
      );
      const data = (await res.json()) as { results?: { label: string }[] };
      const label = data.results?.[0]?.label;
      if (label) {
        setAddress(label);
        setCoordLock(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReverseBusy(false);
    }
  }, []);

  function onMapPosition(latitude: number, longitude: number) {
    applyCoords(latitude, longitude, { reverseIfNoAddress: true });
  }

  function addPendingPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const room = 3 - pendingPhotos.length;
    if (room <= 0) return;
    const next = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    setPendingPhotos((p) => [...p, ...next].slice(0, 3));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setAddressHint(null);
    const latN = parseFloat(lat.replace(",", "."));
    const lngN = parseFloat(lng.replace(",", "."));
    if (!name.trim()) {
      setMessage(t("invia.errName"));
      return;
    }
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setAddressHint(t("invia.errCoordsHint"));
      setMessage(t("invia.errCoords"));
      return;
    }
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      setMessage(t("invia.errBounds"));
      return;
    }

    setStatus("sending");
    try {
      let photo_urls: string[] = [];
      if (pendingPhotos.length > 0) {
        photo_urls = await uploadImagesToCloudinary(pendingPhotos);
      }

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
        limited_hours: limitedHours,
        hours_note: limitedHours ? hoursNote.trim() || null : null,
        extra_info: extraInfo.trim() || null,
        tags: parseTagsInput(tagsRaw),
        photo_urls,
      });
      if (error) throw error;
      setStatus("ok");
      setMessage(t("invia.success"));
      setName("");
      setAddress("");
      setLat("");
      setLng("");
      setCoordLock(false);
      setDescription("");
      setLimitedHours(false);
      setHoursNote("");
      setExtraInfo("");
      setSubmittedBy("");
      setTagsRaw("");
      setPendingPhotos([]);
    } catch (err) {
      console.error(err);
      setStatus("idle");
      setMessage(t("invia.submitFail"));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="font-serif text-2xl font-semibold text-stone-800 dark:text-stone-100">
          {t("invia.title")}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {t("invia.introBefore")}{" "}
          <Link href="/" className="text-teal-700 underline dark:text-teal-400">
            {t("invia.publicMap")}
          </Link>
          .
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("invia.name")}
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
            label={t("invia.address")}
            value={address}
            onChange={onAddressChange}
            onPick={onPickAddress}
            hint={addressHint}
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">{t("invia.addressHelp")}</p>

          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{t("invia.mapSectionTitle")}</h2>
            <div className="mt-2">
              <ProposalMapPicker
                lat={coordsValid ? latNum : null}
                lng={coordsValid ? lngNum : null}
                onPositionChange={onMapPosition}
                hint={t("invia.mapHint")}
              />
            </div>
          </div>

          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-700 dark:bg-stone-900/80">
            <p className="text-xs font-medium text-stone-600 dark:text-stone-400">{t("invia.coordsManual")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="lat-input" className="block text-xs text-stone-500 dark:text-stone-400">
                  {t("invia.lat")}
                </label>
                <input
                  id="lat-input"
                  inputMode="decimal"
                  className="mt-0.5 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 font-mono text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    setCoordLock(true);
                  }}
                  placeholder="43.77"
                />
              </div>
              <div>
                <label htmlFor="lng-input" className="block text-xs text-stone-500 dark:text-stone-400">
                  {t("invia.lng")}
                </label>
                <input
                  id="lng-input"
                  inputMode="decimal"
                  className="mt-0.5 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 font-mono text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                  value={lng}
                  onChange={(e) => {
                    setLng(e.target.value);
                    setCoordLock(true);
                  }}
                  placeholder="11.25"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!coordsValid || reverseBusy}
              onClick={() => coordsValid && void reverseLookupAddress(latNum, lngNum)}
              className="mt-3 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              {reverseBusy ? t("invia.coordsReverseLoading") : t("invia.coordsReverse")}
            </button>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              {t("invia.description")}
            </label>
            <textarea
              id="description"
              rows={4}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50/80 px-3 py-3 dark:border-stone-700 dark:bg-stone-900/50">
            <input
              id="limitedHours"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-400 text-teal-800 focus:ring-teal-700 dark:border-stone-500"
              checked={limitedHours}
              onChange={(e) => {
                setLimitedHours(e.target.checked);
                if (!e.target.checked) setHoursNote("");
              }}
            />
            <div className="min-w-0 flex-1">
              <label htmlFor="limitedHours" className="text-sm font-medium text-stone-800 dark:text-stone-200">
                {t("invia.limitedHours")}
              </label>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t("invia.limitedHoursHelp")}</p>
              {limitedHours && (
                <div className="mt-3">
                  <label htmlFor="hoursNote" className="block text-xs font-medium text-stone-600 dark:text-stone-400">
                    {t("invia.hoursFree")}
                  </label>
                  <textarea
                    id="hoursNote"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                    value={hoursNote}
                    onChange={(e) => setHoursNote(e.target.value)}
                    placeholder={t("invia.hoursPlaceholder")}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="extraInfo"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              {t("invia.extraInfo")}
            </label>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t("invia.extraInfoHint")}</p>
            <textarea
              id="extraInfo"
              rows={3}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder={t("invia.extraInfoHint")}
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              {t("invia.category")}
            </label>
            <select
              id="category"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PLACE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryDisplayName(c, locale)}
                </option>
              ))}
            </select>
          </div>

          <PlacePhotoPicker
            existingUrls={[]}
            onRemoveExisting={() => {}}
            pendingFiles={pendingPhotos}
            onAddPending={addPendingPhotos}
            onRemovePending={(i) => setPendingPhotos((p) => p.filter((_, j) => j !== i))}
            disabled={status === "sending"}
            label={t("photos.label")}
            hint={t("photos.hint")}
            pickLabel={t("photos.pick")}
            maxReached={t("photos.max")}
          />

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("tags.fieldLabel")}
            </label>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t("tags.fieldHelp")}</p>
            <input
              id="tags"
              type="text"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="medicina, storia"
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="submittedBy"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              {t("invia.submittedBy")}
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
            {status === "sending"
              ? pendingPhotos.length > 0
                ? t("photos.uploading")
                : t("invia.submitting")
              : t("invia.submit")}
          </button>
        </form>
      </main>
    </div>
  );
}
