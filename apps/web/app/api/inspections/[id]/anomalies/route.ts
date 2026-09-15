import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * RF-02/RF-07/RF-09 — anomalias de uma vistoria específica.
 *
 * GET  /api/inspections/:id/anomalies  -> lista as anomalias da vistoria
 * POST /api/inspections/:id/anomalies  -> registra uma anomalia
 *   body: {
 *     environment: string,
 *     systemType: string,
 *     description?: string,             // se omitido, usa a descrição do catálogo
 *     treatmentRecommendation?: string,  // se omitido, usa o tratamento do catálogo
 *     severity?: "baixa"|"media"|"alta"|"critica", // se omitido, usa a severidade padrão do catálogo
 *     catalogId?: string,                // sugestão aceita do banco de anomalias (RF-07)
 *   }
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
    .from("anomalies")
    .select(
      "id, code, environment, system_type, description, treatment_recommendation, severity, created_at, anomaly_photos(id, storage_path, caption)"
    )
    .eq("inspection_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ anomalies: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.environment || !body?.systemType) {
    return NextResponse.json(
      { error: "environment e systemType são obrigatórios." },
      { status: 400 }
    );
  }

  // RF-07: se veio catalogId, usa os dados do catálogo como padrão —
  // o que o usuário mandar explicitamente no body sempre tem prioridade
  // (ele pode ajustar a sugestão antes de salvar).
  let description = body.description ?? null;
  let treatment = body.treatmentRecommendation ?? null;
  let severity = body.severity ?? null;

  if (body.catalogId && (!description || !treatment || !severity)) {
    const { data: catalogEntry } = await supabase
      .from("anomaly_catalog")
      .select("description, treatment_recommendation, default_severity")
      .eq("id", body.catalogId)
      .single();

    if (catalogEntry) {
      description ??= catalogEntry.description;
      treatment ??= catalogEntry.treatment_recommendation;
      severity ??= catalogEntry.default_severity;
    }
  }

  if (!description || !treatment || !severity) {
    return NextResponse.json(
      {
        error:
          "description, treatmentRecommendation e severity são obrigatórios (diretamente ou via catalogId).",
      },
      { status: 400 }
    );
  }

  // Código sequencial por vistoria (AN-001, AN-002, ...) — mesmo padrão do template do laudo.
  const { count } = await supabase
    .from("anomalies")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", params.id);

  const code = `AN-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await supabase
    .from("anomalies")
    .insert({
      inspection_id: params.id,
      catalog_id: body.catalogId ?? null,
      environment: body.environment,
      system_type: body.systemType,
      description,
      treatment_recommendation: treatment,
      severity,
      code,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A primeira anomalia tira a vistoria de "rascunho" — reflete que o
  // trabalho de campo já começou (RF-15, status usado no painel/dashboard).
  await supabase
    .from("inspections")
    .update({ status: "em_vistoria" })
    .eq("id", params.id)
    .eq("status", "rascunho");

  return NextResponse.json({ anomaly: data }, { status: 201 });
}
