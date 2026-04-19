"use client";

import { Suspense, useEffect } from "react";
import { useMap } from "react-leaflet";
import { useSearchParams } from "next/navigation";
import type { Place } from "@/lib/types";

function MapUrlFocusInner({ places }: { places: Place[] }) {
  const map = useMap();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const latQ = searchParams.get("lat");
  const lngQ = searchParams.get("lng");
  const zoomQ = searchParams.get("zoom");

  useEffect(() => {
    if (places.length === 0) return;

    const zoomParsed = zoomQ ? parseFloat(zoomQ) : 15;
    const z = Math.min(18, Math.max(4, Number.isFinite(zoomParsed) ? zoomParsed : 15));

    if (focus) {
      const p = places.find((x) => x.id === focus);
      if (p) {
        map.flyTo([p.lat, p.lng], z, { duration: 0.65 });
      }
      return;
    }

    if (latQ && lngQ) {
      const lat = parseFloat(latQ);
      const lng = parseFloat(lngQ);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        map.flyTo([lat, lng], z, { duration: 0.65 });
      }
    }
  }, [map, places, focus, latQ, lngQ, zoomQ]);

  return null;
}

export function MapUrlFocus({ places }: { places: Place[] }) {
  return (
    <Suspense fallback={null}>
      <MapUrlFocusInner places={places} />
    </Suspense>
  );
}
