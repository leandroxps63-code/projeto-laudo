import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/inspections/:id/previous -> a vistoria anterior mais recente na
 * MESMA edificação (se existir alguma com anomalia registrada), pra
 * oferecer "copiar como ponto de partida" numa reinspeção. Null se não há
 * nenhuma outra vistoria com anomalia nessa edificação.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: current, error: currentError } = await supabase
    .from("inspections")
    .select("building_id")
    .eq("id", params.id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: currentError?.message ?? "Vistoria não encontrada." }, { status: 404 });
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("inspections")
    .select("id, created_at, anomalies(id)")
    .eq("building_id", current.building_id)
    .neq("id", params.id)
    .order("created_at", { ascending: false });

  if (candidatesError) return NextResponse.json({ error: candidatesError.message }, { status: 500 });

  const previous = (candidates ?? []).find((c) => (c.anomalies?.length ?? 0) > 0);

  if (!previous) {
    return NextResponse.json({ previous: null });
  }

  return NextResponse.json({
    previous: {
      id: previous.id,
      createdAt: previous.created_at,
      anomaliesCount: previous.anomalies?.length ?? 0,
    },
  });
}
