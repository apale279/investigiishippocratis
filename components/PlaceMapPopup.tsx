"use client";

import type { Place } from "@/lib/types";
import { categoryDisplayName } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import { PlaceShareButtons } from "@/components/PlaceShareButtons";
import { PlaceTagLinks } from "@/components/PlaceTagLinks";

/**
 * Contenuto popup mappa: colori sempre leggibili sullo sfondo bianco di Leaflet
 * (in dark mode il body usa testo chiaro — senza questo il popup risulta invisibile).
 */
export function PlaceMapPopup({ place }: { place: Place }) {
  const { locale, t } = useI18n();
  const address = place.address?.trim();
  const description = place.description?.trim();
  const author = place.submitted_by?.trim();
  const limited = place.limited_hours ?? false;
  const hoursNote = place.hours_note?.trim();
  const extraInfo = place.extra_info?.trim();
  const dash = t("popup.dash");
  const tags = place.tags ?? [];
  const photos = place.photo_urls ?? [];

  return (
    <div
      className="min-w-[240px] max-w-[min(100vw-24px,22rem)] space-y-2 font-sans text-[13px] leading-snug text-stone-900"
      style={{ color: "#1c1917" }}
    >
      <h3
        className="m-0 border-b border-stone-200 pb-2 font-serif text-base font-semibold"
        style={{ color: "#0c0a09" }}
      >
        {place.name}
      </h3>
      {photos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5">
          {photos.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded border border-stone-200 bg-stone-100 dark:border-stone-600 dark:bg-stone-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-16 rounded object-cover" width={64} height={64} />
            </a>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="pb-1">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{t("tags.fieldLabel")}</p>
          <PlaceTagLinks tags={tags} basePath="/" className="mt-1 flex flex-wrap gap-1.5" />
        </div>
      )}
      <dl className="m-0 space-y-2">
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {t("popup.address")}
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {address || dash}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {t("popup.category")}
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {categoryDisplayName(place.category, locale)}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {t("popup.description")}
          </dt>
          <dd className="m-0 mt-0.5 whitespace-pre-wrap text-stone-800" style={{ color: "#292524" }}>
            {description || dash}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {t("popup.limitedHours")}
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {limited ? t("popup.yes") : t("popup.no")}
          </dd>
        </div>
        {limited && (
          <div>
            <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              {t("popup.hours")}
            </dt>
            <dd className="m-0 mt-0.5 whitespace-pre-wrap text-stone-800" style={{ color: "#292524" }}>
              {hoursNote || dash}
            </dd>
          </div>
        )}
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {t("popup.extraInfo")}
          </dt>
          <dd className="m-0 mt-0.5 whitespace-pre-wrap text-stone-800" style={{ color: "#292524" }}>
            {extraInfo || dash}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {t("popup.author")}
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {author || dash}
          </dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-stone-200 pt-3" style={{ borderColor: "#e7e5e4" }}>
        <PlaceShareButtons placeId={place.id} variant="compact" />
      </div>
    </div>
  );
}
