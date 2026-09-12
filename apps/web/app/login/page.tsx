"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

/**
 * Login real via Supabase Auth (e-mail + senha).
 * Telas de referência: protótipo clicável (Notion do projeto), tela "s-login".
 */
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    router.push("/");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 24 }}>
        Projeto Laudo
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20 }}>
        <a href="/privacidade" style={{ fontSize: 12, color: "#9a9d93" }}>
          Política de privacidade
        </a>
      </p>
    </main>
  );
}
