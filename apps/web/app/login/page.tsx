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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos. Confira e tente de novo.");
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
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 11, borderRadius: 9, border: "1.3px solid #c9c3b4" }}
          />
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
