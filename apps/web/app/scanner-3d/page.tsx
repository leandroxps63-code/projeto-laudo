"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";

type Point = { x: number; y: number };
const W = 1000;
const H = 562.5;
const colors = { ink: "#141f22", muted: "#56635f", blue: "#205e73", deep: "#0f2f3a", paper: "#f5f1e9", white: "#fff", line: "#d9d2c0", amber: "#d97b1f" };
const distance = (a: Point, b: Point) => Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
function areaOf(points: Point[]) {
  return Math.abs(points.reduce((sum, p, i) => { const n = points[(i + 1) % points.length]; return sum + p.x * n.y - n.x * p.y; }, 0)) / 2;
}

export default function Scanner3DTestPage() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(1);
  const [meters, setMeters] = useState("2.00");
  const [ready, setReady] = useState(false);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const scale = useMemo(() => {
    const a = points[start], b = points[end], m = Number(meters.replace(",", "."));
    if (!a || !b || a === b || !Number.isFinite(m) || m <= 0) return 0;
    const px = distance(a, b);
    return px ? m / px : 0;
  }, [points, start, end, meters]);
  const edges = useMemo(() => ready && scale ? points.map((p, i) => distance(p, points[(i + 1) % points.length]) * scale) : [], [ready, points, scale]);
  const area = ready && scale && points.length >= 3 ? areaOf(points) * scale * scale : 0;
  const plan = useMemo(() => {
    if (!points.length) return "";
    const xs = points.map((p) => p.x * W), ys = points.map((p) => p.y * H);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const fit = Math.min(264 / Math.max(1, maxX - minX), 172 / Math.max(1, maxY - minY));
    const ox = (320 - (maxX - minX) * fit) / 2, oy = (220 - (maxY - minY) * fit) / 2;
    return points.map((p) => (ox + (p.x * W - minX) * fit) + "," + (oy + (p.y * H - minY) * fit)).join(" ");
  }, [points]);

  async function openCamera() {
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
      stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
      setActive(true);
    } catch { setError("Não consegui abrir a câmera. Confira a permissão e tente em uma página HTTPS."); }
  }
  function closeCamera() { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; if (video.current) video.current.srcObject = null; setActive(false); }
  function mark(e: MouseEvent<HTMLDivElement>) {
    if (!active || ready) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPoints((p) => [...p, { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }]);
  }
  function demo() {
    closeCamera(); setPoints([{ x: .24, y: .28 }, { x: .75, y: .25 }, { x: .81, y: .72 }, { x: .20, y: .74 }]);
    setStart(0); setEnd(1); setMeters("4.20"); setReady(false); setMessage("Exemplo visual: pontos simulados, sem medição real.");
  }
  function calibrate() {
    if (points.length < 3) { setMessage("Marque pelo menos três cantos do ambiente."); return; }
    if (!scale) { setMessage("Escolha dois pontos diferentes e informe a distância medida com trena."); return; }
    setReady(true); setMessage("Escala aplicada. Revise as medidas antes de usar qualquer dado.");
  }
  function reset() { closeCamera(); setPoints([]); setStart(0); setEnd(1); setReady(false); setError(""); setMessage(""); }

  const box: CSSProperties = { background: colors.white, border: "1px solid " + colors.line, borderRadius: 14, padding: 18, boxShadow: "0 5px 18px rgba(20,31,34,.05)" };
  const button: CSSProperties = { border: 0, borderRadius: 9, padding: "10px 14px", background: colors.blue, color: colors.white, fontWeight: 800, cursor: "pointer" };
  const field: CSSProperties = { width: "100%", border: "1px solid " + colors.line, borderRadius: 8, padding: 10, background: colors.white, color: colors.ink };
  return <main style={{ minHeight: "calc(100vh - 58px)", background: colors.paper, color: colors.ink, padding: "30px clamp(16px,4vw,56px) 60px" }}>
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <p style={{ color: colors.muted, fontSize: 13 }}>Projeto Laudo / Laboratório</p>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "end", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
        <div><span style={{ color: colors.blue, fontWeight: 800, fontSize: 11, letterSpacing: ".12em" }}>PROTÓTIPO EXPERIMENTAL</span><h1 style={{ margin: "8px 0", color: colors.deep, fontSize: "clamp(30px,4vw,46px)", letterSpacing: "-.03em" }}>Scanner de ambientes</h1><p style={{ maxWidth: 720, margin: 0, color: colors.muted, lineHeight: 1.6 }}>Marque os cantos pela câmera, calibre com uma distância real e veja uma planta baixa estimada. Nada é salvo no projeto.</p></div>
        <strong style={{ background: "#f7e3cc", color: "#7f4a14", borderRadius: 99, padding: "8px 12px", fontSize: 12 }}>Somente para testes</strong>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "start", gap: 16 }}>
        <section style={{ ...box, flex: "2 1 520px", padding: 0, overflow: "hidden" }} aria-label="Câmera e marcação">
          <div onClick={mark} style={{ position: "relative", aspectRatio: "16 / 9", background: "#172529", overflow: "hidden", cursor: active && !ready ? "crosshair" : "default", touchAction: "manipulation" }}>
            {active && <video ref={video} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            {!active && <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", gap: 9, textAlign: "center", padding: 24, color: "#f5f1e9" }}><b>A câmera aparece aqui</b><span style={{ maxWidth: 340, fontSize: 12, color: "#d4ddda" }}>Abra a câmera traseira ou carregue o exemplo visual.</span></div>}
            <span style={{ position: "absolute", top: 12, left: 12, padding: "7px 10px", borderRadius: 99, color: "white", background: "#0a161bcc", fontSize: 11, fontWeight: 800 }}>{active ? "● CÂMERA ATIVA" : "○ AGUARDANDO CÂMERA"} · {points.length} pontos</span>
            {points.map((p, i) => <span key={i} style={{ position: "absolute", left: (p.x * 100) + "%", top: (p.y * 100) + "%", transform: "translate(-50%,-50%)", display: "grid", placeItems: "center", width: 27, height: 27, borderRadius: 99, border: "2px solid white", background: colors.amber, color: colors.deep, fontWeight: 900, fontSize: 11 }}>{i + 1}</span>)}
            <span style={{ position: "absolute", bottom: 12, left: 12, maxWidth: 360, padding: 9, borderRadius: 8, color: "white", background: "#0a161bcc", fontSize: 12 }}>{active ? "Toque nos cantos do piso, em sequência, para desenhar o contorno." : "A câmera não está transmitindo."}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 13, borderTop: "1px solid " + colors.line }}>
            <button style={button} onClick={active ? closeCamera : openCamera}>{active ? "Parar câmera" : "Abrir câmera"}</button>
            <button style={{ ...button, background: "white", color: colors.ink, border: "1px solid " + colors.line }} onClick={() => { setPoints((p) => p.slice(0, -1)); setReady(false); }}>Desfazer ponto</button>
            <button style={{ ...button, background: "white", color: colors.ink, border: "1px solid " + colors.line }} onClick={reset}>Limpar</button>
            <button style={{ ...button, background: "#fff8ee", color: "#805018", border: "1px solid #e7cda9" }} onClick={demo}>Carregar exemplo</button>
          </div>
        </section>
        <aside style={{ flex: "1 1 290px", minWidth: 0, display: "grid", gap: 14 }}>
          <section style={box}>
            <h2 style={{ margin: "0 0 5px", color: colors.deep, fontSize: 18 }}>Calibrar leitura</h2>
            <p style={{ margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.5 }}>Escolha dois pontos e informe a distância medida com trena. O protótipo usa uma escala única na imagem.</p>
            <div style={{ display: "flex", gap: 9 }}>
              <label style={{ flex: 1, color: colors.muted, fontSize: 12, fontWeight: 700 }}>Ponto inicial<select style={{ ...field, marginTop: 5 }} value={start} onChange={(e) => { setStart(Number(e.target.value)); setReady(false); }}>{points.map((_, i) => <option key={i} value={i}>Ponto {i + 1}</option>)}</select></label>
              <label style={{ flex: 1, color: colors.muted, fontSize: 12, fontWeight: 700 }}>Ponto final<select style={{ ...field, marginTop: 5 }} value={end} onChange={(e) => { setEnd(Number(e.target.value)); setReady(false); }}>{points.map((_, i) => <option key={i} value={i}>Ponto {i + 1}</option>)}</select></label>
            </div>
            <label style={{ display: "block", marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: 700 }}>Distância real entre pontos (m)<input style={{ ...field, marginTop: 5 }} type="number" min=".1" step=".01" value={meters} onChange={(e) => { setMeters(e.target.value); setReady(false); }} /></label>
            <button style={{ ...button, width: "100%", marginTop: 12, background: "#2e755b" }} onClick={calibrate}>Gerar planta estimada</button>
            {error && <p role="alert" style={{ color: "#a34435", fontSize: 12 }}>{error}</p>}{message && <p role="status" style={{ color: colors.blue, fontSize: 12 }}>{message}</p>}
            <p style={{ margin: "12px 0 0", padding: 10, borderRadius: 8, background: "#f7e3cc", color: "#68441d", fontSize: 12, lineHeight: 1.5 }}><b>Precisão:</b> câmera comum não garante medidas 3D. Perspectiva, luz e movimento distorcem a escala; confira tudo com trena.</p>
          </section>
          <section style={box}>
            <h2 style={{ margin: "0 0 5px", color: colors.deep, fontSize: 18 }}>Planta baixa</h2>
            <p style={{ margin: 0, color: colors.muted, fontSize: 12 }}>Contorno 2D aproximado dos pontos marcados.</p>
            <div style={{ marginTop: 12, border: "1px solid " + colors.line, borderRadius: 10, background: "#fbfaf7", padding: 8 }}><svg viewBox="0 0 320 220" width="100%" role="img" aria-label="Prévia da planta estimada">
              <defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#e7e1d4" strokeWidth=".7" /></pattern></defs><rect width="320" height="220" rx="8" fill="url(#grid)" />
              {points.length >= 3 && <><polygon points={plan} fill="rgba(32,94,115,.12)" stroke={colors.blue} strokeWidth="3" strokeLinejoin="round" strokeDasharray={ready ? "0" : "7 5"} />{plan.split(" ").map((pair, i) => { const [x, y] = pair.split(",").map(Number); return <g key={i}><circle cx={x} cy={y} r="10" fill={colors.amber} stroke="white" strokeWidth="2" /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill={colors.deep}>{i + 1}</text></g>; })}{ready && <text x="160" y="112" textAnchor="middle" fontSize="13" fontWeight="800" fill={colors.deep}>{area.toFixed(2)} m²*</text>}</>}
              {points.length < 3 && <text x="160" y="112" textAnchor="middle" fill="#8b968f" fontSize="12">Marque ao menos 3 cantos</text>}
            </svg></div>
            {ready && <><p style={{ color: colors.deep, fontWeight: 900, fontSize: 20 }}>Área estimada: {area.toFixed(2)} m²*</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{edges.map((v, i) => <span key={i} style={{ padding: "6px 8px", borderRadius: 7, background: colors.paper, color: colors.muted, fontSize: 11 }}>Lado {i + 1}: <b>{v.toFixed(2)} m*</b></span>)}</div></>}
            <p style={{ margin: "10px 0 0", color: "#8b968f", fontSize: 11, lineHeight: 1.5 }}>*Estimativa demonstrativa. Não usar como medida técnica final.</p>
          </section>
          <section style={{ ...box, background: "#edf3f4" }}><b style={{ color: colors.deep }}>Onde a IA ajuda</b><p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12, lineHeight: 1.5 }}>Pode sugerir paredes, portas e contornos. Não garante metragem: a geometria depende de sensores de profundidade, calibração e validação humana. Este teste não envia imagens à OpenAI; a API é cobrada separadamente do ChatGPT Plus.</p></section>
        </aside>
      </div>
      <p style={{ marginTop: 18, color: "#8b968f", fontSize: 11 }}>Laboratório isolado. Nenhuma captura é salva, anexada à vistoria ou exportada para um laudo.</p>
    </div>
  </main>;
}
