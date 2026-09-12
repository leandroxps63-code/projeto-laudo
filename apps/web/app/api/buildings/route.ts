import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Edificações vinculadas a um cliente.
 * GET  /api/buildings?clientId=...  -> lista edificações de um cliente
 * POST /api/buildings                -> cria uma edificação
 *   body: { clientId: string, name: string, address: string, floors?: number }
 */

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId");
  let query = supabase.from("buildings").select("id, client_id, name, address, floors, created_at");
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ buildings: data });
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

  if (!body?.clientId || !body?.name || !body?.address) {
    return NextResponse.json(
      { error: "clientId, name e address são obrigatórios." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("buildings")
    .insert({
      client_id: body.clientId,
      name: body.name,
      address: body.address,
      floors: body.floors ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ building: data }, { status: 201 });
}
