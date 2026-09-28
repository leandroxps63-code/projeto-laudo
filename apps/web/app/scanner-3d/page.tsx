"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

type Point = { x: number; y: number };
type Opening = {
  kind: "porta" | "janela" | "abertura" | "incerto";
  position: "esquerda" | "centro" | "direita" | "não identificável";
  confidence: "alta" | "média" | "baixa";
  description: string;
};
type PhotoAnalysis = { summary: string; openings: Opening[] };

const PHOTO_WIDTH = 1200;
const PHOTO_HEIGHT = 675;
const palette = {
  ink: "#141f22",
  muted: "#56635f",
  blue: "#205e73",
  deep: "#0f2f3a",
  paper: "#f5f1e9",
  white: "#fff",
  line: "#d9d2c0",
  amber: "#d97b1f",
};

function pixelDistance(a: Point, b: Point) {
  return Math.hypot(
    (a.x - b.x) * PHOTO_WIDTH,
    (a.y - b.y) * PHOTO_HEIGHT,
  );
}

function polygonArea(points: Point[]) {
  return Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0),
  ) / 2;
}

function cropToPhoto(image: HTMLImageElement | HTMLVideoElement) {
  const sourceWidth = "videoWidth" in image ? image.videoWidth : image.naturalWidth;
  const sourceHeight = "videoHeight" in image ? image.videoHeight : image.naturalHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_WIDTH;
  canvas.height = PHOTO_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");

  context.drawImage(image, sx, sy, sw, sh, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  return canvas.toDataURL("image/jpeg", 0.84);
}

function waitForFirstCameraFrame(video: HTMLVideoElement, timeoutMs = 8000) {
  return new Promise<void>((resolve, reject) => {
    let timeout: number;
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", checkFrame);
      video.removeEventListener("playing", checkFrame);
      video.removeEventListener("error", handleError);
    };
    const checkFrame = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    const handleError = () => {
      cleanup();
      reject(new Error("A câmera abriu, mas não entregou imagem. Use a câmera nativa do celular para tirar a foto."));
    };

    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("A câmera abriu, mas não chegou nenhum quadro de vídeo. Use “Tirar ou escolher foto” para continuar."));
    }, timeoutMs);
    video.addEventListener("loadeddata", checkFrame);
    video.addEventListener("playing", checkFrame);
    video.addEventListener("error", handleError);
    checkFrame();
  });
}

function cameraFrameIsBlack(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 18;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] > 1 || pixels[index + 1] > 1 || pixels[index + 2] > 1) return false;
  }
  return true;
}

export default function Scanner3DTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState(0);
  const [endPoint, setEndPoint] = useState(1);
  const [knownMeters, setKnownMeters] = useState("2.00");
  const [measurementReady, setMeasurementReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
  );

  const scale = useMemo(() => {
    const first = points[startPoint];
    const second = points[endPoint];
    const meters = Number(knownMeters.replace(",", "."));

    if (!first || !second || startPoint === endPoint || !Number.isFinite(meters) || meters <= 0) {
      return 0;
    }

    const pixels = pixelDistance(first, second);
    return pixels > 0 ? meters / pixels : 0;
  }, [points, startPoint, endPoint, knownMeters]);

  const sideLengths = useMemo(() => {
    if (!measurementReady || !scale || points.length < 2) return [];
    if (points.length === 2) return [pixelDistance(points[0], points[1]) * scale];
    return points.map((point, index) =>
      pixelDistance(point, points[(index + 1) % points.length]) * scale,
    );
  }, [measurementReady, points, scale]);

  const area =
    measurementReady && scale && points.length >= 3
      ? polygonArea(points) * PHOTO_WIDTH * PHOTO_HEIGHT * scale * scale
      : 0;

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraStarting(false);
  }

  async function startCamera() {
    setCameraError("");
    setNotice("");
    setPhoto(null);
    setPoints([]);
    setAnalysis(null);
    setMeasurementReady(false);
    setCameraStarting(true);

    if (!window.isSecureContext) {
      setCameraStarting(false);
      setCameraError("A câmera precisa de uma página HTTPS. Abra o endereço publicado do Projeto Laudo.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStarting(false);
      setCameraError(
        "Este navegador não liberou acesso direto à câmera. Use “Tirar ou escolher foto” ou abra o site no Safari/Chrome.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;

      // O vídeo fica montado mesmo antes de ligar a câmera. Assim o ref existe
      // quando o navegador entrega o stream, inclusive no Safari do iPhone.
      if (!videoRef.current) throw new Error("O vídeo ainda não está pronto. Tente novamente.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await waitForFirstCameraFrame(videoRef.current);
      if (cameraFrameIsBlack(videoRef.current)) {
        throw new Error("A câmera abriu, mas a imagem recebida está preta. Tente a câmera nativa do celular ou verifique se outro app está usando a câmera.");
      }
      setCameraActive(true);
      setCameraStarting(false);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
      setCameraStarting(false);

      const name = error instanceof DOMException ? error.name : "";
      if (error instanceof Error && error.message.startsWith("A câmera abriu,")) {
        setCameraError(error.message);
      } else if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError("A permissão da câmera foi negada. Libere a câmera para este site nas configurações do navegador.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("Não encontrei uma câmera traseira disponível neste dispositivo.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setCameraError("A câmera está ocupada por outro aplicativo. Feche-o e tente de novo.");
      } else {
        setCameraError("Não consegui abrir a câmera neste navegador. Você ainda pode tirar ou escolher uma foto.");
      }
    }
  }

  function markPoint(event: MouseEvent<HTMLDivElement>) {
    if ((!cameraActive && !photo) || measurementReady) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPoint = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
    setPoints((current) => [...current, nextPoint]);
    setAnalysis(null);
  }

  function capturePhoto() {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      setCameraError("A imagem da câmera ainda está carregando. Aguarde um instante e tente novamente.");
      return;
    }

    try {
      const captured = cropToPhoto(videoRef.current);
      setPhoto(captured);
      setPoints([]);
      setStartPoint(0);
      setEndPoint(1);
      setMeasurementReady(false);
      setAnalysis(null);
      setNotice("Foto pronta. Marque os pontos sobre a imagem; ela permanece neste navegador até você sair.");
      stopCamera();
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Não consegui capturar a foto.");
    }
  }

  function handlePhotoFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCameraError("Escolha um arquivo de imagem.");
      return;
    }

    const image = new Image();
    image.onload = () => {
      try {
        setPhoto(cropToPhoto(image));
        setPoints([]);
        setStartPoint(0);
        setEndPoint(1);
        setMeasurementReady(false);
        setAnalysis(null);
        setCameraError("");
        setNotice("Foto carregada. Marque os pontos sobre a imagem.");
        stopCamera();
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : "Não consegui abrir essa foto.");
      }
      URL.revokeObjectURL(image.src);
    };
    image.onerror = () => setCameraError("Não consegui abrir essa foto. Escolha outro arquivo.");
    image.src = URL.createObjectURL(file);
  }

  function loadExample() {
    stopCamera();
    setPhoto(null);
    setPoints([
      { x: 0.24, y: 0.28 },
      { x: 0.75, y: 0.25 },
      { x: 0.81, y: 0.72 },
      { x: 0.2, y: 0.74 },
    ]);
    setStartPoint(0);
    setEndPoint(1);
    setKnownMeters("4.20");
    setMeasurementReady(false);
    setAnalysis(null);
    setNotice("Exemplo visual: os pontos são simulados e não representam uma leitura real.");
  }

  function reset() {
    stopCamera();
    setPhoto(null);
    setPoints([]);
    setStartPoint(0);
    setEndPoint(1);
    setMeasurementReady(false);
    setCameraError("");
    setNotice("");
    setAnalysis(null);
  }

  function calibrate() {
    if (points.length < 2) {
      setNotice("Marque dois pontos diferentes na mesma parede.");
      return;
    }
    if (!scale) {
      setNotice("Informe uma distância real maior que zero entre os pontos escolhidos.");
      return;
    }
    setMeasurementReady(true);
    setNotice("Estimativa calculada com uma distância informada por você. Revise com trena ou medidor a laser.");
  }

  async function analyzePhoto() {
    if (!photo) {
      setNotice("Tire ou escolha uma foto antes de pedir a análise.");
      return;
    }

    setAnalyzing(true);
    setCameraError("");
    setAnalysis(null);
    try {
      const response = await fetch("/api/scanner-3d/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "A análise não foi concluída.");
      setAnalysis(result.analysis as PhotoAnalysis);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Não consegui analisar essa foto.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveMarkedPhoto() {
    if (!photo) {
      setNotice("Tire ou escolha uma foto primeiro.");
      return;
    }

    const image = new Image();
    image.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_WIDTH;
      canvas.height = PHOTO_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) {
        setCameraError("Não consegui preparar a imagem para salvar.");
        return;
      }

      context.drawImage(image, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
      if (points.length > 1) {
        context.strokeStyle = "#ffb348";
        context.lineWidth = 5;
        context.beginPath();
        points.forEach((point, index) => {
          const x = point.x * PHOTO_WIDTH;
          const y = point.y * PHOTO_HEIGHT;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        if (points.length >= 3) context.closePath();
        context.stroke();
      }

      points.forEach((point, index) => {
        const x = point.x * PHOTO_WIDTH;
        const y = point.y * PHOTO_HEIGHT;
        context.beginPath();
        context.arc(x, y, 19, 0, Math.PI * 2);
        context.fillStyle = palette.amber;
        context.fill();
        context.lineWidth = 4;
        context.strokeStyle = "white";
        context.stroke();
        context.fillStyle = palette.deep;
        context.font = "bold 22px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(index + 1), x, y);
      });

      if (measurementReady) {
        context.fillStyle = "rgba(15,47,58,.88)";
        context.fillRect(0, PHOTO_HEIGHT - 52, PHOTO_WIDTH, 52);
        context.fillStyle = "white";
        context.font = "bold 24px sans-serif";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(
          "Estimativa: " + area.toFixed(2) + " m² · conferir com medidor",
          20,
          PHOTO_HEIGHT - 26,
        );
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCameraError("Não consegui gerar a foto marcada.");
          return;
        }
        const file = new File([blob], "projeto-laudo-medicao.jpg", { type: "image/jpeg" });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: "Foto marcada — Projeto Laudo" });
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;
            link.click();
            URL.revokeObjectURL(url);
            setNotice("Foto marcada baixada para o dispositivo.");
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setCameraError("Não consegui salvar ou compartilhar a foto neste navegador.");
          }
        }
      }, "image/jpeg", 0.92);
    };
    image.onerror = () => setCameraError("Não consegui abrir a foto para salvar.");
    image.src = photo;
  }

  const card: CSSProperties = {
    background: palette.white,
    border: "1px solid " + palette.line,
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 5px 18px rgba(20,31,34,.05)",
  };
  const button: CSSProperties = {
    border: 0,
    borderRadius: 9,
    padding: "10px 14px",
    background: palette.blue,
    color: palette.white,
    fontWeight: 800,
    cursor: "pointer",
  };
  const field: CSSProperties = {
    width: "100%",
    border: "1px solid " + palette.line,
    borderRadius: 8,
    padding: 10,
    background: palette.white,
    color: palette.ink,
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 58px)",
        background: palette.paper,
        color: palette.ink,
        padding: "30px clamp(16px,4vw,56px) 60px",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <p style={{ color: palette.muted, fontSize: 13 }}>Projeto Laudo / Laboratório</p>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div>
            <span style={{ color: palette.blue, fontWeight: 800, fontSize: 11, letterSpacing: ".12em" }}>
              PROTÓTIPO EXPERIMENTAL
            </span>
            <h1 style={{ margin: "8px 0", color: palette.deep, fontSize: "clamp(30px,4vw,46px)" }}>
              Scanner de ambientes
            </h1>
            <p style={{ maxWidth: 760, margin: 0, color: palette.muted, lineHeight: 1.6 }}>
              Fotografe uma parede, marque os pontos e salve a imagem anotada. A análise pode sugerir portas e janelas.
            </p>
          </div>
          <strong style={{ background: "#f7e3cc", color: "#7f4a14", borderRadius: 99, padding: "8px 12px", fontSize: 12 }}>
            Somente para testes
          </strong>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "start", gap: 16 }}>
          <section style={{ ...card, flex: "2 1 520px", padding: 0, overflow: "hidden" }} aria-label="Câmera e marcação">
            <div
              onClick={markPoint}
              style={{
                position: "relative",
                aspectRatio: "16 / 9",
                background: "#172529",
                overflow: "hidden",
                cursor: (cameraActive || photo) && !measurementReady ? "crosshair" : "default",
                touchAction: "manipulation",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Prévia da câmera"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: cameraActive ? 1 : 0,
                }}
              />
              {!cameraActive && photo && (
                <img
                  src={photo}
                  alt="Foto do ambiente para marcar e analisar"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {!cameraActive && !photo && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", gap: 9, textAlign: "center", padding: 24, color: palette.paper }}>
                  <b>A câmera aparece aqui</b>
                  <span style={{ maxWidth: 360, fontSize: 12, color: "#d4ddda" }}>
                    Abra a câmera ou use o botão para tirar/escolher uma foto.
                  </span>
                </div>
              )}
              <span style={{ position: "absolute", top: 12, left: 12, padding: "7px 10px", borderRadius: 99, color: "white", background: "#0a161bcc", fontSize: 11, fontWeight: 800 }}>
                {cameraActive ? "● CÂMERA ATIVA" : photo ? "● FOTO PRONTA" : "○ AGUARDANDO CÂMERA"} · {points.length} pontos
              </span>
              {points.map((point, index) => (
                <span
                  key={index}
                  style={{
                    position: "absolute",
                    left: point.x * 100 + "%",
                    top: point.y * 100 + "%",
                    transform: "translate(-50%,-50%)",
                    display: "grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    border: "2px solid white",
                    background: palette.amber,
                    color: palette.deep,
                    fontWeight: 900,
                    fontSize: 11,
                    pointerEvents: "none",
                  }}
                >
                  {index + 1}
                </span>
              ))}
              <span style={{ position: "absolute", bottom: 12, left: 12, maxWidth: 400, padding: 9, borderRadius: 8, color: "white", background: "#0a161bcc", fontSize: 12 }}>
                {(cameraActive || photo) && !measurementReady
                  ? "Marque dois pontos para uma distância ou contorne o piso com três ou mais pontos."
                  : photo
                    ? "Foto congelada: revise as marcações antes de salvar."
                    : "A câmera não está transmitindo."}
              </span>
            </div>

            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handlePhotoFile(event.target.files?.[0])}
              style={{ display: "none" }}
              aria-label="Tirar ou escolher foto do ambiente"
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 13, borderTop: "1px solid " + palette.line }}>
              <button style={button} onClick={cameraActive ? stopCamera : startCamera}>
                {cameraActive ? "Parar câmera" : "Abrir câmera"}
              </button>
              {cameraActive && <button style={{ ...button, background: "#2e755b" }} onClick={capturePhoto}>Tirar foto</button>}
              <button
                style={{ ...button, background: "white", color: palette.ink, border: "1px solid " + palette.line }}
                onClick={() => uploadRef.current?.click()}
              >
                Tirar ou escolher foto
              </button>
              <button
                style={{ ...button, background: "white", color: palette.ink, border: "1px solid " + palette.line }}
                onClick={() => { setPoints((current) => current.slice(0, -1)); setMeasurementReady(false); setAnalysis(null); }}
              >
                Desfazer ponto
              </button>
              <button
                style={{ ...button, background: "white", color: palette.ink, border: "1px solid " + palette.line }}
                onClick={reset}
              >
                Limpar
              </button>
              <button style={{ ...button, background: "#fff8ee", color: "#805018", border: "1px solid #e7cda9" }} onClick={loadExample}>
                Carregar exemplo
              </button>
            </div>
          </section>

          <aside style={{ flex: "1 1 300px", minWidth: 0, display: "grid", gap: 14 }}>
            <section style={card}>
              <h2 style={{ margin: "0 0 5px", color: palette.deep, fontSize: 18 }}>Marcar e medir</h2>
              <p style={{ margin: 0, color: palette.muted, fontSize: 12, lineHeight: 1.5 }}>
                Marque dois pontos numa mesma parede e informe a medida feita com trena. O cálculo da foto é uma estimativa 2D; perspectiva da câmera pode alterar o resultado.
              </p>
              <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
                <label style={{ flex: 1, color: palette.muted, fontSize: 12, fontWeight: 700 }}>
                  Ponto inicial
                  <select style={{ ...field, marginTop: 5 }} value={startPoint} onChange={(event) => { setStartPoint(Number(event.target.value)); setMeasurementReady(false); }}>
                    {points.map((_, index) => <option key={index} value={index}>Ponto {index + 1}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1, color: palette.muted, fontSize: 12, fontWeight: 700 }}>
                  Ponto final
                  <select style={{ ...field, marginTop: 5 }} value={endPoint} onChange={(event) => { setEndPoint(Number(event.target.value)); setMeasurementReady(false); }}>
                    {points.map((_, index) => <option key={index} value={index}>Ponto {index + 1}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: "block", marginTop: 12, color: palette.muted, fontSize: 12, fontWeight: 700 }}>
                Distância real entre os pontos (m)
                <input style={{ ...field, display: "block", boxSizing: "border-box", marginTop: 5 }} type="number" min=".1" step=".01" value={knownMeters} onChange={(event) => { setKnownMeters(event.target.value); setMeasurementReady(false); }} />
              </label>
              <button style={{ ...button, width: "100%", marginTop: 12, background: "#2e755b" }} onClick={calibrate}>
                Calcular estimativa
              </button>
              {measurementReady && (
                <div style={{ marginTop: 12 }}>
                  {points.length >= 3 && <p style={{ margin: "0 0 8px", color: palette.deep, fontWeight: 900, fontSize: 20 }}>Área aproximada: {area.toFixed(2)} m²*</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {sideLengths.map((length, index) => (
                      <span key={index} style={{ padding: "6px 8px", borderRadius: 7, background: palette.paper, color: palette.muted, fontSize: 11 }}>
                        Segmento {index + 1}: <b>{length.toFixed(2)} m*</b>
                      </span>
                    ))}
                  </div>
                  {photo && <button style={{ ...button, width: "100%", marginTop: 10 }} onClick={saveMarkedPhoto}>Salvar/compartilhar foto marcada</button>}
                </div>
              )}
              <p style={{ margin: "12px 0 0", padding: 10, borderRadius: 8, background: "#f7e3cc", color: "#68441d", fontSize: 12, lineHeight: 1.5 }}>
                <b>Precisão:</b> foto comum não mede profundidade nem corrige perspectiva. Não use esta estimativa em laudo. Medição 3D real no iPhone exige integração nativa com ARKit/RoomPlan e hardware compatível.
              </p>
            </section>

            <section style={card}>
              <h2 style={{ margin: "0 0 5px", color: palette.deep, fontSize: 18 }}>Portas e janelas</h2>
              <p style={{ margin: 0, color: palette.muted, fontSize: 12, lineHeight: 1.5 }}>
                A IA pode reconhecer elementos visíveis na foto. Ela não calcula medidas; confira o resultado no local.
              </p>
              <button
                style={{ ...button, width: "100%", marginTop: 12, opacity: analyzing || !photo ? 0.65 : 1 }}
                disabled={analyzing || !photo}
                onClick={analyzePhoto}
              >
                {analyzing ? "Analisando foto…" : "Analisar foto com IA"}
              </button>
              <p style={{ margin: "8px 0 0", color: palette.muted, fontSize: 11, lineHeight: 1.5 }}>
                Ao tocar em analisar, a foto será enviada à API da OpenAI. A análise só funciona se a chave da API estiver configurada no servidor; o uso é cobrado pela API.
              </p>
              {analysis && (
                <div style={{ marginTop: 12 }}>
                  <p role="status" style={{ color: palette.deep, fontSize: 13 }}>{analysis.summary}</p>
                  {analysis.openings.length === 0 ? (
                    <p style={{ color: palette.muted, fontSize: 12 }}>Nenhuma porta ou janela identificável nesta foto.</p>
                  ) : (
                    <ul style={{ paddingLeft: 20, color: palette.muted, fontSize: 12, lineHeight: 1.6 }}>
                      {analysis.openings.map((opening, index) => (
                        <li key={index}>
                          <b>{opening.kind[0].toUpperCase() + opening.kind.slice(1)}</b> · {opening.position} · confiança {opening.confidence}. {opening.description}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p style={{ color: "#8b5a20", fontSize: 11 }}>Sugestão automática: confirme manualmente cada elemento.</p>
                </div>
              )}
            </section>
          </aside>
        </div>

        {(cameraError || notice) && (
          <p role={cameraError ? "alert" : "status"} style={{ marginTop: 14, color: cameraError ? "#a34435" : palette.blue, fontSize: 13 }}>
            {cameraError || notice}
          </p>
        )}
        <p style={{ marginTop: 18, color: "#8b968f", fontSize: 11, lineHeight: 1.5 }}>
          Foto e marcações ficam apenas nesta sessão do navegador. Não são adicionadas à vistoria nem enviadas à OpenAI sem você tocar em “Analisar foto com IA”.
        </p>
      </div>
    </main>
  );
}
