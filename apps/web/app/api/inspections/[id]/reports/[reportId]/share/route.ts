import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * RF-11 — ativa/desativa o link público de compartilhamento de um laudo.
 * PATCH /api/inspections/:id/reports/:reportId/share
 *   body: { enabled: boolean }
 */

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; reportId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ share_enabled: body.enabled })
    .eq("id", params.reportId)
    .eq("inspection_id", params.id)
    .select("id, share_token, share_enabled")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
