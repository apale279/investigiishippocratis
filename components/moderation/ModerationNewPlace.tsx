"use client";

import { useState } from "react";
import { AddressAutocomplete, type GeocodeSuggestion } from "@/components/AddressAutocomplete";
import { PLACE_CATEGORIES } from "@/lib/categories";
import { categoryDisplayName } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import { PlacePhotoPicker } from "@/components/PlacePhotoPicker";
import { uploadImagesToCloudinary } from "@/lib/cloudinaryUpload";
import { parseTagsInput } from "@/lib/tags";

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
  const { t, locale } = useI18n();
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
  const [tagsRaw, setTagsRaw] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);

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

  function addPendingPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const room = 3 - pendingPhotos.length;
    if (room <= 0) return;
    const next = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    setPendingPhotos((p) => [...p, ...next].slice(0, 3));
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
    setMessageOk(false);
    setAddressHint(null);
    if (!name.trim()) {
      setMessage(t("invia.errName"));
      return;
    }
    const coords = parseCoords();
    if (!coords) {
      setAddressHint(t("moderation.newAddressHintPick"));
      setMessage(t("moderation.newErrCoordsInvalid"));
      return;
    }

    setBusy(true);
    try {
      let photo_urls: string[] = [];
      if (pendingPhotos.length > 0) {
        photo_urls = await uploadImagesToCloudinary(pendingPhotos);
      }

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
          tags: parseTagsInput(tagsRaw),
          photo_urls,
          initialStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? t("moderation.createFail"));
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
      setTagsRaw("");
      setPendingPhotos([]);
      setMessageOk(true);
      setMessage(
        initialStatus === "draft" ? t("moderation.draftSaved") : t("moderation.publishedOk")
      );
      await onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{t("moderation.newTitle")}</h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("moderation.newIntro")}</p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="mod-new-name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("moderation.nameReq")}
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
          label={t("moderation.addressSuggest")}
          value={address}
          onChange={onAddressChange}
          onPick={onPickAddress}
          hint={addressHint}
        />

        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/80">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400">{t("moderation.coordsAuto")}</p>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-stone-800 dark:text-stone-200">
            <span className="font-mono">
              {t("invia.lat")} {lat || t("popup.dash")}
            </span>
            <span className="font-mono">
              {t("invia.lng")} {lng || t("popup.dash")}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="mod-new-desc" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("moderation.description")}
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
              {t("moderation.limitedHours")}
            </label>
            {limitedHours && (
              <textarea
                rows={3}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                value={hoursNote}
                onChange={(e) => setHoursNote(e.target.value)}
                disabled={busy}
                placeholder={t("moderation.hoursPlaceholder")}
              />
            )}
          </div>
        </div>

        <PlacePhotoPicker
          existingUrls={[]}
          onRemoveExisting={() => {}}
          pendingFiles={pendingPhotos}
          onAddPending={addPendingPhotos}
          onRemovePending={(i) => setPendingPhotos((p) => p.filter((_, j) => j !== i))}
          disabled={busy}
          label={t("photos.label")}
          hint={t("photos.hint")}
          pickLabel={t("photos.pick")}
          maxReached={t("photos.max")}
        />

        <div>
          <label htmlFor="mod-new-extra" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("moderation.extraInfo")}
          </label>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t("moderation.extraInfoHint")}</p>
          <textarea
            id="mod-new-extra"
            rows={3}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            disabled={busy}
            placeholder={t("moderation.extraInfoHint")}
          />
        </div>

        <div>
          <label htmlFor="mod-new-cat" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("moderation.category")}
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
                {categoryDisplayName(c, locale)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mod-new-tags" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("tags.fieldLabel")}
          </label>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t("tags.fieldHelp")}</p>
          <input
            id="mod-new-tags"
            type="text"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="mod-new-by" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("moderation.credits")}
          </label>
          <input
            id="mod-new-by"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            disabled={busy}
            placeholder={t("moderation.creditsPh")}
          />
        </div>

        {message && (
          <p
            className={
              messageOk
                ? "text-sm text-green-800 dark:text-green-400"
                : "text-sm text-red-700 dark:text-red-400"
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
            {t("moderation.saveDraft")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void create("approved")}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            {t("moderation.publishNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
