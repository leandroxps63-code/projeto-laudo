import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { onlyDigits } from "@/lib/cpf";
import { CLIENT_SELECT_COLUMNS, validateClientDocument } from "@/lib/clients";

/**
 * Clientes (contratantes do laudo — construtora, condomínio, pessoa física).
 * GET  /api/clients   -> lista os clientes criados pelo usuário logado, com
 *   as edificações de cada um (usado pra reaproveitar cliente ao iniciar
 *   vistoria em vez de duplicar — ver apps/web/app/vistorias/nova/page.tsx)
 * POST /api/clients    -> cria um cliente novo
 *   body: { name, email?, phone?, personType?, document?, contactName?,
 *            contactRole?, zipCode?, street?, number?, complement?,
 *            district?, city?, state?, notes? }
 */

export const dynamic = "force-dynamic";

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
    .select(`${CLIENT_SELECT_COLUMNS}, buildings(id, name, address, floors)`)
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

  const personType = body.personType === "pj" ? "pj" : "pf";
  const docError = validateClientDocument(personType, body.document);
  if (docError) return NextResponse.json({ error: docError }, { status: 400 });

  const { data, error } = await supabase
    .from("clients")
    .insert({
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
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Você já tem um cliente cadastrado com esse documento." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ client: data }, { status: 201 });
}
