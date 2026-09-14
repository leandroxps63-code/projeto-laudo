"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed, SESSION_EXPIRED_MESSAGE } from "@/lib/fetchAuthed";
import { colors, headingStyle, labelStyle, inputStyle, primaryButtonStyle, errorTextStyle } from "@/lib/theme";

/** Editar cliente existente. */
export default function EditarClientePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthed(`/api/clients/${params.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.client) {
          setForm({
            name: data.client.name ?? "",
            email: data.client.email ?? "",
            phone: data.client.phone ?? "",
          });
        } else if (res.status === 401) {
          setError(SESSION_EXPIRED_MESSAGE);
        } else {
          setError(data.error ?? "Cliente não encontrado.");
        }
        setLoadingInitial(false);
      });
  }, [params.id]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed(`/api/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar cliente.");

      router.push("/clientes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  if (loadingInitial) {
    return (
      <main style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>
        <p style={{ color: colors.tintaMuted }}>Carregando…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 20 }}>Editar cliente</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome" value={form.name} onChange={(v) => update("name", v)} required />
        <Field label="E-mail (opcional)" value={form.email} onChange={(v) => update("email", v)} type="email" />
        <Field label="Telefone (opcional)" value={form.phone} onChange={(v) => update("phone", v)} />
        {error && <p style={errorTextStyle}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}
        >
          {loading ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}
