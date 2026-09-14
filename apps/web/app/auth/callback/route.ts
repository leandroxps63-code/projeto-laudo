import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Callback do OAuth (Google) — pra onde o Supabase redireciona depois que a
 * pessoa autoriza na tela do provedor. O parâmetro `code` é trocado pela
 * sessão de verdade aqui, no servidor (o code_verifier do PKCE foi salvo
 * num cookie pelo signInWithOAuth() do navegador, e só faz sentido lido
 * pelo mesmo cliente Supabase baseado em cookies — daí precisar do cliente
 * de servidor, não dá pra fazer essa troca em Client Component).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/painel";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const url = new URL("/login", origin);
  url.searchParams.set("erro", "Não foi possível entrar com o Google. Tente de novo.");
  return NextResponse.redirect(url);
}
