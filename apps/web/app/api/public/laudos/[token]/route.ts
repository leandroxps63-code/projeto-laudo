import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@projeto-laudo/shared";
import { logError } from "@/lib/errorLog";

/**
 * RF-11 — acesso público (sem login) a um laudo compartilhado via token.
 * GET /api/public/laudos/:token
 *
 * Usa a chave anônima (nunca a service role) — a segurança vem da RPC
 * `get_shared_report`, que só retorna dado quando o token bate e o
 * compartilhamento está ativo, e da policy de storage que só libera o
 * arquivo nesse mesmo caso. Sem o token exato, nada é acessível.
 */

const REPORTS_BUCKET = "reports";

// idem app/laudos/compartilhado/[token]/page.tsx — nunca cachear.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  // Ver comentário equivalente em app/laudos/compartilhado/[token]/page.tsx —
  // sem "cache: no-store", o fetch global patchado pelo Next.js serviria um
  // estado antigo do laudo (data cache em disco, sobrevive a restart).
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );

  const { data, error } = await supabase.rpc("get_shared_report", { p_token: params.token });

  if (error) {
    await logError(supabase, "api.public.laudos.get", error, { token: params.token });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const report = data?.[0];
  if (!report) {
    return NextResponse.json({ error: "Link inválido, expirado ou desativado." }, { status: 404 });
  }

  const [excelSigned, pdfSigned] = await Promise.all([
    report.excel_path
      ? supabase.storage.from(REPORTS_BUCKET).createSignedUrl(report.excel_path, 60 * 10)
      : Promise.resolve({ data: null }),
    report.pdf_path
      ? supabase.storage.from(REPORTS_BUCKET).createSignedUrl(report.pdf_path, 60 * 10)
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    report: {
      ...report,
      excel_signed_url: excelSigned.data?.signedUrl ?? null,
      pdf_signed_url: pdfSigned.data?.signedUrl ?? null,
    },
  });
}
