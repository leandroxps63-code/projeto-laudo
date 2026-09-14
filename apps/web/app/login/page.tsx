"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import GoogleButton from "../components/GoogleButton";
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
 * Login real via Supabase Auth (e-mail + senha).
 * Telas de referência: protótipo clicável (Notion do projeto), tela "s-login".
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const erro = searchParams.get("erro");
    if (erro) setError(erro);
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Mostra a mensagem real do Supabase em vez de sempre dizer "senha
      // inválida" — um erro genérico esconde causas como chave de API ou
      // projeto errado por trás do mesmo texto de "senha errada".
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
          <h1 style={{ ...headingStyle, fontSize: "1.5rem", marginTop: 8 }}>Entrar</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            ...cardStyle,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
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
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelStyle}>Senha</span>
            <div style={{ position: "relative", display: "flex" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
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
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <span style={{ flex: 1, height: 1, background: colors.pedra }} />
          <span style={{ fontSize: 11.5, color: colors.tintaFaint }}>ou</span>
          <span style={{ flex: 1, height: 1, background: colors.pedra }} />
        </div>
        <GoogleButton disabled={loading} />

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: colors.tintaMuted }}>
          Não tem conta?{" "}
          <a href="/cadastro" style={{ color: colors.azul, fontWeight: 700 }}>
            Cadastre-se
          </a>
        </p>
        <p style={{ textAlign: "center", marginTop: 10 }}>
          <a href="/privacidade" style={{ fontSize: 12, color: colors.tintaFaint }}>
            Política de privacidade
          </a>
        </p>
      </div>
    </main>
  );
}
