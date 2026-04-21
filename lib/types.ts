export type PlaceStatus = "pending" | "approved" | "draft";

export type Place = {
  id: string;
  name: string;
  /** Indirizzo testuale (es. da geocoding) */
  address: string | null;
  description: string | null;
  lat: number;
  lng: number;
  category: string;
  status: PlaceStatus;
  submitted_by: string | null;
  /** Accesso solo in certe fasce orarie */
  limited_hours: boolean;
  /** Dettaglio orari (se limited_hours) */
  hours_note: string | null;
  /** Info pratiche: biglietti, come arrivare, ecc. */
  extra_info: string | null;
  /** Hashtag normalizzati (minuscolo, senza #) */
  tags: string[];
  /** Fino a 3 URL immagini (Cloudinary) */
  photo_urls: string[];
  created_at?: string;
};
