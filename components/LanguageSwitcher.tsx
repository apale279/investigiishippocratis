"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      className="flex items-center gap-1 rounded-md border border-stone-200 bg-white/80 p-0.5 text-xs dark:border-stone-600 dark:bg-stone-800/80"
      role="group"
      aria-label={t("nav.language")}
    >
      <button
        type="button"
        onClick={() => select("it")}
        className={
          locale === "it"
            ? "rounded px-2 py-1 font-semibold bg-teal-800 text-white dark:bg-teal-700"
            : "rounded px-2 py-1 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
        }
      >
        {t("nav.itShort")}
      </button>
      <button
        type="button"
        onClick={() => select("en")}
        className={
          locale === "en"
            ? "rounded px-2 py-1 font-semibold bg-teal-800 text-white dark:bg-teal-700"
            : "rounded px-2 py-1 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
        }
      >
        {t("nav.enShort")}
      </button>
    </div>
  );
}
