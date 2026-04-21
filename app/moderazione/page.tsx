"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Place } from "@/lib/types";
import { PlaceEditorCard } from "@/components/moderation/PlaceEditorCard";
import { ModerationNewPlace } from "@/components/moderation/ModerationNewPlace";
import { PublishedPlacesList } from "@/components/moderation/PublishedPlacesList";
import { useI18n } from "@/lib/i18n/context";

type Lists = {
  pending: Place[];
  drafts: Place[];
  published: Place[];
};

type TabId = "pending" | "drafts" | "published" | "new";

export default function ModerazionePage() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [lists, setLists] = useState<Lists>({ pending: [], drafts: [], published: [] });
  const [tab, setTab] = useState<TabId>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadList = useCallback(async (pwd: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd, action: "list" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("moderation.genericError"));
      setLists({
        pending: data.pending ?? [],
        drafts: data.drafts ?? [],
        published: data.published ?? [],
      });
    } catch (e) {
      console.error(e);
      setError(t("moderation.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/moderation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, action: "list" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("moderation.wrongPassword"));
        setUnlocked(true);
        setLists({
          pending: data.pending ?? [],
          drafts: data.drafts ?? [],
          published: data.published ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("moderation.denied"));
      } finally {
        setLoading(false);
      }
    })();
  }

  const tabs: { id: TabId; label: string; count: number }[] = useMemo(
    () => [
      { id: "pending", label: t("moderation.tabPending"), count: lists.pending.length },
      { id: "drafts", label: t("moderation.tabDrafts"), count: lists.drafts.length },
      { id: "published", label: t("moderation.tabPublished"), count: lists.published.length },
      { id: "new", label: t("moderation.tabNew"), count: 0 },
    ],
    [t, lists.pending.length, lists.drafts.length, lists.published.length]
  );

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-10 dark:bg-stone-950">
      <div
        className={
          tab === "published"
            ? "mx-auto w-full max-w-4xl"
            : "mx-auto max-w-2xl"
        }
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">
          <Link href="/" className="text-teal-800 underline dark:text-teal-400">
            {t("moderation.backToMap")}
          </Link>
        </p>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-stone-800 dark:text-stone-100">
          {t("moderation.title")}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{t("moderation.intro")}</p>

        {!unlocked ? (
          <form onSubmit={onLogin} className="mt-8 max-w-sm space-y-4">
            <div>
              <label htmlFor="pwd" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                {t("moderation.password")}
              </label>
              <input
                id="pwd"
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60 dark:bg-stone-600 dark:hover:bg-stone-500"
            >
              {loading ? t("moderation.verify") : t("moderation.login")}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadList(password)}
                disabled={loading || creating || busyId !== null}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-900"
              >
                {t("moderation.refreshAll")}
              </button>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-stone-200 dark:border-stone-700">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={
                    tab === t.id
                      ? "border-b-2 border-teal-700 px-3 py-2 text-sm font-medium text-teal-900 dark:border-teal-500 dark:text-teal-200"
                      : "px-3 py-2 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  }
                >
                  {t.label}
                  {t.id !== "new" && (
                    <span className="ml-1 text-stone-400">({t.count})</span>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
            {loading && (
              <p className="text-sm text-stone-600">{t("moderation.loadingShort")}</p>
            )}

            {tab === "new" && (
              <ModerationNewPlace
                password={password}
                onCreated={async () => {
                  await loadList(password);
                }}
                busy={creating}
                setBusy={setCreating}
              />
            )}

            {tab === "pending" && (
              <ul className="space-y-6">
                {!loading && lists.pending.length === 0 && (
                  <p className="text-stone-600 dark:text-stone-400">{t("moderation.emptyPending")}</p>
                )}
                {lists.pending.map((p) => (
                  <PlaceEditorCard
                    key={p.id}
                    place={p}
                    variant="pending"
                    password={password}
                    onRefresh={async () => loadList(password)}
                    busyId={busyId}
                    setBusyId={setBusyId}
                  />
                ))}
              </ul>
            )}

            {tab === "drafts" && (
              <ul className="space-y-6">
                {!loading && lists.drafts.length === 0 && (
                  <p className="text-stone-600 dark:text-stone-400">{t("moderation.emptyDrafts")}</p>
                )}
                {lists.drafts.map((p) => (
                  <PlaceEditorCard
                    key={p.id}
                    place={p}
                    variant="draft"
                    password={password}
                    onRefresh={async () => loadList(password)}
                    busyId={busyId}
                    setBusyId={setBusyId}
                  />
                ))}
              </ul>
            )}

            {tab === "published" && (
              <PublishedPlacesList
                places={lists.published}
                password={password}
                onRefresh={async () => loadList(password)}
                busyId={busyId}
                setBusyId={setBusyId}
                loading={loading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
