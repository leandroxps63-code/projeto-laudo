import type { Metadata } from "next";
import SiteHeader from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "Projeto Laudo",
  description: "Laudos de inspeção predial — do app de campo ao documento pronto.",
};

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
