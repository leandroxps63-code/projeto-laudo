import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * RF-01 — criar projeto de vistoria com os dados básicos da edificação.
 * RF-15 — só retorna vistorias do usuário autenticado (reforçado por RLS no banco).
 *
 * GET  /api/inspections        -> lista as vistorias do usuário logado
 * POST /api/inspections        -> cria uma vistoria nova
 *   body: { buildingId: string, inspectionType?: string }
 */

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("inspections")
    .select(
      "id, status, inspection_type, started_at, finished_at, created_at, buildings(name, address)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inspections: data });
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.buildingId) {
    return NextResponse.json({ error: "buildingId é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inspections")
    .insert({
      building_id: body.buildingId,
      responsible_id: user.id,
      inspection_type: body.inspectionType ?? "NBR 16.747 — Nível II",
      status: "rascunho",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inspection: data }, { status: 201 });
}
