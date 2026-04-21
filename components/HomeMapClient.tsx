"use client";

import dynamic from "next/dynamic";
import { AppHeader } from "@/components/AppHeader";
import { useI18n } from "@/lib/i18n/context";

function MapLoadingFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400">
      {t("map.loading")}
    </div>
  );
}

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

export function HomeMapClient() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <MapView />
    </div>
  );
}
