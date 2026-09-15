"use client";

import { createClient } from "@/lib/supabase-browser";
import { colors } from "@/lib/theme";

/**
 * Botão "Continuar com o Google" — mesmo componente em /login e /cadastro,
 * já que OAuth não distingue entrar de cadastrar (o Supabase cria a conta
 * sozinho no primeiro login, via o trigger que já existe em
 * private.handle_new_user). Estilo segue as diretrizes de marca do Google
 * (fundo branco, "G" colorido, texto neutro) — não a paleta do produto,
 * de propósito, é convenção que a pessoa já reconhece.
 */
export default function GoogleButton({
  disabled,
  beforeClick,
}: {
  disabled?: boolean;
  /** Roda antes do redirect pro Google — retornar false cancela o clique (ex: falta aceitar a política de privacidade). */
  beforeClick?: () => boolean;
}) {
  async function handleClick() {
    if (beforeClick && !beforeClick()) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        padding: 12,
        borderRadius: 10,
        border: `1.3px solid ${colors.pedra}`,
        background: "#fff",
        color: "#1f1f1f",
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
        />
      </svg>
      Continuar com o Google
    </button>
  );
}
