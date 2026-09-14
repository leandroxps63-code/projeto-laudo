import PublicHeader from "./components/PublicHeader";
import { createClient } from "@/lib/supabase-server";

/**
 * Home pública — fase 1 do roadmap da landing page é só arquitetura/
 * navegação, então isto é um placeholder funcional (rota liberada sem
 * login, cabeçalho com Entrar/Cadastrar) até a fase 5 entrar com o
 * conteúdo/visual definitivo.
 */
export const metadata = {
  title: "Projeto Laudo",
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PublicHeader loggedIn={!!user} />
      <main style={{ maxWidth: 640, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>
          Laudo de inspeção predial, do jeito certo.
        </h1>
        <p style={{ color: "#6b7176", fontSize: "0.95rem" }}>
          Página em construção — a apresentação completa do produto chega em breve.
        </p>
      </main>
    </>
  );
}
