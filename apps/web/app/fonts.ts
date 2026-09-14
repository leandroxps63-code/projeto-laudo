import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";

/**
 * Fontes do site inteiro (público e logado) — geradas via next/font pra não
 * baixar de novo em cada página, aplicadas uma vez no layout raiz via
 * variável CSS (--font-display/--font-body/--font-mono, herdada por tudo
 * abaixo do <body>).
 */
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
  display: "swap",
});
