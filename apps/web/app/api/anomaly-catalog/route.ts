import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * RF-07 — banco de anomalias e tratamentos. Biblioteca compartilhada
 * (não é por vistoria), usada para sugerir classificação e tratamento
 * enquanto o usuário descreve uma anomalia em campo.
 *
 * GET /api/anomaly-catalog?q=infiltra  -> busca por categoria/descrição
 * GET /api/anomaly-catalog             -> lista tudo (telas de configuração)
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q");

  let query = supabase
    .from("anomaly_catalog")
    .select(
      "id, category, description, system_type, default_severity, treatment_recommendation, catalog_products(id, manufacturer, product_name, datasheet_url, video_url)"
    );

  if (q) {
    query = query.or(`category.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query.order("category");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ catalog: data });
}
