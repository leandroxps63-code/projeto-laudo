import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isValidCpf, onlyDigits } from "@/lib/cpf";

/**
 * Perfil do próprio usuário logado (não de terceiros — sempre a linha cujo
 * id é o auth.uid() da sessão, reforçado pela RLS "usuário edita o próprio
 * perfil"). Cobre os campos que o cadastro em si não pede (CPF, data de
 * nascimento, telefone, CREA) — preenchidos depois, nesta tela.
 *
 * GET   /api/profile  -> perfil do usuário logado
 * PATCH /api/profile  -> atualiza full_name/cpf/birth_date/phone/crea
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
    .from("profiles")
    .select("id, full_name, cpf, birth_date, phone, crea, role")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.fullName) {
    return NextResponse.json({ error: "fullName é obrigatório." }, { status: 400 });
  }

  const cpf = body.cpf ? onlyDigits(body.cpf) : null;
  if (cpf && !isValidCpf(cpf)) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: body.fullName,
      cpf,
      birth_date: body.birthDate || null,
      phone: body.phone || null,
      crea: body.crea || null,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    // Índice único parcial em cpf — mensagem melhor que o erro cru do Postgres.
    if (error.code === "23505") {
      return NextResponse.json({ error: "Esse CPF já está cadastrado em outra conta." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
