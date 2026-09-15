"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
 * Definir nova senha — chegada aqui só acontece depois de /auth/callback
 * trocar o code do link de recuperação por uma sessão de verdade (mesmo
 * mecanismo do login com Google), então já existe sessão ativa quando esta
 * tela carrega.
 */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(`${error.message} (${error.status ?? error.name})`);
      setLoading(false);
      return;
    }

    router.push("/painel");
    router.refresh();
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
          <h1 style={{ ...headingStyle, fontSize: "1.5rem", marginTop: 8 }}>Nova senha</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ ...cardStyle, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelStyle}>Nova senha</span>
            <div style={{ position: "relative", display: "flex" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 60, width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: colors.azul,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <span style={{ fontSize: 11, color: colors.tintaFaint }}>Mínimo de 6 caracteres.</span>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelStyle}>Confirmar nova senha</span>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </main>
  );
}
