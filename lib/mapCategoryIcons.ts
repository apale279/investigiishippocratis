import L from "leaflet";

/** Emoji distinti per categoria POI (valori DB in italiano). */
const CATEGORY_EMOJI: Record<string, string> = {
  Museo: "🏛️",
  "Monumento / lapide": "🪦",
  "Biblioteca / archivio": "📚",
  "Università / scuola medica": "🎓",
  "Sito storico": "🏺",
  Altro: "📌",
};

const SIZE = 44;
const ANCHOR_Y = SIZE;
const BORDER = "3px solid #0f766e";
const SHADOW = "0 3px 14px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.12) inset";

function markerHtml(emoji: string): string {
  return `<div style="
    width:${SIZE}px;height:${SIZE}px;
    display:flex;align-items:center;justify-content:center;
    background:#ffffff;
    border:${BORDER};
    border-radius:50%;
    box-shadow:${SHADOW};
    font-size:22px;
    line-height:1;
    user-select:none;
  ">${emoji}</div>`;
}

const cache = new Map<string, L.DivIcon>();

export function getMarkerIconForCategory(category: string): L.DivIcon {
  if (!cache.has(category)) {
    const emoji = CATEGORY_EMOJI[category] ?? "📍";
    const icon = L.divIcon({
      className: "map-poi-icon",
      html: markerHtml(emoji),
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, ANCHOR_Y],
      popupAnchor: [0, -ANCHOR_Y + 8],
    });
    cache.set(category, icon);
  }
  return cache.get(category)!;
}

let searchCenterIcon: L.DivIcon | null = null;

/** Punto ricerca geocoding (stesso stile visivo per coerenza). */
export function getSearchCenterIcon(): L.DivIcon {
  if (!searchCenterIcon) {
    searchCenterIcon = L.divIcon({
      className: "map-search-icon",
      html: markerHtml("📍"),
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, ANCHOR_Y],
      popupAnchor: [0, -ANCHOR_Y + 8],
    });
  }
  return searchCenterIcon;
}
