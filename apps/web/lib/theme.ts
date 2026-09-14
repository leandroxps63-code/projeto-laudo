import type { CSSProperties } from "react";

/**
 * Paleta e componentes de estilo compartilhados entre TODAS as páginas do
 * site (públicas e logadas) — a mesma identidade fechada na fase 2 do
 * roadmap da landing (azul de planta + âmbar de EPI), agora estendida pro
 * app logado (login, cadastro, painel, clientes, vistorias). Cores puras
 * ficam aqui; layout/spacing de cada tela continua inline, como já era.
 */
export const colors = {
  azul: "#205e73",
  azulEscuro: "#0f2f3a",
  azulTint: "#dfeaec",
  ambar: "#d97b1f",
  ambarTint: "#f7e3cc",
  concreto: "#f5f1e9",
  superficie: "#ffffff",
  superficie2: "#ece5d5",
  pedra: "#d9d2c0",
  tinta: "#141f22",
  tintaMuted: "#56635f",
  tintaFaint: "#8b968f",
  erro: "#c0392b",
  erroBg: "#fbe8e6",
} as const;

export const fontBody = "var(--font-body), system-ui, -apple-system, 'Segoe UI', sans-serif";
export const fontDisplay = "var(--font-display), system-ui, sans-serif";
export const fontMono = "var(--font-mono), ui-monospace, monospace";

export const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.tintaMuted,
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: 11,
  borderRadius: 9,
  border: `1.3px solid ${colors.pedra}`,
  background: colors.superficie,
  color: colors.tinta,
  fontFamily: fontBody,
  fontSize: 14,
};

export const primaryButtonStyle: CSSProperties = {
  padding: 13,
  borderRadius: 10,
  border: "none",
  background: colors.azul,
  color: "#fff",
  fontWeight: 700,
  fontFamily: fontBody,
  cursor: "pointer",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "9px 16px",
  borderRadius: 9,
  border: `1.3px solid ${colors.azul}`,
  color: colors.azul,
  background: "transparent",
  fontWeight: 700,
  fontFamily: fontBody,
  textDecoration: "none",
  cursor: "pointer",
};

export const cardStyle: CSSProperties = {
  border: `1px solid ${colors.pedra}`,
  borderRadius: 11,
  background: colors.superficie,
  boxShadow: "0 1px 2px rgba(20,31,34,.05), 0 8px 20px -14px rgba(20,31,34,.18)",
};

export const errorTextStyle: CSSProperties = {
  color: colors.erro,
  fontSize: 13,
};

export const headingStyle: CSSProperties = {
  fontFamily: fontDisplay,
  fontWeight: 800,
  color: colors.tinta,
  letterSpacing: "-0.01em",
};

export const monoLabelStyle: CSSProperties = {
  fontFamily: fontMono,
  fontSize: 11,
  color: colors.tintaFaint,
};
