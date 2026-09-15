import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Não autenticado.",
  caller_is_a_member: "Só quem é dono da conta pode convidar — você já faz parte da equipe de outra pessoa.",
  user_not_found: "Não achei nenhuma conta com esse e-mail. A pessoa precisa criar a conta em /cadastro antes.",
  cannot_invite_self: "Você não pode convidar a si mesmo.",
  already_on_another_team: "Essa pessoa já faz parte da equipe de outra conta.",
  target_has_own_data:
    "Essa pessoa já tem clientes próprios cadastrados — não dá pra migrar automaticamente pra sua equipe.",
};

/**
 * Equipe — compartilha clientes/edificações/vistorias/laudos entre quem
 * convida (dono da conta) e quem é convidado (membro), com paridade total
 * de acesso (ver migration 0021_team_accounts).
 *
 * GET  /api/team  -> lista quem está na mesma conta (RLS já filtra pra só
 *   trazer o dono + membros do usuário logado)
 * POST /api/team  -> convida um usuário já cadastrado pelo e-mail
 *   body: { email: string, role?: "responsavel_tecnico"|"assistente"|"sindico" }
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
    .from("profiles")
    .select("id, full_name, role, team_owner_id")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const me = data?.find((p) => p.id === user.id);
  const isOwner = !me?.team_owner_id;

  return NextResponse.json({ profiles: data ?? [], isOwner, myId: user.id });
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
  if (!body?.email) {
    return NextResponse.json({ error: "email é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("invite_to_team", {
    p_email: body.email,
    p_role: body.role ?? "assistente",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as { ok: boolean; error?: string; name?: string };
  if (!result.ok) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.error ?? ""] ?? "Falha ao convidar." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, name: result.name });
}
