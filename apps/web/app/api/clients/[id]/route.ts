import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * GET    /api/clients/:id  -> um cliente
 * PATCH  /api/clients/:id  -> atualiza name/email/phone
 * DELETE /api/clients/:id  -> exclui, bloqueado se houver edificações cadastradas
 *   (evita apagar em cascata edificações/vistorias/laudos sem aviso)
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
    .from("clients")
    .select("id, name, email, phone")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ client: data });
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

  if (!body?.name) {
    return NextResponse.json({ error: "name é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
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
    .from("buildings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cliente tem ${count} edificação(ões) cadastrada(s). Exclua-as antes de excluir o cliente.` },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("clients").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
