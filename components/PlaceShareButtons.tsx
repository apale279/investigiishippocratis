"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

function IconCopy() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function PlaceShareButtons({
  placeId,
  variant = "default",
}: {
  placeId: string;
  /** `compact` per popup mappa stretto */
  variant?: "default" | "compact";
}) {
  const { t } = useI18n();
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/?focus=${encodeURIComponent(placeId)}`);
  }, [placeId]);

  const showCopied = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }, []);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopied();
    } catch {
      /* ignore */
    }
  }, [shareUrl, showCopied]);

  const shareFacebook = useCallback(() => {
    if (!shareUrl) return;
    const u = encodeURIComponent(shareUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      "_blank",
      "noopener,noreferrer,width=600,height=520"
    );
  }, [shareUrl]);

  /** Instagram non espone un URL di condivisione web con link precompilato: copiamo il link e apriamo instagram.com. */
  const shareInstagram = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopied();
    } catch {
      /* ignore */
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  }, [shareUrl, showCopied]);

  const btn =
    variant === "compact"
      ? "inline-flex w-full items-center justify-center gap-2 rounded border border-stone-300 bg-white px-2 py-1.5 text-[11px] font-medium text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
      : "inline-flex items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 py-2 text-xs font-medium text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800";

  const disabled = !shareUrl;

  return (
    <div className="space-y-1.5">
      <div
        className={variant === "compact" ? "flex flex-col gap-1.5" : "flex flex-wrap gap-2"}
      >
        <button type="button" className={btn} disabled={disabled} onClick={() => void copyLink()} title={t("popup.share.copyLink")}>
          <IconCopy />
          <span>{t("popup.share.copyLink")}</span>
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => void shareInstagram()}
          title={t("popup.share.instagram")}
        >
          <IconInstagram />
          <span>{t("popup.share.instagram")}</span>
        </button>
        <button type="button" className={btn} disabled={disabled} onClick={shareFacebook} title={t("popup.share.facebook")}>
          <IconFacebook />
          <span>{t("popup.share.facebook")}</span>
        </button>
      </div>
      {copied && (
        <p className="text-[11px] text-teal-800 dark:text-teal-400" role="status" aria-live="polite">
          {t("popup.share.copied")}
        </p>
      )}
    </div>
  );
}
