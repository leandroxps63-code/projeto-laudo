import type { Metadata } from "next";
import SiteHeader from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "Projeto Laudo",
  description: "Laudos de inspeção predial — do app de campo ao documento pronto.",
};

// Praticamente toda página do site checa sessão em runtime (painel,
// clientes, vistorias por usuário logado; até as páginas públicas, pra
// saber se mostram "Entrar" ou "Ir pro painel") — nenhuma deveria ser
// gerada estática em build de qualquer forma. Também evita um bug real de
// `next build` (App Router + Client Component usando usePathname/useRouter
// no layout raiz — aqui, o SiteHeader — quebrava a pré-renderização
// estática com "Cannot read properties of null (reading 'useContext')", só
// em produção, nunca em `next dev`). Achado testando o build de verdade
// depois que o deploy na Vercel falhou.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
