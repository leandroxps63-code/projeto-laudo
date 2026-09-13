"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = Point[];

type Props = {
  file: File | null;
  onConfirm: (file: File) => void;
  onClose: () => void;
};

// Tamanho da tela de desenho (ergonomia do mouse) — não é a resolução final
// salva. A exportação usa uma resolução maior (EXPORT_MAX_*) pra não gerar
// fotos borradas no laudo em PDF, redesenhando a imagem original + os
// traços (escalados) num canvas separado, maior, só na hora de confirmar.
const DISPLAY_MAX_WIDTH = 560;
const DISPLAY_MAX_HEIGHT = 480;
const EXPORT_MAX_WIDTH = 1600;
const EXPORT_MAX_HEIGHT = 1600;

/**
 * Marcação/anotação na foto — versão web do que já existe no app mobile
 * (PhotoMarkupModal.tsx de apps/mobile). Desenha direto no canvas que
 * contém a própria imagem: "Usar esta foto" exporta o canvas (imagem +
 * traços) como um novo arquivo, sem precisar guardar a marcação à parte.
 */
export default function PhotoMarkupModal({ file, onConfirm, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(DISPLAY_MAX_WIDTH / img.width, DISPLAY_MAX_HEIGHT / img.height, 1);
      imageRef.current = img;
      setSize({ width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
      setStrokes([]);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!size) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.drawImage(img, 0, 0, size.width, size.height);
    ctx.strokeStyle = "#e11d1d";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, [size, strokes]);

  if (!file) return null;
  const currentFile = file;

  function pointFromEvent(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true);
    setStrokes((prev) => [...prev, [pointFromEvent(e)]]);
  }

  function handlePointerMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const point = pointFromEvent(e);
    setStrokes((prev) => {
      const next = prev.slice();
      next[next.length - 1] = [...next[next.length - 1], point];
      return next;
    });
  }

  function handlePointerUp() {
    setDrawing(false);
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  // Sempre exporta (com ou sem marcação) num canvas à parte, numa resolução
  // maior que a tela de desenho — isso resolve dois problemas de uma vez:
  // 1) redimensiona/recomprime a foto pra caber no limite de payload de
  //    4.5 MB das funções serverless da Vercel (fotos de celular moderno
  //    passam fácil de 8-10 MB cruas); 2) evita salvar a foto do laudo na
  //    resolução pequena da tela de desenho (560x480), que ficaria borrada
  //    impressa no PDF. Os traços são redesenhados escalados pela razão
  //    entre a resolução de exportação e a de tela. Achado revisando o
  //    fluxo de upload de foto — o teste manual desta sessão usou um ícone
  //    de poucos KB, que não expõe nem o limite de tamanho nem a perda de
  //    qualidade.
  function exportCanvas() {
    const displayCanvas = canvasRef.current;
    const img = imageRef.current;
    if (!displayCanvas || !img || !size) {
      onConfirm(currentFile);
      onClose();
      return;
    }

    const exportScale = Math.min(EXPORT_MAX_WIDTH / img.width, EXPORT_MAX_HEIGHT / img.height, 1);
    const exportWidth = Math.round(img.width * exportScale);
    const exportHeight = Math.round(img.height * exportScale);
    const strokeScale = exportWidth / size.width;

    const exportCanvasEl = document.createElement("canvas");
    exportCanvasEl.width = exportWidth;
    exportCanvasEl.height = exportHeight;
    const ctx = exportCanvasEl.getContext("2d");
    if (!ctx) {
      onConfirm(currentFile);
      onClose();
      return;
    }
    ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
    ctx.strokeStyle = "#e11d1d";
    ctx.lineWidth = 4 * strokeScale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * strokeScale, stroke[0].y * strokeScale);
      for (const p of stroke.slice(1)) ctx.lineTo(p.x * strokeScale, p.y * strokeScale);
      ctx.stroke();
    }

    exportCanvasEl.toBlob(
      (blob) => {
        if (!blob) {
          onConfirm(currentFile);
        } else {
          onConfirm(new File([blob], currentFile.name, { type: "image/jpeg" }));
        }
        onClose();
      },
      "image/jpeg",
      0.85
    );
  }

  function handleSkip() {
    exportCanvas();
  }

  function handleConfirm() {
    exportCanvas();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23, 27, 31, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, maxWidth: 600 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>Marque o problema na foto</h2>
        <p style={{ fontSize: 12.5, color: "#6b7176", marginBottom: 14 }}>
          Desenhe com o mouse pra apontar ou circular a anomalia (opcional).
        </p>

        {size ? (
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              margin: "0 auto",
              borderRadius: 8,
              border: "1px solid #e1ddd2",
              cursor: "crosshair",
              touchAction: "none",
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
          />
        ) : (
          <p style={{ fontSize: 12.5, color: "#6b7176" }}>Carregando…</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 9,
              border: "1.3px solid #c9c3b4",
              background: "#fff",
              fontWeight: 700,
              fontSize: 13,
              color: strokes.length === 0 ? "#c9c3b4" : "#171b1f",
              cursor: strokes.length === 0 ? "default" : "pointer",
            }}
          >
            Desfazer
          </button>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 9,
              border: "1.3px solid #c9c3b4",
              background: "#fff",
              fontWeight: 700,
              fontSize: 13,
              color: "#171b1f",
              cursor: "pointer",
            }}
          >
            Pular marcação
          </button>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 12,
            borderRadius: 9,
            border: "none",
            background: "#e11d1d",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Usar esta foto
        </button>
      </div>
    </div>
  );
}
