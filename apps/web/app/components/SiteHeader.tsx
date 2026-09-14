"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { colors, fontDisplay, fontBody } from "@/lib/theme";

const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/laudos/compartilhado",
  "/privacidade",
  "/funcionalidades",
  "/sobre",
];

/**
 * Barra de logout presente em toda página autenticada do site — espelha o
 * padrão do app mobile (botão no headerRight, global pra toda tela). Fica de
 * fora das páginas públicas (login, cadastro, home, laudo compartilhado),
 * que têm o próprio cabeçalho (PublicHeader) embutido na página.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = pathname === "/" || PUBLIC_PATHS.some((path) => pathname?.startsWith(path));
  if (isPublic) return null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: `1px solid ${colors.pedra}`,
        background: "rgba(245, 241, 233, 0.92)",
        backdropFilter: "blur(6px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Link
        href="/painel"
        style={{
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: "1.02rem",
          letterSpacing: "-0.01em",
          color: colors.tinta,
          textDecoration: "none",
        }}
      >
        Projeto Laudo
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/perfil"
          style={{
            color: colors.tintaMuted,
            fontWeight: 700,
            fontFamily: fontBody,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Meu perfil
        </Link>
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: `1.3px solid ${colors.pedra}`,
            borderRadius: 8,
            padding: "7px 14px",
            color: colors.erro,
            fontWeight: 700,
            fontFamily: fontBody,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
