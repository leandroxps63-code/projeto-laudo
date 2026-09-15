"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  colors,
  fontMono,
  labelStyle,
  inputStyle,
  primaryButtonStyle,
  cardStyle,
  errorTextStyle,
  headingStyle,
} from "@/lib/theme";

/**
 * Recuperação de senha — manda o link de redefinição por e-mail. Reaproveita
 * /auth/callback (mesma troca de code->sessão do login com Google) com
 * next=/redefinir-senha, em vez de duplicar a lógica de PKCE aqui.
 */
export default function RecuperarSenhaPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });

    if (error) {
      setError(`${error.message} (${error.status ?? error.name})`);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 65px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div style={{ ...cardStyle, padding: 28, maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ ...headingStyle, fontSize: "1.3rem", marginBottom: 12 }}>Quase lá</h1>
          <p style={{ color: colors.tintaMuted, fontSize: "0.9rem", lineHeight: 1.6 }}>
            Se <strong>{email}</strong> tiver uma conta, mandamos um link pra redefinir a senha.
          </p>
          <p style={{ marginTop: 20 }}>
            <a href="/login" style={{ color: colors.azul, fontWeight: 700, fontSize: "0.85rem" }}>
              Voltar pro login
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 65px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span
            style={{
              fontFamily: fontMono,
              fontSize: "0.72rem",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: colors.azul,
            }}
          >
            NBR 16.747 · Inspeção Predial
          </span>
          <h1 style={{ ...headingStyle, fontSize: "1.5rem", marginTop: 8 }}>Recuperar senha</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ ...cardStyle, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelStyle}>E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>
          {error && (
            <p role="alert" style={errorTextStyle}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Enviando…" : "Enviar link de recuperação"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: colors.tintaMuted }}>
          <a href="/login" style={{ color: colors.azul, fontWeight: 700 }}>
            Voltar pro login
          </a>
        </p>
      </div>
    </main>
  );
}
