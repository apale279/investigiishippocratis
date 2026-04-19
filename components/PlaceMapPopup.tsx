import type { Place } from "@/lib/types";

/**
 * Contenuto popup mappa: colori sempre leggibili sullo sfondo bianco di Leaflet
 * (in dark mode il body usa testo chiaro — senza questo il popup risulta invisibile).
 */
export function PlaceMapPopup({ place }: { place: Place }) {
  const address = place.address?.trim();
  const description = place.description?.trim();
  const author = place.submitted_by?.trim();
  const limited = place.limited_hours ?? false;
  const hoursNote = place.hours_note?.trim();
  const extraInfo = place.extra_info?.trim();

  return (
    <div
      className="min-w-[240px] max-w-[min(100vw-24px,22rem)] space-y-2 font-sans text-[13px] leading-snug text-stone-900"
      style={{ color: "#1c1917" }}
    >
      <h3
        className="m-0 border-b border-stone-200 pb-2 font-serif text-base font-semibold"
        style={{ color: "#0c0a09" }}
      >
        {place.name}
      </h3>
      <dl className="m-0 space-y-2">
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Indirizzo
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {address || "—"}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Categoria
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {place.category}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Descrizione
          </dt>
          <dd className="m-0 mt-0.5 whitespace-pre-wrap text-stone-800" style={{ color: "#292524" }}>
            {description || "—"}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Orario limitato
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {limited ? "Sì" : "No"}
          </dd>
        </div>
        {limited && (
          <div>
            <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Orari
            </dt>
            <dd className="m-0 mt-0.5 whitespace-pre-wrap text-stone-800" style={{ color: "#292524" }}>
              {hoursNote || "—"}
            </dd>
          </div>
        )}
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Altre informazioni sul luogo
          </dt>
          <dd className="m-0 mt-0.5 whitespace-pre-wrap text-stone-800" style={{ color: "#292524" }}>
            {extraInfo || "—"}
          </dd>
        </div>
        <div>
          <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Autore
          </dt>
          <dd className="m-0 mt-0.5 text-stone-800" style={{ color: "#292524" }}>
            {author || "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
