"use client";

import dynamic from "next/dynamic";
import { AppHeader } from "@/components/AppHeader";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400">
      Caricamento mappa…
    </div>
  ),
});

export function HomeMapClient() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <MapView />
    </div>
  );
}
