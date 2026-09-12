import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * GET    /api/buildings/:id  -> uma edificação
 * PATCH  /api/buildings/:id  -> atualiza name/address/floors
 * DELETE /api/buildings/:id  -> exclui, bloqueado se houver vistorias cadastradas
 *   (evita apagar em cascata anomalias/fotos/laudos sem aviso)
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("buildings")
    .select("id, client_id, name, address, floors")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ building: data });
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

  if (!body?.name || !body?.address) {
    return NextResponse.json({ error: "name e address são obrigatórios." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("buildings")
    .update({
      name: body.name,
      address: body.address,
      floors: body.floors ?? null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ building: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { count } = await supabase
    .from("inspections")
    .select("id", { count: "exact", head: true })
    .eq("building_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Edificação tem ${count} vistoria(s) cadastrada(s). Exclua-as antes de excluir a edificação.` },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("buildings").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
