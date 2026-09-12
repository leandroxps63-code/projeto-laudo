import { SEVERITY_LABELS, type Severity } from "@projeto-laudo/shared";

export type ReportPhotoInput = { dataUri: string; caption: string | null };

export type ReportAnomalyInput = {
  code: string | null;
  environment: string;
  system_type: string;
  description: string;
  treatment_recommendation: string;
  severity: Severity;
  photos: ReportPhotoInput[];
};

export type ReportTemplateInput = {
  reportNumber: string;
  artNumber: string | null;
  version: number;
  generatedAt: Date;
  inspectionType: string;
  clientName: string;
  buildingName: string;
  buildingAddress: string;
  buildingFloors: number | null;
  responsibleName: string;
  responsibleCrea: string | null;
  anomalies: ReportAnomalyInput[];
};

const SEVERITY_COLORS: Record<Severity, { bg: string; fg: string }> = {
  baixa: { bg: "#e2efe8", fg: "#2f7d5c" },
  media: { bg: "#f8ecdb", fg: "#c9862a" },
  alta: { bg: "#fbe8e6", fg: "#c0392b" },
  critica: { bg: "#fbe8e6", fg: "#c0392b" },
};

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Monta o HTML do laudo (cabeçalho, dados da edificação, anomalias com
 * foto/tratamento/severidade, resumo consolidado, assinatura) — vira PDF
 * via `renderHtmlToPdf` (lib/pdf.ts). Fontes web-safe de propósito: o
 * puppeteer roda sem garantia de rede pra baixar Google Fonts.
 */
export function buildReportHtml(input: ReportTemplateInput): string {
  const severityCounts = input.anomalies.reduce<Partial<Record<Severity, number>>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] ?? 0) + 1;
    return acc;
  }, {});

  const anomaliesHtml = input.anomalies
    .map((a, i) => {
      const colors = SEVERITY_COLORS[a.severity];
      const photosHtml = a.photos
        .map(
          (p) => `
        <figure class="photo">
          <img src="${p.dataUri}" />
          ${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ""}
        </figure>`
        )
        .join("");

      return `
      <section class="anomaly">
        <div class="anomaly-header">
          <span class="anomaly-code">${escapeHtml(a.code ?? `AN-${String(i + 1).padStart(3, "0")}`)}</span>
          <span class="severity-badge" style="background:${colors.bg};color:${colors.fg}">${SEVERITY_LABELS[a.severity]}</span>
        </div>
        <div class="anomaly-meta">${escapeHtml(a.environment)} · ${escapeHtml(a.system_type)}</div>
        <p class="anomaly-desc">${escapeHtml(a.description)}</p>
        <p class="anomaly-treatment"><strong>Tratamento recomendado:</strong> ${escapeHtml(a.treatment_recommendation)}</p>
        ${photosHtml ? `<div class="photos">${photosHtml}</div>` : ""}
      </section>`;
    })
    .join("");

  const summaryRows = (["critica", "alta", "media", "baixa"] as Severity[])
    .filter((s) => severityCounts[s])
    .map((s) => `<tr><td>${SEVERITY_LABELS[s]}</td><td>${severityCounts[s]}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #171b1f; font-size: 12px; margin: 0; }
  h1, h2 { font-family: Arial, Helvetica, sans-serif; }
  header.report-header { border-bottom: 3px solid #205e73; padding-bottom: 12px; margin-bottom: 20px; }
  header.report-header h1 { font-size: 20px; color: #205e73; margin: 0 0 4px; }
  header.report-header .subtitle { font-size: 11px; color: #6b7176; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 24px; font-size: 11.5px; }
  .meta-grid dt { font-weight: 700; color: #6b7176; }
  .meta-grid dd { margin: 0; }
  h2.section-title { font-size: 14px; color: #205e73; border-bottom: 1.3px solid #e1ddd2; padding-bottom: 4px; margin: 24px 0 12px; }
  section.anomaly { page-break-inside: avoid; border: 1px solid #e1ddd2; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
  .anomaly-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .anomaly-code { font-family: 'Courier New', monospace; color: #9a9d93; font-weight: 700; font-size: 11px; }
  .severity-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px; }
  .anomaly-meta { font-size: 11px; color: #6b7176; margin-bottom: 6px; }
  .anomaly-desc { margin: 0 0 6px; }
  .anomaly-treatment { margin: 0; font-size: 11.5px; }
  .photos { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .photo { margin: 0; width: 140px; }
  .photo img { width: 140px; height: 105px; object-fit: cover; border-radius: 4px; border: 1px solid #e1ddd2; }
  .photo figcaption { font-size: 9.5px; color: #9a9d93; margin-top: 2px; }
  table.summary { border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  table.summary td { border: 1px solid #e1ddd2; padding: 6px 14px; }
  .signature { margin-top: 60px; text-align: center; }
  .signature .line { border-top: 1px solid #171b1f; width: 280px; margin: 0 auto 6px; }
</style>
</head>
<body>
  <header class="report-header">
    <h1>Laudo de Inspeção Predial</h1>
    <div class="subtitle">${escapeHtml(input.inspectionType)} · Laudo nº ${escapeHtml(input.reportNumber)}${input.version > 1 ? ` (v${input.version})` : ""}</div>
  </header>

  <dl class="meta-grid">
    <dt>Cliente</dt><dd>${escapeHtml(input.clientName)}</dd>
    <dt>Edificação</dt><dd>${escapeHtml(input.buildingName)}</dd>
    <dt>Endereço</dt><dd>${escapeHtml(input.buildingAddress)}</dd>
    <dt>Pavimentos</dt><dd>${input.buildingFloors ?? "—"}</dd>
    <dt>Responsável técnico</dt><dd>${escapeHtml(input.responsibleName)}</dd>
    <dt>CREA</dt><dd>${input.responsibleCrea ? escapeHtml(input.responsibleCrea) : "—"}</dd>
    <dt>ART</dt><dd>${input.artNumber ? escapeHtml(input.artNumber) : "—"}</dd>
    <dt>Data de emissão</dt><dd>${input.generatedAt.toLocaleDateString("pt-BR")}</dd>
  </dl>

  <h2 class="section-title">Anomalias identificadas (${input.anomalies.length})</h2>
  ${anomaliesHtml || "<p>Nenhuma anomalia registrada nesta vistoria.</p>"}

  <h2 class="section-title">Resumo consolidado</h2>
  <table class="summary">
    <tbody>${summaryRows || '<tr><td colspan="2">Nenhuma anomalia.</td></tr>'}</tbody>
  </table>

  <div class="signature">
    <div class="line"></div>
    <div>${escapeHtml(input.responsibleName)}</div>
    <div>${input.responsibleCrea ? `CREA ${escapeHtml(input.responsibleCrea)}` : ""}</div>
  </div>
</body>
</html>`;
}
