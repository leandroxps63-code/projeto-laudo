import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/inspections/:id/copy-anomalies -> copia as anomalias de uma
 * vistoria anterior (mesma edificação) como ponto de partida de uma
 * reinspeção — economiza redigitar tudo de novo. Copia só os campos de
 * texto/severidade (sem foto); o inspetor edita/apaga o que não se aplica
 * mais usando os controles que já existem em cada anomalia.
 *   body: { fromInspectionId: string }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.fromInspectionId) {
    return NextResponse.json({ error: "fromInspectionId é obrigatório." }, { status: 400 });
  }

  const [{ data: current, error: currentError }, { data: source, error: sourceError }] = await Promise.all([
    supabase.from("inspections").select("building_id").eq("id", params.id).single(),
    supabase.from("inspections").select("building_id").eq("id", body.fromInspectionId).single(),
  ]);

  if (currentError || !current) {
    return NextResponse.json({ error: currentError?.message ?? "Vistoria não encontrada." }, { status: 404 });
  }
  if (sourceError || !source) {
    return NextResponse.json({ error: sourceError?.message ?? "Vistoria de origem não encontrada." }, { status: 404 });
  }
  if (source.building_id !== current.building_id) {
    return NextResponse.json({ error: "A vistoria de origem precisa ser da mesma edificação." }, { status: 400 });
  }

  const { data: sourceAnomalies, error: sourceAnomaliesError } = await supabase
    .from("anomalies")
    .select("catalog_id, environment, system_type, description, treatment_recommendation, severity")
    .eq("inspection_id", body.fromInspectionId)
    .order("created_at", { ascending: true });

  if (sourceAnomaliesError) return NextResponse.json({ error: sourceAnomaliesError.message }, { status: 500 });
  if (!sourceAnomalies || sourceAnomalies.length === 0) {
    return NextResponse.json({ error: "A vistoria anterior não tem anomalias pra copiar." }, { status: 400 });
  }

  const { count: existingCount } = await supabase
    .from("anomalies")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", params.id);

  const rows = sourceAnomalies.map((a, i) => ({
    inspection_id: params.id,
    catalog_id: a.catalog_id,
    environment: a.environment,
    system_type: a.system_type,
    description: a.description,
    treatment_recommendation: a.treatment_recommendation,
    severity: a.severity,
    code: `AN-${String((existingCount ?? 0) + i + 1).padStart(3, "0")}`,
    created_by: user.id,
  }));

  const { error: insertError } = await supabase.from("anomalies").insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await supabase.from("inspections").update({ status: "em_vistoria" }).eq("id", params.id).eq("status", "rascunho");

  return NextResponse.json({ copied: rows.length });
}
