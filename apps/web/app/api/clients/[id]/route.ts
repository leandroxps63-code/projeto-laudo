import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { onlyDigits } from "@/lib/cpf";
import { CLIENT_SELECT_COLUMNS, validateClientDocument } from "@/lib/clients";

/**
 * GET    /api/clients/:id  -> um cliente
 * PATCH  /api/clients/:id  -> atualiza os dados do cliente
 * DELETE /api/clients/:id  -> exclui, bloqueado se houver edificações cadastradas
 *   (evita apagar em cascata edificações/vistorias/laudos sem aviso)
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
    .from("clients")
    .select(CLIENT_SELECT_COLUMNS)
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

  const personType = body.personType === "pj" ? "pj" : "pf";
  const docError = validateClientDocument(personType, body.document);
  if (docError) return NextResponse.json({ error: docError }, { status: 400 });

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      person_type: personType,
      document: body.document ? onlyDigits(body.document) : null,
      contact_name: body.contactName || null,
      contact_role: body.contactRole || null,
      zip_code: body.zipCode ? onlyDigits(body.zipCode) : null,
      street: body.street || null,
      number: body.number || null,
      complement: body.complement || null,
      district: body.district || null,
      city: body.city || null,
      state: body.state || null,
      notes: body.notes || null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Você já tem um cliente cadastrado com esse documento." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
