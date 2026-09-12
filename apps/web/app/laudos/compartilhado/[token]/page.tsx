import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@projeto-laudo/shared";

const REPORTS_BUCKET = "reports";

// A cada acesso o compartilhamento pode ter sido ativado/desativado, e a
// signed URL sempre precisa ser gerada na hora (expira em 10min) — nunca
// cachear esta rota.
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  gerado: "Gerado",
  entregue: "Entregue",
};

/**
 * RF-11 — página pública de um laudo compartilhado, sem exigir login.
 * Acesso só é possível com o token exato do link (capability URL).
 */
export default async function LaudoCompartilhadoPage({ params }: { params: { token: string } }) {
  // O Next.js intercepta globalmente todo fetch() (inclusive os que o
  // supabase-js faz por baixo), e por padrão cacheia em disco entre
  // requisições — mesmo com "dynamic = force-dynamic" no route segment.
  // Sem "cache: no-store" aqui, esta página serviria um estado antigo do
  // laudo (ex: compartilhamento já desativado continuaria acessível).
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );

  const { data } = await supabase.rpc("get_shared_report", { p_token: params.token });
  const report = data?.[0];

  if (!report) {
    return (
      <main style={{ maxWidth: 420, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 8 }}>Link indisponível</h1>
        <p style={{ color: "#6b7176", fontSize: "0.9rem" }}>
          Esse link de laudo é inválido, expirou ou foi desativado por quem o compartilhou.
        </p>
      </main>
    );
  }

  let excelSignedUrl: string | null = null;
  if (report.excel_path) {
    const { data: signed } = await supabase.storage
      .from(REPORTS_BUCKET)
      .createSignedUrl(report.excel_path, 60 * 10);
    excelSignedUrl = signed?.signedUrl ?? null;
  }

  let pdfSignedUrl: string | null = null;
  if (report.pdf_path) {
    const { data: signed } = await supabase.storage
      .from(REPORTS_BUCKET)
      .createSignedUrl(report.pdf_path, 60 * 10);
    pdfSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <main style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#205e73", marginBottom: 6 }}>
        LAUDO DE INSPEÇÃO PREDIAL
      </p>
      <h1 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 4 }}>{report.building_name}</h1>
      <p style={{ color: "#6b7176", fontSize: "0.85rem", marginBottom: 20 }}>{report.building_address}</p>

      <div style={{ border: "1px solid #e1ddd2", borderRadius: 11, padding: 18 }}>
        <Row label="Nº do laudo" value={report.report_number} />
        <Row label="Versão" value={String(report.version)} />
        <Row label="Status" value={STATUS_LABELS[report.status] ?? report.status} />
        {report.art_number && <Row label="ART" value={report.art_number} />}
        <Row
          label="Gerado em"
          value={new Date(report.generated_at ?? report.created_at).toLocaleDateString("pt-BR")}
        />
      </div>

      {pdfSignedUrl ? (
        <a
          href={pdfSignedUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 20,
            padding: 13,
            borderRadius: 10,
            background: "#205e73",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Baixar laudo (PDF)
        </a>
      ) : (
        <p style={{ color: "#9a9d93", fontSize: "0.82rem", marginTop: 16 }}>
          PDF ainda não disponível para este laudo.
        </p>
      )}

      {excelSignedUrl ? (
        <a
          href={excelSignedUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 10,
            padding: 13,
            borderRadius: 10,
            border: "1.3px solid #205e73",
            color: "#205e73",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Baixar planilha de ação (.xlsx)
        </a>
      ) : (
        <p style={{ color: "#9a9d93", fontSize: "0.82rem", marginTop: 10 }}>
          Planilha ainda não disponível para este laudo.
        </p>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "0.85rem" }}>
      <span style={{ color: "#6b7176" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
