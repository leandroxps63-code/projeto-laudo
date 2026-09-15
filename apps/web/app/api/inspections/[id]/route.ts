import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["NBR 16.747 — Nível I", "NBR 16.747 — Nível II", "NBR 16.747 — Nível III"];

/**
 * GET   /api/inspections/:id -> dados básicos da vistoria (nível/status)
 * PATCH /api/inspections/:id -> troca o nível da NBR 16.747
 *   body: { inspectionType: string }
 */

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("inspections")
    .select("id, inspection_type, status")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ inspection: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.inspectionType || !ALLOWED_TYPES.includes(body.inspectionType)) {
    return NextResponse.json({ error: "inspectionType inválido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inspections")
    .update({ inspection_type: body.inspectionType })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inspection: data });
}
