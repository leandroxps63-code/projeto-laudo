"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/** Nova edificação vinculada a um cliente já existente. */
export default function NovaEdificacaoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", address: "", floors: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: params.id,
          name: form.name,
          address: form.address,
          floors: form.floors ? Number(form.floors) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar edificação.");

      router.push("/clientes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 20 }}>Nova edificação</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome da edificação" value={form.name} onChange={(v) => update("name", v)} />
        <Field label="Endereço" value={form.address} onChange={(v) => update("address", v)} />
        <Field
          label="Nº de pavimentos (opcional)"
          value={form.floors}
          onChange={(v) => update("floors", v)}
          type="number"
          required={false}
        />
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
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
          {loading ? "Salvando…" : "Criar edificação"}
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
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 11, borderRadius: 9, border: "1.3px solid #c9c3b4" }}
      />
    </label>
  );
}
