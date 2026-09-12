import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Clientes (contratantes do laudo — construtora, condomínio, pessoa física).
 * GET  /api/clients   -> lista os clientes criados pelo usuário logado
 * POST /api/clients    -> cria um cliente novo
 *   body: { name: string, email?: string, phone?: string }
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
    .from("clients")
    .select("id, name, email, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
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

  if (!body?.name) {
    return NextResponse.json({ error: "name é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data }, { status: 201 });
}
