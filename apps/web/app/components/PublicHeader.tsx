import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

/**
 * Cabeçalho das páginas públicas (home, futuras "/funcionalidades" e
 * "/sobre") — logo + Entrar/Cadastrar. Se quem visita já está logado, troca
 * os dois botões por um único "Ir pro painel" em vez de forçar redirect —
 * a pessoa pode querer navegar a página pública mesmo logada (ex: conferir
 * o texto antes de mandar o link pra alguém).
 *
 * Estilo provisório (fase 1 do roadmap é só arquitetura/navegação) — o
 * visual definitivo entra na fase 5, depois do sistema visual (fase 2).
 */
export default async function PublicHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid #e1ddd2",
        background: "#f8f6f2",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 800,
          fontSize: "1.05rem",
          color: "#171b1f",
          textDecoration: "none",
        }}
      >
        Projeto Laudo
      </Link>

      {user ? (
        <Link
          href="/painel"
          style={{
            padding: "9px 18px",
            borderRadius: 9,
            background: "#205e73",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          Ir pro painel
        </Link>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/login"
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              border: "1.3px solid #205e73",
              color: "#205e73",
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              background: "#205e73",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            Cadastrar
          </Link>
        </div>
      )}
    </header>
  );
}
