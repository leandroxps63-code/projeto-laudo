import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { logError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

const PHOTOS_BUCKET = "anomaly-photos";

/**
 * PATCH  /api/inspections/:id/anomalies/:anomalyId  -> corrige uma anomalia já registrada
 *   body: { environment?, systemType?, description?, treatmentRecommendation?, severity? }
 * DELETE /api/inspections/:id/anomalies/:anomalyId  -> apaga a anomalia e suas fotos
 */

export async function PATCH(request: Request, { params }: { params: { id: string; anomalyId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (body.environment) updates.environment = body.environment;
  if (body.systemType) updates.system_type = body.systemType;
  if (body.description) updates.description = body.description;
  if (body.treatmentRecommendation) updates.treatment_recommendation = body.treatmentRecommendation;
  if (body.severity) updates.severity = body.severity;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("anomalies")
    .update(updates)
    .eq("id", params.anomalyId)
    .eq("inspection_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ anomaly: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string; anomalyId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: photos } = await supabase
    .from("anomaly_photos")
    .select("storage_path")
    .eq("anomaly_id", params.anomalyId);

  if (photos && photos.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(photos.map((p) => p.storage_path));
    if (removeError) {
      await logError(supabase, "api.inspections.anomalies.delete.storage", removeError, {
        inspectionId: params.id,
        anomalyId: params.anomalyId,
      });
    }
  }

  const { error } = await supabase
    .from("anomalies")
    .delete()
    .eq("id", params.anomalyId)
    .eq("inspection_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
