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
  created_at?: string;
};
