"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place } from "@/lib/types";
import { PLACE_CATEGORIES } from "@/lib/categories";
import { categoryDisplayName, type Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import { PlacePhotoPicker } from "@/components/PlacePhotoPicker";
import { uploadImagesToCloudinary } from "@/lib/cloudinaryUpload";
import { parseTagsInput } from "@/lib/tags";

function formatDate(iso: string | undefined, locale: Locale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function OsmLink({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-800 underline dark:text-teal-400"
    >
      {label}
    </a>
  );
}

type Draft = {
  name: string;
  address: string;
  description: string;
  limited_hours: boolean;
  hours_note: string;
  extra_info: string;
  tags: string;
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
    limited_hours: p.limited_hours ?? false,
    hours_note: p.hours_note ?? "",
    extra_info: p.extra_info ?? "",
    tags: (p.tags ?? []).join(", "),
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
  /** Se false, il contenitore è un `div` (es. dentro un elenco personalizzato). Default: `li`. */
  asListItem = true,
}: {
  place: Place;
  variant: EditorVariant;
  password: string;
  onRefresh: () => Promise<void>;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  asListItem?: boolean;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => placeToDraft(place));
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => place.photo_urls ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    setDraft(placeToDraft(place));
    setPhotoUrls(place.photo_urls ?? []);
    setPendingFiles([]);
  }, [place]);

  const busy = busyId === place.id;

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addPendingPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const room = 3 - photoUrls.length - pendingFiles.length;
    if (room <= 0) return;
    const next = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    setPendingFiles((p) => [...p, ...next].slice(0, 3));
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
      window.alert(t("moderation.editor.alertName"));
      return false;
    }
    const coords = parseCoords();
    if (!coords) {
      window.alert(t("moderation.editor.alertCoords"));
      return false;
    }

    let uploaded: string[] = [];
    if (pendingFiles.length > 0) {
      try {
        uploaded = await uploadImagesToCloudinary(pendingFiles);
      } catch {
        window.alert(t("moderation.editor.alertSave"));
        return false;
      }
    }
    const photo_urls = [...photoUrls, ...uploaded].slice(0, 3);

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
        limited_hours: draft.limited_hours,
        hours_note: draft.limited_hours ? draft.hours_note.trim() || null : null,
        extra_info: draft.extra_info.trim() || null,
        tags: parseTagsInput(draft.tags),
        photo_urls,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? t("moderation.editor.alertSave"));
      return false;
    }
    setPendingFiles([]);
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
        window.alert(data.error ?? t("moderation.editor.alertApprove"));
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function rejectPending() {
    if (!window.confirm(t("moderation.editor.confirmReject"))) return;
    setBusyId(place.id);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "reject", id: place.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? t("moderation.editor.alertOp"));
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
        window.alert(data.error ?? t("moderation.editor.alertPublish"));
        return;
      }
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function unpublish() {
    if (!window.confirm(t("moderation.editor.confirmUnpublish"))) return;
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
        window.alert(data.error ?? t("moderation.editor.alertOp"));
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
        window.alert(data.error ?? t("moderation.editor.alertDelete"));
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
      ? t("moderation.editor.proposal")
      : variant === "draft"
        ? t("moderation.editor.draft")
        : t("moderation.editor.published");

  const Shell = asListItem ? "li" : "div";

  return (
    <Shell className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <p className="text-xs text-stone-500 dark:text-stone-400">
        <span className="font-medium text-stone-600 dark:text-stone-300">{variantTitle}</span>
        {" · "}
        {t("moderation.editor.id")}{" "}
        <span className="font-mono text-stone-700 dark:text-stone-300">{place.id}</span>
        {" · "}
        {formatDate(place.created_at, locale)}
        {" · "}
        {t("moderation.editor.state")} {place.status}
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            {t("moderation.editor.name")}
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
            {t("moderation.editor.address")}
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
            {t("moderation.editor.description")}
          </label>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.description}
            onChange={(e) => setField("description", e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50/80 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/40">
          <input
            id={`lh-${place.id}`}
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-stone-400 text-teal-800 dark:border-stone-500"
            checked={draft.limited_hours}
            onChange={(e) => {
              const v = e.target.checked;
              setDraft((d) => ({
                ...d,
                limited_hours: v,
                hours_note: v ? d.hours_note : "",
              }));
            }}
            disabled={busy}
          />
          <div className="min-w-0 flex-1">
            <label htmlFor={`lh-${place.id}`} className="text-xs font-medium text-stone-700 dark:text-stone-300">
              {t("moderation.limitedHours")}
            </label>
            {draft.limited_hours && (
              <textarea
                rows={3}
                placeholder={t("moderation.hoursPlaceholder")}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                value={draft.hours_note}
                onChange={(e) => setField("hours_note", e.target.value)}
                disabled={busy}
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            {t("moderation.extraInfo")}
          </label>
          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{t("moderation.extraInfoHint")}</p>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.extra_info}
            onChange={(e) => setField("extra_info", e.target.value)}
            disabled={busy}
            placeholder={t("moderation.extraInfoHint")}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">{t("tags.fieldLabel")}</label>
          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{t("tags.fieldHelp")}</p>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.tags}
            onChange={(e) => setField("tags", e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </div>

        <PlacePhotoPicker
          existingUrls={photoUrls}
          onRemoveExisting={(i) => setPhotoUrls((u) => u.filter((_, j) => j !== i))}
          pendingFiles={pendingFiles}
          onAddPending={addPendingPhotos}
          onRemovePending={(i) => setPendingFiles((p) => p.filter((_, j) => j !== i))}
          disabled={busy}
          label={t("photos.label")}
          hint={t("photos.hint")}
          pickLabel={t("photos.pick")}
          maxReached={t("photos.max")}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
              {t("moderation.editor.lat")}
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
              {t("moderation.editor.lng")}
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
            <OsmLink lat={coords.lat} lng={coords.lng} label={t("moderation.editor.osm")} />
          </p>
        )}
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            {t("moderation.editor.category")}
          </label>
          <select
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            value={draft.category}
            onChange={(e) => setField("category", e.target.value)}
            disabled={busy}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {categoryDisplayName(c, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            {t("moderation.editor.proposedBy")}
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
          {t("moderation.editor.save")}
        </button>

        {variant === "pending" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void approvePending()}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
            >
              {t("moderation.editor.approve")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void rejectPending()}
              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
            >
              {t("moderation.editor.reject")}
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
              {t("moderation.editor.publish")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void deletePlace(t("moderation.editor.confirmDeleteDraft"))}
              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
            >
              {t("moderation.editor.delete")}
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
              {t("moderation.editor.unpublish")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void deletePlace(t("moderation.editor.confirmDeletePublished"))}
              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
            >
              {t("moderation.editor.deleteFromMap")}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}
