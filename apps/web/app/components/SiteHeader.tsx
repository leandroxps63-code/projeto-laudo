"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

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
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "12px 20px",
        borderBottom: "1px solid #e1ddd2",
        background: "#f8f6f2",
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          background: "none",
          border: "none",
          color: "#c0392b",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
        }}
      >
        Sair
      </button>
    </header>
  );
}
