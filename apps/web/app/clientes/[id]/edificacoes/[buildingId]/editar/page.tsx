"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed, SESSION_EXPIRED_MESSAGE } from "@/lib/fetchAuthed";
import { colors, headingStyle, labelStyle, inputStyle, primaryButtonStyle, errorTextStyle } from "@/lib/theme";

/** Editar edificação existente. */
export default function EditarEdificacaoPage({
  params,
}: {
  params: { id: string; buildingId: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", address: "", floors: "" });
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthed(`/api/buildings/${params.buildingId}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.building) {
          setForm({
            name: data.building.name ?? "",
            address: data.building.address ?? "",
            floors: data.building.floors != null ? String(data.building.floors) : "",
          });
        } else if (res.status === 401) {
          setError(SESSION_EXPIRED_MESSAGE);
        } else {
          setError(data.error ?? "Edificação não encontrada.");
        }
        setLoadingInitial(false);
      });
  }, [params.buildingId]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed(`/api/buildings/${params.buildingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          floors: form.floors ? Number(form.floors) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar edificação.");

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
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 20 }}>Editar edificação</h1>
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
