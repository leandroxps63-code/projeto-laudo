"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

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
      <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 12 }}>Quase lá</h1>
        <p style={{ color: "#3a3f44", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Mandamos um link de confirmação pra <strong>{email}</strong>. Confirme o e-mail e volte
          aqui pra entrar.
        </p>
        <p style={{ marginTop: 20 }}>
          <a href="/login" style={{ color: "#205e73", fontWeight: 700, fontSize: "0.85rem" }}>
            Ir para o login
          </a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 24 }}>Criar conta</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>Nome</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 11, borderRadius: 9, border: "1.3px solid #c9c3b4" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 11, borderRadius: 9, border: "1.3px solid #c9c3b4" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>Senha</span>
          <div style={{ position: "relative", display: "flex" }}>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: 11,
                paddingRight: 60,
                borderRadius: 9,
                border: "1.3px solid #c9c3b4",
                width: "100%",
              }}
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
                color: "#205e73",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 6px",
              }}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <span style={{ fontSize: 11, color: "#9a9d93" }}>Mínimo de 6 caracteres.</span>
        </label>
        {error && (
          <p role="alert" style={{ color: "#c0392b", fontSize: 13 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 13,
            borderRadius: 10,
            border: "none",
            background: "#205e73",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Criando conta…" : "Criar conta"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b7176" }}>
        Já tem conta?{" "}
        <a href="/login" style={{ color: "#205e73", fontWeight: 700 }}>
          Entrar
        </a>
      </p>
    </main>
  );
}
