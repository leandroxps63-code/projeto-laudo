"use client";

import { useEffect, useState, useCallback } from "react";
import { SEVERITY_LABELS, type Severity } from "@projeto-laudo/shared";
import PhotoMarkupModal from "../../components/PhotoMarkupModal";
import { fetchAuthed } from "@/lib/fetchAuthed";

type CatalogEntry = {
  id: string;
  category: string;
  description: string;
  system_type: string;
  default_severity: Severity;
  treatment_recommendation: string;
};

type Anomaly = {
  id: string;
  code: string | null;
  environment: string;
  system_type: string;
  description: string;
  treatment_recommendation: string;
  severity: Severity;
  anomaly_photos?: { id: string }[];
};

type Report = {
  id: string;
  version: number;
  report_number: string;
  status: string;
  excel_signed_url: string | null;
  pdf_signed_url: string | null;
  share_token: string;
  share_enabled: boolean;
  created_at: string;
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  gerado: "Gerado",
  entregue: "Entregue",
};

/**
 * Detalhe da vistoria — lista de anomalias + formulário de registro com
 * sugestão automática do banco de anomalias (RF-07) + geração de laudo.
 * Telas de referência: protótipo clicável, telas "s-anom" e "s-preview".
 */
export default function VistoriaDetailPage({ params }: { params: { id: string } }) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [environment, setEnvironment] = useState("");
  const [systemType, setSystemType] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [treatment, setTreatment] = useState("");
  const [severity, setSeverity] = useState<Severity>("media");
  const [photo, setPhoto] = useState<File | null>(null);
  const [rawPhoto, setRawPhoto] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [manualLinkReportId, setManualLinkReportId] = useState<string | null>(null);
  const [togglingShareId, setTogglingShareId] = useState<string | null>(null);

  const loadAnomalies = useCallback(async () => {
    setLoadingList(true);
    const res = await fetchAuthed(`/api/inspections/${params.id}/anomalies`);
    const data = await res.json();
    if (res.ok) setAnomalies(data.anomalies);
    setLoadingList(false);
  }, [params.id]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const res = await fetchAuthed(`/api/inspections/${params.id}/reports`);
    const data = await res.json();
    if (res.ok) setReports(data.reports);
    setLoadingReports(false);
  }, [params.id]);

  useEffect(() => {
    loadAnomalies();
    loadReports();
  }, [loadAnomalies, loadReports]);

  useEffect(() => {
    if (!query || (selected && selected.description === query)) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetchAuthed(`/api/anomaly-catalog?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) setSuggestions(data.catalog);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  function pickSuggestion(entry: CatalogEntry) {
    setSelected(entry);
    setQuery(entry.description);
    setSeverity(entry.default_severity);
    setTreatment(entry.treatment_recommendation);
    setSuggestions([]);
  }

  async function handleAddAnomaly() {
    if (!environment || !systemType || !query || !treatment) {
      setError(
        "Preencha ambiente, sistema construtivo, a descrição da anomalia e o tratamento recomendado."
      );
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetchAuthed(`/api/inspections/${params.id}/anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        environment,
        systemType,
        description: selected?.description ?? query,
        treatmentRecommendation: treatment,
        severity,
        catalogId: selected?.id,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Falha ao registrar anomalia.");
      setSaving(false);
      return;
    }

    if (photo) {
      const photoForm = new FormData();
      photoForm.append("file", photo);
      const photoRes = await fetchAuthed(
        `/api/inspections/${params.id}/anomalies/${data.anomaly.id}/photos`,
        { method: "POST", body: photoForm }
      );
      if (!photoRes.ok) {
        const photoData = await photoRes.json().catch(() => ({}));
        setError(`Anomalia salva, mas a foto falhou: ${photoData.error ?? "erro desconhecido."}`);
      }
    }

    setEnvironment("");
    setSystemType("");
    setQuery("");
    setSelected(null);
    setTreatment("");
    setSeverity("media");
    setPhoto(null);
    setRawPhoto(null);
    setFileInputKey((k) => k + 1);
    setSaving(false);
    loadAnomalies();
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setReportMessage("Gerando…");
    const res = await fetchAuthed(`/api/inspections/${params.id}/reports`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setReportMessage(data.note ?? null);
      loadReports();
    } else {
      setReportMessage(data.error ?? "Falha ao gerar laudo.");
    }
    setGeneratingReport(false);
  }

  async function handleToggleShare(report: Report) {
    setTogglingShareId(report.id);
    const res = await fetchAuthed(`/api/inspections/${params.id}/reports/${report.id}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !report.share_enabled }),
    });
    if (res.ok) {
      setReports((rs) =>
        rs.map((r) => (r.id === report.id ? { ...r, share_enabled: !report.share_enabled } : r))
      );
    }
    setTogglingShareId(null);
  }

  async function handleCopyLink(report: Report) {
    const url = `${window.location.origin}/laudos/compartilhado/${report.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedReportId(report.id);
      setManualLinkReportId(null);
      setTimeout(() => setCopiedReportId(null), 2000);
    } catch {
      setManualLinkReportId(report.id);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 20 }}>
        Anomalias da vistoria
      </h1>

      {/* ---- lista ---- */}
      {loadingList ? (
        <p style={{ color: "#6b7176" }}>Carregando…</p>
      ) : anomalies.length === 0 ? (
        <p style={{ color: "#6b7176", marginBottom: 24 }}>Nenhuma anomalia registrada ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
          {anomalies.map((a) => (
            <li
              key={a.id}
              style={{
                borderTop: "1px solid #e1ddd2",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  <span style={{ fontFamily: "monospace", color: "#9a9d93" }}>{a.code}</span>{" "}
                  {a.description}
                </div>
                <div style={{ fontSize: 12, color: "#6b7176" }}>
                  {a.environment} · {a.system_type}
                  {a.anomaly_photos && a.anomaly_photos.length > 0 && (
                    <> · 📷 {a.anomaly_photos.length}</>
                  )}
                </div>
              </div>
              <SeverityChip severity={a.severity} />
            </li>
          ))}
        </ul>
      )}

      {/* ---- formulário ---- */}
      <div style={{ border: "1px solid #e1ddd2", borderRadius: 11, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>Nova anomalia</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            placeholder="Ambiente (ex: Fachada norte — 3º pavimento)"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Sistema construtivo (ex: Vedação/impermeabilização)"
            value={systemType}
            onChange={(e) => setSystemType(e.target.value)}
            style={inputStyle}
          />
          <div style={{ position: "relative" }}>
            <input
              placeholder="Buscar no banco de anomalias (ex: infiltração)…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              style={inputStyle}
            />
            {suggestions.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #e1ddd2",
                  borderRadius: 8,
                  marginTop: 4,
                  listStyle: "none",
                  padding: 4,
                  zIndex: 10,
                }}
              >
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => pickSuggestion(s)}
                    style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13 }}
                  >
                    <b>{s.description}</b> — {SEVERITY_LABELS[s.default_severity]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>
              Tratamento recomendado
              {selected ? " (sugerido pelo banco de anomalias — pode ajustar)" : ""}
            </span>
            <textarea
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ex: Selagem com massa elástica após monitoramento de abertura por 60 dias."
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>
              Foto (opcional)
            </span>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setRawPhoto(e.target.files?.[0] ?? null)}
              style={{ fontSize: 12.5 }}
            />
            {photo && (
              <span style={{ fontSize: 11.5, color: "#2f7d5c" }}>
                Foto pronta pra envio{photo !== rawPhoto ? " (com marcação)" : ""}.
              </span>
            )}
          </label>

          <div style={{ display: "flex", gap: 6 }}>
            {(["baixa", "media", "alta", "critica"] as Severity[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  borderRadius: 8,
                  border: `1.3px solid ${severity === s ? "#205e73" : "#c9c3b4"}`,
                  background: severity === s ? "#e4eff1" : "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  color: severity === s ? "#143f4d" : "#6b7176",
                  cursor: "pointer",
                }}
              >
                {SEVERITY_LABELS[s]}
              </button>
            ))}
          </div>

          {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}

          <button
            type="button"
            onClick={handleAddAnomaly}
            disabled={saving}
            style={{
              padding: 12,
              borderRadius: 9,
              border: "none",
              background: "#205e73",
              color: "#fff",
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Registrar anomalia"}
          </button>
        </div>
      </div>

      {/* ---- gerar laudo ---- */}
      <button
        type="button"
        onClick={handleGenerateReport}
        disabled={generatingReport}
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 10,
          border: "none",
          background: "#f2540b",
          color: "#fff",
          fontWeight: 700,
          cursor: generatingReport ? "default" : "pointer",
          opacity: generatingReport ? 0.7 : 1,
        }}
      >
        {generatingReport ? "Gerando…" : "Gerar laudo"}
      </button>
      {reportMessage && <p style={{ fontSize: 12.5, color: "#6b7176", margin: "8px 0 0" }}>{reportMessage}</p>}

      {/* ---- laudos gerados ---- */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 10 }}>Laudos gerados</h2>
        {loadingReports ? (
          <p style={{ color: "#6b7176", fontSize: 13 }}>Carregando…</p>
        ) : reports.length === 0 ? (
          <p style={{ color: "#9a9d93", fontSize: 13 }}>Nenhum laudo gerado ainda.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map((report) => (
              <li key={report.id} style={{ border: "1px solid #e1ddd2", borderRadius: 11, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {report.report_number}{" "}
                      <span style={{ color: "#9a9d93", fontWeight: 400 }}>v{report.version}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6b7176" }}>
                      {REPORT_STATUS_LABELS[report.status] ?? report.status} ·{" "}
                      {new Date(report.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {report.pdf_signed_url && (
                      <a
                        href={report.pdf_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: "#205e73", fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        Baixar PDF
                      </a>
                    )}
                    {report.excel_signed_url && (
                      <a
                        href={report.excel_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: "#205e73", fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        Baixar .xlsx
                      </a>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid #f0ede4",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7176" }}>
                    <input
                      type="checkbox"
                      checked={report.share_enabled}
                      disabled={togglingShareId === report.id}
                      onChange={() => handleToggleShare(report)}
                    />
                    Link público ativo
                  </label>

                  {report.share_enabled && (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(report)}
                      style={{
                        background: "none",
                        border: "1.3px solid #c9c3b4",
                        borderRadius: 7,
                        padding: "4px 10px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "#205e73",
                        cursor: "pointer",
                      }}
                    >
                      {copiedReportId === report.id ? "Link copiado!" : "Copiar link de compartilhamento"}
                    </button>
                  )}
                </div>

                {manualLinkReportId === report.id && (
                  <p style={{ fontSize: 11, color: "#6b7176", marginTop: 8, wordBreak: "break-all" }}>
                    Não foi possível copiar automaticamente. Link:{" "}
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/laudos/compartilhado/${report.share_token}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PhotoMarkupModal
        file={rawPhoto}
        onConfirm={(markedFile) => setPhoto(markedFile)}
        onClose={() => setRawPhoto(null)}
      />
    </main>
  );
}

function SeverityChip({ severity }: { severity: Severity }) {
  const colors: Record<Severity, { bg: string; fg: string }> = {
    baixa: { bg: "#e2efe8", fg: "#2f7d5c" },
    media: { bg: "#f8ecdb", fg: "#c9862a" },
    alta: { bg: "#fbe8e6", fg: "#c0392b" },
    critica: { bg: "#fbe8e6", fg: "#c0392b" },
  };
  const c = colors[severity];
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 100,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
        height: "fit-content",
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 11,
  borderRadius: 9,
  border: "1.3px solid #c9c3b4",
  width: "100%",
};
