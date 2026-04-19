import { NextResponse } from "next/server";
import { MODERATOR_PASSWORD_FALLBACK } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PLACE_CATEGORIES } from "@/lib/categories";
import type { PlaceStatus } from "@/lib/types";

type Action =
  | "list"
  | "create"
  | "update"
  | "approve"
  | "reject"
  | "delete"
  | "publish"
  | "unpublish";

type Body = {
  password?: string;
  action?: Action;
  id?: string;
  name?: string;
  address?: string | null;
  description?: string | null;
  lat?: number;
  lng?: number;
  category?: string;
  submitted_by?: string | null;
  /** Solo per create: bozza o pubblicazione immediata */
  initialStatus?: "draft" | "approved";
};

const PLACE_SELECT =
  "id, name, address, description, lat, lng, category, status, submitted_by, created_at";

function getExpectedPassword() {
  return process.env.MODERATOR_PASSWORD ?? MODERATOR_PASSWORD_FALLBACK;
}

function parseCoord(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function validatePlaceFields(body: Body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Il nome è obbligatorio" as const };

  const lat = parseCoord(body.lat);
  const lng = parseCoord(body.lng);
  if (lat === null || lng === null) {
    return { error: "Latitudine e longitudine non valide" as const };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "Coordinate fuori dai limiti" as const };
  }

  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (!category || !(PLACE_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Categoria non valida" as const };
  }

  const address =
    typeof body.address === "string" ? body.address.trim() || null : body.address ?? null;
  const description =
    typeof body.description === "string"
      ? body.description.trim() || null
      : body.description ?? null;
  const submitted_by =
    typeof body.submitted_by === "string"
      ? body.submitted_by.trim() || null
      : body.submitted_by ?? null;

  return {
    fields: { name, address, description, lat, lng, category, submitted_by },
  };
}

const EDITABLE: PlaceStatus[] = ["pending", "draft", "approved"];

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const password = body.password ?? "";
  if (password !== getExpectedPassword()) {
    return NextResponse.json({ error: "Password non valida" }, { status: 401 });
  }

  const action = body.action;
  const validActions: Action[] = [
    "list",
    "create",
    "update",
    "approve",
    "reject",
    "delete",
    "publish",
    "unpublish",
  ];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  try {
    const admin = createAdminSupabaseClient();

    if (action === "list") {
      const [pending, drafts, published] = await Promise.all([
        admin
          .from("places")
          .select(PLACE_SELECT)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        admin
          .from("places")
          .select(PLACE_SELECT)
          .eq("status", "draft")
          .order("created_at", { ascending: false }),
        admin
          .from("places")
          .select(PLACE_SELECT)
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
      ]);

      if (pending.error) throw pending.error;
      if (drafts.error) throw drafts.error;
      if (published.error) throw published.error;

      return NextResponse.json({
        pending: pending.data ?? [],
        drafts: drafts.data ?? [],
        published: published.data ?? [],
      });
    }

    if (action === "create") {
      const parsed = validatePlaceFields(body);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const initial: PlaceStatus =
        body.initialStatus === "approved" ? "approved" : "draft";

      const { data, error } = await admin
        .from("places")
        .insert({
          ...parsed.fields,
          status: initial,
        })
        .select(PLACE_SELECT)
        .single();

      if (error) throw error;
      return NextResponse.json({ place: data });
    }

    const id = body.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id mancante" }, { status: 400 });
    }

    if (action === "update") {
      const parsed = validatePlaceFields(body);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const { data: row, error: fetchErr } = await admin
        .from("places")
        .select("status")
        .eq("id", id)
        .single();

      if (fetchErr || !row) {
        return NextResponse.json({ error: "Luogo non trovato" }, { status: 404 });
      }
      if (!EDITABLE.includes(row.status as PlaceStatus)) {
        return NextResponse.json({ error: "Stato non modificabile" }, { status: 400 });
      }

      const { error } = await admin
        .from("places")
        .update(parsed.fields)
        .eq("id", id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "approve") {
      const { error } = await admin
        .from("places")
        .update({ status: "approved" })
        .eq("id", id)
        .eq("status", "pending");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      const { error } = await admin.from("places").delete().eq("id", id).eq("status", "pending");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.from("places").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "publish") {
      const { error } = await admin
        .from("places")
        .update({ status: "approved" })
        .eq("id", id)
        .eq("status", "draft");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "unpublish") {
      const { error } = await admin
        .from("places")
        .update({ status: "draft" })
        .eq("id", id)
        .eq("status", "approved");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Azione non gestita" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore sul database. Controlla le variabili e lo schema SQL." },
      { status: 500 }
    );
  }
}
