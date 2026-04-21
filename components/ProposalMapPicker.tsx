"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [42.5, 12.5];
const DEFAULT_ZOOM = 6;

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    return () => cancelAnimationFrame(id);
  }, [map]);
  return null;
}

function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    const id = requestAnimationFrame(() => {
      const z = Math.max(map.getZoom(), 14);
      map.setView(position, z);
    });
    return () => cancelAnimationFrame(id);
  }, [position, map]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  lat: number | null;
  lng: number | null;
  onPositionChange: (lat: number, lng: number) => void;
  hint?: string;
};

/** Evita setState sul genitore durante il commit/mount di Leaflet (warning React 18). */
function emitPositionLater(onPositionChange: (lat: number, lng: number) => void, lat: number, lng: number) {
  queueMicrotask(() => {
    onPositionChange(lat, lng);
  });
}

export function ProposalMapPicker({ lat, lng, onPositionChange, hint }: Props) {
  const [icon, setIcon] = useState<L.Icon | null>(null);

  useEffect(() => {
    const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
    delete proto._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
    setIcon(
      new L.Icon({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })
    );
  }, []);

  const position = useMemo((): [number, number] | null => {
    if (lat == null || lng == null) return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  }, [lat, lng]);

  const center = position ?? DEFAULT_CENTER;
  const zoom = position ? 15 : DEFAULT_ZOOM;

  const onDragEnd = useCallback(
    (e: L.DragEndEvent) => {
      const m = e.target as L.Marker;
      const p = m.getLatLng();
      emitPositionLater(onPositionChange, p.lat, p.lng);
    },
    [onPositionChange]
  );

  return (
    <div className="overflow-hidden rounded-md border border-stone-300 dark:border-stone-600">
      <MapContainer center={center} zoom={zoom} className="h-[min(55vh,22rem)] w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResize />
        <FlyToPosition position={position} />
        <ClickHandler
          onClick={(la, ln) => {
            emitPositionLater(onPositionChange, la, ln);
          }}
        />
        {position && icon && (
          <Marker position={position} draggable icon={icon} eventHandlers={{ dragend: onDragEnd }} />
        )}
      </MapContainer>
      {hint && <p className="border-t border-stone-200 bg-stone-50 px-2 py-1.5 text-[11px] text-stone-600 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-400">{hint}</p>}
    </div>
  );
}
