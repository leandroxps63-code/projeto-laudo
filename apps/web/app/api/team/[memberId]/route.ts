import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** DELETE /api/team/:memberId -> dono remove um membro da equipe (RPC checa se é mesmo o dono). */
export async function DELETE(_request: Request, { params }: { params: { memberId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("remove_team_member", { p_member_id: params.memberId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) {
    return NextResponse.json({ error: "Não foi possível remover — confira se essa pessoa está mesmo na sua equipe." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
