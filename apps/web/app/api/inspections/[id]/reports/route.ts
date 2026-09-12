import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase-server";
import { renderHtmlToPdf } from "@/lib/pdf";
import { buildReportHtml, type ReportAnomalyInput } from "@/lib/reportTemplate";
import { logError } from "@/lib/errorLog";
import { SEVERITY_LABELS, type Severity } from "@projeto-laudo/shared";

export const dynamic = "force-dynamic";

/**
 * RF-10/RF-11/RF-14 — laudos gerados a partir de uma vistoria.
 * Uma vistoria pode ter mais de um laudo (reemissão/nova versão sem custo — RF-14).
 *
 * GET  /api/inspections/:id/reports  -> lista as versões de laudo já geradas
 * POST /api/inspections/:id/reports  -> cria uma nova versão + gera a planilha (.xlsx) e o PDF
 *   body: { artNumber?: string }
 *
 * PDF (decisão a5) gerado com Chromium headless local (puppeteer), não um
 * serviço gerenciado externo — ver nota em lib/pdf.ts.
 */

const REPORTS_BUCKET = "reports";
const ANOMALY_PHOTOS_BUCKET = "anomaly-photos";

type SupabaseServerClient = ReturnType<typeof createClient>;

async function photoToDataUri(supabase: SupabaseServerClient, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(ANOMALY_PHOTOS_BUCKET).download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  const ext = path.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function buildActionSheet(reportNumber: string, anomalies: Array<{
  code: string | null;
  environment: string;
  system_type: string;
  description: string;
  severity: string;
  treatment_recommendation: string;
}>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Planilha de ação");

  sheet.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Ambiente", key: "environment", width: 30 },
    { header: "Sistema construtivo", key: "system_type", width: 28 },
    { header: "Descrição da anomalia", key: "description", width: 40 },
    { header: "Severidade", key: "severity", width: 14 },
    { header: "Tratamento recomendado", key: "treatment_recommendation", width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const a of anomalies) {
    sheet.addRow({
      code: a.code,
      environment: a.environment,
      system_type: a.system_type,
      description: a.description,
      severity: SEVERITY_LABELS[a.severity as Severity] ?? a.severity,
      treatment_recommendation: a.treatment_recommendation,
    });
  }

  sheet.getColumn("description").alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn("treatment_recommendation").alignment = { wrapText: true, vertical: "top" };

  return workbook.xlsx.writeBuffer();
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, version, report_number, art_number, status, pdf_url, excel_url, share_token, share_enabled, created_at"
    )
    .eq("inspection_id", params.id)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withSignedUrls = await Promise.all(
    (data ?? []).map(async (report) => {
      const [excelSigned, pdfSigned] = await Promise.all([
        report.excel_url
          ? supabase.storage.from(REPORTS_BUCKET).createSignedUrl(report.excel_url, 60 * 60)
          : Promise.resolve({ data: null }),
        report.pdf_url
          ? supabase.storage.from(REPORTS_BUCKET).createSignedUrl(report.pdf_url, 60 * 60)
          : Promise.resolve({ data: null }),
      ]);
      return {
        ...report,
        excel_signed_url: excelSigned.data?.signedUrl ?? null,
        pdf_signed_url: pdfSigned.data?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ reports: withSignedUrls });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", params.id);

  const nextVersion = (count ?? 0) + 1;
  const year = new Date().getFullYear();
  const shortId = params.id.slice(0, 4);
  const reportNumber = `${year}-${shortId}${nextVersion > 1 ? `-v${nextVersion}` : ""}`;

  const { data: anomalies, error: anomaliesError } = await supabase
    .from("anomalies")
    .select(
      "code, environment, system_type, description, severity, treatment_recommendation, anomaly_photos(storage_path, caption)"
    )
    .eq("inspection_id", params.id)
    .order("created_at", { ascending: true });

  if (anomaliesError) return NextResponse.json({ error: anomaliesError.message }, { status: 500 });

  const { data: inspection, error: inspectionError } = await supabase
    .from("inspections")
    .select("inspection_type, responsible_id, buildings(name, address, floors, clients(name))")
    .eq("id", params.id)
    .single();

  if (inspectionError || !inspection) {
    return NextResponse.json(
      { error: inspectionError?.message ?? "Vistoria não encontrada." },
      { status: 404 }
    );
  }

  const building = Array.isArray(inspection.buildings) ? inspection.buildings[0] : inspection.buildings;
  const client = building ? (Array.isArray(building.clients) ? building.clients[0] : building.clients) : null;

  const { data: responsible } = await supabase
    .from("profiles")
    .select("full_name, crea")
    .eq("id", inspection.responsible_id)
    .single();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      inspection_id: params.id,
      version: nextVersion,
      report_number: reportNumber,
      art_number: body?.artNumber ?? null,
      status: "rascunho",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const excelBuffer = await buildActionSheet(reportNumber, anomalies ?? []);
  const excelPath = `${params.id}/${data.id}.xlsx`;

  const { error: uploadError } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(excelPath, excelBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

  const notes: string[] = [];
  const updates: { excel_url?: string; pdf_url?: string; status?: string; generated_at?: string } = {};

  if (uploadError) {
    notes.push(`Planilha falhou: ${uploadError.message}`);
    await logError(supabase, "api.inspections.reports.post.excel", uploadError, {
      inspectionId: params.id,
      reportId: data.id,
    });
  } else {
    updates.excel_url = excelPath;
  }

  try {
    const anomaliesForPdf: ReportAnomalyInput[] = await Promise.all(
      (anomalies ?? []).map(async (a) => {
        const photos = await Promise.all(
          (a.anomaly_photos ?? []).map(async (p) => ({
            dataUri: await photoToDataUri(supabase, p.storage_path),
            caption: p.caption,
          }))
        );
        return {
          code: a.code,
          environment: a.environment,
          system_type: a.system_type,
          description: a.description,
          severity: a.severity as Severity,
          treatment_recommendation: a.treatment_recommendation,
          photos: photos.filter(
            (p): p is { dataUri: string; caption: string | null } => p.dataUri !== null
          ),
        };
      })
    );

    const html = buildReportHtml({
      reportNumber,
      artNumber: body?.artNumber ?? null,
      version: nextVersion,
      generatedAt: new Date(),
      inspectionType: inspection.inspection_type,
      clientName: client?.name ?? "Cliente não identificado",
      buildingName: building?.name ?? "Edificação não identificada",
      buildingAddress: building?.address ?? "—",
      buildingFloors: building?.floors ?? null,
      responsibleName: responsible?.full_name ?? "—",
      responsibleCrea: responsible?.crea ?? null,
      anomalies: anomaliesForPdf,
    });

    const pdfBuffer = await renderHtmlToPdf(html);
    const pdfPath = `${params.id}/${data.id}.pdf`;

    const { error: pdfUploadError } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf" });

    if (pdfUploadError) {
      notes.push(`PDF falhou: ${pdfUploadError.message}`);
      await logError(supabase, "api.inspections.reports.post.pdf_upload", pdfUploadError, {
        inspectionId: params.id,
        reportId: data.id,
      });
    } else {
      updates.pdf_url = pdfPath;
    }
  } catch (pdfError) {
    notes.push(`PDF falhou: ${pdfError instanceof Error ? pdfError.message : "erro desconhecido"}`);
    await logError(supabase, "api.inspections.reports.post.pdf_render", pdfError, {
      inspectionId: params.id,
      reportId: data.id,
    });
  }

  if (updates.excel_url || updates.pdf_url) {
    updates.status = "gerado";
    updates.generated_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("reports")
    .update(updates)
    .eq("id", data.id)
    .select()
    .single();

  if (updateError) {
    notes.push(`Falhou salvar as referências geradas: ${updateError.message}`);
  }

  const finalReport = updated ?? data;
  const [excelSigned, pdfSigned] = await Promise.all([
    finalReport.excel_url
      ? supabase.storage.from(REPORTS_BUCKET).createSignedUrl(finalReport.excel_url, 60 * 60)
      : Promise.resolve({ data: null }),
    finalReport.pdf_url
      ? supabase.storage.from(REPORTS_BUCKET).createSignedUrl(finalReport.pdf_url, 60 * 60)
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json(
    {
      report: {
        ...finalReport,
        excel_signed_url: excelSigned.data?.signedUrl ?? null,
        pdf_signed_url: pdfSigned.data?.signedUrl ?? null,
      },
      note: notes.length > 0 ? notes.join(" ") : "Laudo gerado: planilha de ação (.xlsx) e PDF.",
    },
    { status: 201 }
  );
}
