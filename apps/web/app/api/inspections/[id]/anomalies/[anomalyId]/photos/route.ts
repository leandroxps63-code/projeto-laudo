import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { logError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * RF-09 — fotos de uma anomalia, no Supabase Storage (bucket privado "anomaly-photos").
 * Caminho de armazenamento: {inspectionId}/{anomalyId}/{uuid}-{nome do arquivo}.
 *
 * GET  /api/inspections/:id/anomalies/:anomalyId/photos  -> lista com signed URLs (1h)
 * POST /api/inspections/:id/anomalies/:anomalyId/photos  -> envia uma foto (multipart/form-data)
 *   campos: file (obrigatório), caption (opcional)
 */

const BUCKET = "anomaly-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function GET(
  _request: Request,
  { params }: { params: { id: string; anomalyId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: photos, error } = await supabase
    .from("anomaly_photos")
    .select("id, storage_path, caption, created_at")
    .eq("anomaly_id", params.anomalyId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS);
      return { ...photo, url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ photos: withUrls });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; anomalyId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const caption = formData?.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo file é obrigatório." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Apenas arquivos de imagem são aceitos." }, { status: 400 });
  }

  const storagePath = `${params.id}/${params.anomalyId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type });

  if (uploadError) {
    await logError(supabase, "api.inspections.anomalies.photos.post", uploadError, {
      inspectionId: params.id,
      anomalyId: params.anomalyId,
    });
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("anomaly_photos")
    .insert({
      anomaly_id: params.anomalyId,
      storage_path: storagePath,
      caption: typeof caption === "string" && caption ? caption : null,
    })
    .select()
    .single();

  if (error) {
    // desfaz o upload se o registro na tabela falhar (evita arquivo órfão no storage)
    await supabase.storage.from(BUCKET).remove([storagePath]);
    await logError(supabase, "api.inspections.anomalies.photos.post.db_insert", error, {
      inspectionId: params.id,
      anomalyId: params.anomalyId,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  return NextResponse.json({ photo: { ...data, url: signed?.signedUrl ?? null } }, { status: 201 });
}
