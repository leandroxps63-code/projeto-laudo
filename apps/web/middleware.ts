import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Reforço de UX: redireciona pro login quem tenta abrir uma página
 * autenticada sem sessão, antes do React renderizar (hoje só o dashboard
 * "/" tinha esse guard, via redirect() dentro do server component — as
 * páginas client component como /vistorias/* e /clientes/* dependiam só
 * da API retornar 401, o que "funciona" mas deixa a tela vazia piscando).
 * A autorização de verdade continua sendo RLS + getUser() em cada rota —
 * isso aqui não substitui aquilo, só evita a tela vazia/errada.
 */

const PUBLIC_PATHS = ["/login", "/laudos/compartilhado", "/privacidade"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Exclui assets estáticos, ícones/favicon (rotas de convenção do App
  // Router: app/icon.png, app/apple-icon.png — sem isso, o navegador pede
  // o favicon deslogado e cai no redirect pro /login, deixando o ícone
  // quebrado até em página pública como o próprio /login) e toda a API
  // (as rotas de API já reforçam auth internamente via getUser()/RLS e
  // devem responder JSON, não redirect). Achado testando o favicon de
  // verdade no Chrome, deslogado.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|api).*)",
  ],
};
