"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed } from "@/lib/fetchAuthed";

/**
 * Nova vistoria — cria cliente + edificação + vistoria numa tacada só.
 * Tela de referência: protótipo clicável, tela "s-novo".
 */
export default function NovaVistoriaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clientName: "",
    buildingName: "",
    address: "",
    floors: "",
  });
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
      const clientRes = await fetchAuthed("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.clientName }),
      });
      const clientData = await clientRes.json();
      if (!clientRes.ok) throw new Error(clientData.error ?? "Falha ao criar cliente.");

      const buildingRes = await fetchAuthed("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientData.client.id,
          name: form.buildingName,
          address: form.address,
          floors: form.floors ? Number(form.floors) : undefined,
        }),
      });
      const buildingData = await buildingRes.json();
      if (!buildingRes.ok) throw new Error(buildingData.error ?? "Falha ao criar edificação.");

      const inspectionRes = await fetchAuthed("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId: buildingData.building.id }),
      });
      const inspectionData = await inspectionRes.json();
      if (!inspectionRes.ok) throw new Error(inspectionData.error ?? "Falha ao criar vistoria.");

      router.push(`/vistorias/${inspectionData.inspection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 20 }}>Nova vistoria</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome do cliente" value={form.clientName} onChange={(v) => update("clientName", v)} />
        <Field
          label="Nome da edificação"
          value={form.buildingName}
          onChange={(v) => update("buildingName", v)}
        />
        <Field label="Endereço" value={form.address} onChange={(v) => update("address", v)} />
        <Field
          label="Nº de pavimentos"
          value={form.floors}
          onChange={(v) => update("floors", v)}
          type="number"
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
          {loading ? "Criando…" : "Iniciar vistoria"}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7176" }}>{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 11, borderRadius: 9, border: "1.3px solid #c9c3b4" }}
      />
    </label>
  );
}
