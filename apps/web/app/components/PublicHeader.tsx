import Link from "next/link";

/**
 * Cabeçalho das páginas públicas (home, futuras "/funcionalidades" e
 * "/sobre") — logo + Entrar/Cadastrar. Se quem visita já está logado, troca
 * os dois botões por um único "Ir pro painel" em vez de forçar redirect —
 * a pessoa pode querer navegar a página pública mesmo logada (ex: conferir
 * o texto antes de mandar o link pra alguém).
 *
 * Recebe loggedIn pronto em vez de checar a sessão aqui dentro: um Server
 * Component async usado como <PublicHeader /> quebra o type-check do
 * `next build` ("cannot be used as a JSX component", Promise<Element> não
 * é um tipo de retorno de componente válido pro TypeScript) — só apareceu
 * no build da Vercel, não no `tsc --noEmit` nem no `next build` local, por
 * alguma diferença de resolução de tipos entre os dois ambientes. Deixar a
 * página (que já é async) buscar a sessão e passar como prop evita o
 * problema de raiz, além de deixar o componente mais simples de reutilizar.
 *
 * Estilo provisório (fase 1 do roadmap é só arquitetura/navegação) — o
 * visual definitivo entra na fase 5, depois do sistema visual (fase 2).
 */
export default function PublicHeader({ loggedIn }: { loggedIn: boolean }) {
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

      {loggedIn ? (
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
