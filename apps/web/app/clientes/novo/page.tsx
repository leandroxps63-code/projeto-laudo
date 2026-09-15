"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed } from "@/lib/fetchAuthed";
import { headingStyle } from "@/lib/theme";
import ClienteForm, {
  EMPTY_CLIENT_FORM,
  clientFormToBody,
  validateClientDocumentClientSide,
} from "../ClienteForm";

/** Novo cliente — cadastro avulso, fora do fluxo "Nova vistoria". */
export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const docError = validateClientDocumentClientSide(form);
    if (docError) {
      setError(docError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientFormToBody(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar cliente.");

      router.push("/clientes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px 60px" }}>
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 20 }}>Novo cliente</h1>
      <ClienteForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        submitLabel="Criar cliente"
      />
    </main>
  );
}
