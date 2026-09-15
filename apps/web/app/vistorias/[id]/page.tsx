"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SEVERITY_LABELS, type Severity } from "@projeto-laudo/shared";
import PhotoMarkupModal from "../../components/PhotoMarkupModal";
import { fetchAuthed, SESSION_EXPIRED_MESSAGE } from "@/lib/fetchAuthed";
import {
  colors,
  fontMono,
  headingStyle,
  labelStyle,
  inputStyle,
  cardStyle,
  errorTextStyle,
} from "@/lib/theme";

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [pendingPhotoQueue, setPendingPhotoQueue] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [artNumber, setArtNumber] = useState("");
  const [profileCrea, setProfileCrea] = useState<string | null | undefined>(undefined);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [manualLinkReportId, setManualLinkReportId] = useState<string | null>(null);
  const [togglingShareId, setTogglingShareId] = useState<string | null>(null);

  const [inspectionType, setInspectionType] = useState<string | null>(null);
  const [savingType, setSavingType] = useState(false);

  const [previousInspection, setPreviousInspection] = useState<{
    id: string;
    createdAt: string;
    anomaliesCount: number;
  } | null>(null);
  const [reinspectionDismissed, setReinspectionDismissed] = useState(false);
  const [copyingAnomalies, setCopyingAnomalies] = useState(false);

  const loadAnomalies = useCallback(async () => {
    setLoadingList(true);
    const res = await fetchAuthed(`/api/inspections/${params.id}/anomalies`);
    if (res.status === 401) {
      setSessionExpired(true);
      setLoadingList(false);
      return;
    }
    const data = await res.json();
    if (res.ok) setAnomalies(data.anomalies);
    setLoadingList(false);
  }, [params.id]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const res = await fetchAuthed(`/api/inspections/${params.id}/reports`);
    if (res.status === 401) {
      setSessionExpired(true);
      setLoadingReports(false);
      return;
    }
    const data = await res.json();
    if (res.ok) setReports(data.reports);
    setLoadingReports(false);
  }, [params.id]);

  useEffect(() => {
    loadAnomalies();
    loadReports();
  }, [loadAnomalies, loadReports]);

  useEffect(() => {
    fetchAuthed("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfileCrea(data?.profile?.crea ?? null))
      .catch(() => setProfileCrea(null));
  }, []);

  useEffect(() => {
    fetchAuthed(`/api/inspections/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInspectionType(data?.inspection?.inspection_type ?? null))
      .catch(() => setInspectionType(null));
  }, [params.id]);

  async function handleChangeInspectionType(newType: string) {
    setSavingType(true);
    const res = await fetchAuthed(`/api/inspections/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionType: newType }),
    });
    if (res.ok) setInspectionType(newType);
    if (res.status === 401) setSessionExpired(true);
    setSavingType(false);
  }

  useEffect(() => {
    fetchAuthed(`/api/inspections/${params.id}/previous`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPreviousInspection(data?.previous ?? null))
      .catch(() => setPreviousInspection(null));
  }, [params.id]);

  async function handleCopyAnomalies() {
    if (!previousInspection) return;
    setCopyingAnomalies(true);
    setError(null);

    const res = await fetchAuthed(`/api/inspections/${params.id}/copy-anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromInspectionId: previousInspection.id }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) setSessionExpired(true);
      setError(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error ?? "Falha ao copiar anomalias.");
      setCopyingAnomalies(false);
      return;
    }

    setCopyingAnomalies(false);
    setReinspectionDismissed(true);
    loadAnomalies();
  }

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
      if (res.status === 401) setSessionExpired(true);
      setError(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error ?? "Falha ao registrar anomalia.");
      setSaving(false);
      return;
    }

    let photoFailures = 0;
    let photoSessionExpired = false;
    for (const file of photos) {
      const photoForm = new FormData();
      photoForm.append("file", file);
      const photoRes = await fetchAuthed(
        `/api/inspections/${params.id}/anomalies/${data.anomaly.id}/photos`,
        { method: "POST", body: photoForm }
      );
      if (!photoRes.ok) {
        photoFailures++;
        if (photoRes.status === 401) photoSessionExpired = true;
      }
    }
    if (photoSessionExpired) setSessionExpired(true);
    if (photoFailures > 0) {
      setError(
        photoSessionExpired
          ? `Anomalia salva, mas as fotos falharam: ${SESSION_EXPIRED_MESSAGE}`
          : `Anomalia salva, mas ${photoFailures} de ${photos.length} foto(s) falharam ao enviar.`
      );
    }

    setEnvironment("");
    setSystemType("");
    setQuery("");
    setSelected(null);
    setTreatment("");
    setSeverity("media");
    setPhotos([]);
    setPendingPhotoQueue([]);
    setFileInputKey((k) => k + 1);
    setSaving(false);
    loadAnomalies();
  }

  function startEdit(a: Anomaly) {
    setEditingId(a.id);
    setEditingCode(a.code);
    setEnvironment(a.environment);
    setSystemType(a.system_type);
    setSelected(null);
    setQuery(a.description);
    setTreatment(a.treatment_recommendation);
    setSeverity(a.severity);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingCode(null);
    setEnvironment("");
    setSystemType("");
    setQuery("");
    setSelected(null);
    setTreatment("");
    setSeverity("media");
    setError(null);
  }

  async function handleUpdateAnomaly() {
    if (!editingId) return;
    if (!environment || !systemType || !query || !treatment) {
      setError(
        "Preencha ambiente, sistema construtivo, a descrição da anomalia e o tratamento recomendado."
      );
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetchAuthed(`/api/inspections/${params.id}/anomalies/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        environment,
        systemType,
        description: query,
        treatmentRecommendation: treatment,
        severity,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) setSessionExpired(true);
      setError(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error ?? "Falha ao salvar a correção.");
      setSaving(false);
      return;
    }

    setSaving(false);
    cancelEdit();
    loadAnomalies();
  }

  async function handleDeleteAnomaly() {
    if (!pendingDeleteId) return;
    setDeletingId(pendingDeleteId);
    setError(null);

    const res = await fetchAuthed(`/api/inspections/${params.id}/anomalies/${pendingDeleteId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) setSessionExpired(true);
      setError(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error ?? "Falha ao excluir.");
      setDeletingId(null);
      setPendingDeleteId(null);
      return;
    }

    if (editingId === pendingDeleteId) cancelEdit();
    setDeletingId(null);
    setPendingDeleteId(null);
    loadAnomalies();
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setReportMessage("Gerando…");
    const res = await fetchAuthed(`/api/inspections/${params.id}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artNumber: artNumber || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setReportMessage(data.note ?? null);
      loadReports();
    } else if (res.status === 401) {
      setSessionExpired(true);
      setReportMessage(SESSION_EXPIRED_MESSAGE);
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
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 6 }}>
        Anomalias da vistoria
      </h1>

      {inspectionType && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={labelStyle}>Nível</span>
          <select
            value={inspectionType}
            disabled={savingType}
            onChange={(e) => handleChangeInspectionType(e.target.value)}
            style={{
              border: `1.3px solid ${colors.pedra}`,
              borderRadius: 7,
              padding: "4px 8px",
              fontSize: 12.5,
              color: colors.tinta,
              background: colors.superficie,
              cursor: savingType ? "default" : "pointer",
            }}
          >
            <option value="NBR 16.747 — Nível I">NBR 16.747 — Nível I</option>
            <option value="NBR 16.747 — Nível II">NBR 16.747 — Nível II</option>
            <option value="NBR 16.747 — Nível III">NBR 16.747 — Nível III</option>
          </select>
        </label>
      )}

      {sessionExpired && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: colors.erroBg,
            color: colors.erro,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <span>{SESSION_EXPIRED_MESSAGE}</span>
          <Link href="/login" style={{ color: colors.erro, fontWeight: 700, whiteSpace: "nowrap" }}>
            Fazer login
          </Link>
        </div>
      )}

      {!loadingList && !sessionExpired && anomalies.length === 0 && previousInspection && !reinspectionDismissed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: colors.azulTint,
            color: colors.azulEscuro,
            fontSize: 13,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <span>
            Essa edificação já teve uma vistoria em {new Date(previousInspection.createdAt).toLocaleDateString("pt-BR")},
            com {previousInspection.anomaliesCount} anomalia(s). Quer copiar como ponto de partida da reinspeção?
          </span>
          <div style={{ display: "flex", gap: 10, whiteSpace: "nowrap" }}>
            <button
              type="button"
              onClick={handleCopyAnomalies}
              disabled={copyingAnomalies}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: colors.azulEscuro,
                fontWeight: 700,
                cursor: copyingAnomalies ? "default" : "pointer",
                textDecoration: "underline",
              }}
            >
              {copyingAnomalies ? "Copiando…" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={() => setReinspectionDismissed(true)}
              disabled={copyingAnomalies}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: colors.azulEscuro,
                opacity: 0.7,
                cursor: copyingAnomalies ? "default" : "pointer",
              }}
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* ---- lista ---- */}
      {loadingList ? (
        <p style={{ color: colors.tintaMuted }}>Carregando…</p>
      ) : sessionExpired ? null : anomalies.length === 0 ? (
        <p style={{ color: colors.tintaMuted, marginBottom: 24 }}>Nenhuma anomalia registrada ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
          {anomalies.map((a) => (
            <li
              key={a.id}
              style={{
                borderTop: `1px solid ${colors.pedra}`,
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
                opacity: editingId === a.id ? 0.6 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.tinta }}>
                  <span style={{ fontFamily: fontMono, color: colors.tintaFaint }}>{a.code}</span>{" "}
                  {a.description}
                </div>
                <div style={{ fontSize: 12, color: colors.tintaMuted }}>
                  {a.environment} · {a.system_type}
                  {a.anomaly_photos && a.anomaly_photos.length > 0 && (
                    <> · 📷 {a.anomaly_photos.length}</>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: colors.azul,
                      fontWeight: 700,
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(a.id)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: colors.erro,
                      fontWeight: 700,
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <SeverityChip severity={a.severity} />
            </li>
          ))}
        </ul>
      )}

      {/* ---- formulário ---- */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 20 }}>
        <h2 style={{ ...headingStyle, fontSize: "0.95rem", marginBottom: 12 }}>
          {editingId ? `Editando ${editingCode ?? "anomalia"}` : "Nova anomalia"}
        </h2>
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
                  background: colors.superficie,
                  border: `1px solid ${colors.pedra}`,
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
                    style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, color: colors.tinta }}
                  >
                    <b>{s.description}</b> — {SEVERITY_LABELS[s.default_severity]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelStyle}>
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

          {!editingId && (
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={labelStyle}>Fotos (opcional)</span>
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length > 0) setPendingPhotoQueue((q) => [...q, ...files]);
                }}
                style={{ fontSize: 12.5 }}
              />
              {pendingPhotoQueue.length > 0 && (
                <span style={{ fontSize: 11.5, color: colors.tintaMuted }}>
                  Marcando foto 1 de {pendingPhotoQueue.length}…
                </span>
              )}
              {photos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {photos.map((file, i) => (
                    <PhotoThumb key={i} file={file} onRemove={() => setPhotos((p) => p.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}
            </label>
          )}

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
                  border: `1.3px solid ${severity === s ? colors.azul : colors.pedra}`,
                  background: severity === s ? colors.azulTint : colors.superficie,
                  fontSize: 12,
                  fontWeight: 700,
                  color: severity === s ? colors.azulEscuro : colors.tintaMuted,
                  cursor: "pointer",
                }}
              >
                {SEVERITY_LABELS[s]}
              </button>
            ))}
          </div>

          {error && <p style={errorTextStyle}>{error}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={editingId ? handleUpdateAnomaly : handleAddAnomaly}
              disabled={saving}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 9,
                border: "none",
                background: colors.azul,
                color: "#fff",
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Salvando…" : editingId ? "Salvar correção" : "Registrar anomalia"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                style={{
                  padding: 12,
                  borderRadius: 9,
                  border: `1.3px solid ${colors.pedra}`,
                  background: colors.superficie,
                  color: colors.tintaMuted,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- gerar laudo ---- */}
      {profileCrea === null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: colors.ambarTint,
            color: "#8a5a1c",
            fontSize: 12.5,
            marginBottom: 10,
          }}
        >
          <span>Seu perfil está sem CREA — o laudo sai sem essa informação na assinatura.</span>
          <Link href="/perfil" style={{ color: "#8a5a1c", fontWeight: 700, whiteSpace: "nowrap" }}>
            Completar perfil
          </Link>
        </div>
      )}

      <input
        placeholder="Nº da ART (opcional)"
        value={artNumber}
        onChange={(e) => setArtNumber(e.target.value)}
        style={{ ...inputStyle, marginBottom: 10 }}
      />

      <button
        type="button"
        onClick={handleGenerateReport}
        disabled={generatingReport}
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 10,
          border: "none",
          background: colors.ambar,
          color: colors.azulEscuro,
          fontWeight: 700,
          cursor: generatingReport ? "default" : "pointer",
          opacity: generatingReport ? 0.7 : 1,
        }}
      >
        {generatingReport ? "Gerando…" : "Gerar laudo"}
      </button>
      {reportMessage && (
        <p style={{ fontSize: 12.5, color: colors.tintaMuted, margin: "8px 0 0" }}>{reportMessage}</p>
      )}

      {/* ---- laudos gerados ---- */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ ...headingStyle, fontSize: "0.95rem", marginBottom: 10 }}>Laudos gerados</h2>
        {loadingReports ? (
          <p style={{ color: colors.tintaMuted, fontSize: 13 }}>Carregando…</p>
        ) : sessionExpired ? null : reports.length === 0 ? (
          <p style={{ color: colors.tintaFaint, fontSize: 13 }}>Nenhum laudo gerado ainda.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map((report) => (
              <li key={report.id} style={{ ...cardStyle, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: colors.tinta }}>
                      <span style={{ fontFamily: fontMono }}>{report.report_number}</span>{" "}
                      <span style={{ color: colors.tintaFaint, fontWeight: 400 }}>v{report.version}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: colors.tintaMuted }}>
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
                        style={{ fontSize: 12, color: colors.azul, fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        Baixar PDF
                      </a>
                    )}
                    {report.excel_signed_url && (
                      <a
                        href={report.excel_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: colors.azul, fontWeight: 700, whiteSpace: "nowrap" }}
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
                    borderTop: `1px solid ${colors.pedra}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: colors.tintaMuted,
                    }}
                  >
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
                        border: `1.3px solid ${colors.pedra}`,
                        borderRadius: 7,
                        padding: "4px 10px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: colors.azul,
                        cursor: "pointer",
                      }}
                    >
                      {copiedReportId === report.id ? "Link copiado!" : "Copiar link de compartilhamento"}
                    </button>
                  )}
                </div>

                {manualLinkReportId === report.id && (
                  <p style={{ fontSize: 11, color: colors.tintaMuted, marginTop: 8, wordBreak: "break-all" }}>
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
        file={pendingPhotoQueue[0] ?? null}
        onConfirm={(markedFile) => setPhotos((p) => [...p, markedFile])}
        onClose={() => setPendingPhotoQueue((q) => q.slice(1))}
      />

      {pendingDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,20,18,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: colors.superficie,
              borderRadius: 12,
              padding: 22,
              maxWidth: 360,
              width: "90%",
              boxShadow: "0 10px 30px rgba(20,31,34,0.18)",
            }}
          >
            <p style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 6, color: colors.tinta }}>
              Excluir anomalia?
            </p>
            <p style={{ fontSize: "0.82rem", color: colors.tintaMuted, marginBottom: 18 }}>
              Essa ação apaga o registro e as fotos anexadas. Não pode ser desfeita.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                disabled={!!deletingId}
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  border: `1.3px solid ${colors.pedra}`,
                  background: colors.superficie,
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  color: colors.tinta,
                  cursor: deletingId ? "default" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAnomaly}
                disabled={!!deletingId}
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: colors.erro,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: deletingId ? "default" : "pointer",
                  opacity: deletingId ? 0.7 : 1,
                }}
              >
                {deletingId ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div style={{ position: "relative", width: 56, height: 56 }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${colors.pedra}` }}
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover foto"
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "none",
          background: colors.erro,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: "18px",
          textAlign: "center",
          padding: 0,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}

function SeverityChip({ severity }: { severity: Severity }) {
  const severityColors: Record<Severity, { bg: string; fg: string }> = {
    baixa: { bg: "#e2efe8", fg: "#2f7d5c" },
    media: { bg: colors.ambarTint, fg: "#a4631a" },
    alta: { bg: colors.erroBg, fg: colors.erro },
    critica: { bg: colors.erroBg, fg: colors.erro },
  };
  const c = severityColors[severity];
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
