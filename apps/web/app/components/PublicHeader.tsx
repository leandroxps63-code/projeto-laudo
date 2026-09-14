import Link from "next/link";
import { display, body } from "../fonts";

/**
 * Cabeçalho das páginas públicas (home, "/funcionalidades", "/sobre") —
 * logo + Entrar/Cadastrar. Se quem visita já está logado, troca os dois
 * botões por um único "Ir pro painel" em vez de forçar redirect — a pessoa
 * pode querer navegar a página pública mesmo logada (ex: conferir o texto
 * antes de mandar o link pra alguém).
 *
 * Recebe loggedIn pronto em vez de checar a sessão aqui dentro: um Server
 * Component async usado como <PublicHeader /> quebra o type-check do
 * `next build` ("cannot be used as a JSX component") — só aparece no build
 * da Vercel, não no `tsc --noEmit` local. Deixar a página (que já é async)
 * buscar a sessão e passar como prop evita o problema de raiz.
 */
export default function PublicHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header
      className={`${display.variable} ${body.variable}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 24px",
        borderBottom: "1px solid #d9d2c0",
        background: "rgba(245, 241, 233, 0.92)",
        backdropFilter: "blur(6px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        fontFamily: "var(--font-body), system-ui, sans-serif",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "1.1rem",
          letterSpacing: "-0.01em",
          color: "#141f22",
          textDecoration: "none",
        }}
      >
        Projeto Laudo
      </Link>

      {loggedIn ? (
        <Link
          href="/painel"
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background: "#205e73",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
          }}
        >
          Ir pro painel
        </Link>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "1.4px solid #205e73",
              color: "#205e73",
              fontWeight: 700,
              fontSize: "0.88rem",
              textDecoration: "none",
            }}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#d97b1f",
              color: "#0f2f3a",
              fontWeight: 700,
              fontSize: "0.88rem",
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
