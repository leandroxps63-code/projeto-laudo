"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
 * Cadastro self-service — cria a conta de verdade via Supabase Auth. O
 * full_name vai em options.data pra virar o full_name do profiles
 * automaticamente (trigger private.handle_new_user, migration 0016/0017).
 *
 * signUp() sempre retorna data.user; data.session só vem preenchida se o
 * projeto não exigir confirmação de e-mail (ou se já confirmar na hora).
 * Não dá pra saber isso de antemão sem acessar a configuração do projeto,
 * então o fluxo trata os dois casos: com sessão, entra direto; sem sessão,
 * avisa pra confirmar o e-mail antes de entrar.
 */
export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      setError(`${error.message} (${error.status ?? error.name})`);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/painel");
      router.refresh();
      return;
    }

    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
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
            Mandamos um link de confirmação pra <strong>{email}</strong>. Confirme o e-mail e
            volte aqui pra entrar.
          </p>
          <p style={{ marginTop: 20 }}>
            <a href="/login" style={{ color: colors.azul, fontWeight: 700, fontSize: "0.85rem" }}>
              Ir para o login
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
          <h1 style={{ ...headingStyle, fontSize: "1.5rem", marginTop: 8 }}>Criar conta</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ ...cardStyle, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelStyle}>Nome</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </label>
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
            {loading ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <span style={{ flex: 1, height: 1, background: colors.pedra }} />
          <span style={{ fontSize: 11.5, color: colors.tintaFaint }}>ou</span>
          <span style={{ flex: 1, height: 1, background: colors.pedra }} />
        </div>
        <GoogleButton disabled={loading} />

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: colors.tintaMuted }}>
          Já tem conta?{" "}
          <a href="/login" style={{ color: colors.azul, fontWeight: 700 }}>
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
