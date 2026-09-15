"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed, SESSION_EXPIRED_MESSAGE } from "@/lib/fetchAuthed";
import { colors, headingStyle } from "@/lib/theme";
import ClienteForm, {
  EMPTY_CLIENT_FORM,
  clientRowToForm,
  clientFormToBody,
  validateClientDocumentClientSide,
} from "../../ClienteForm";

/** Editar cliente existente. */
export default function EditarClientePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthed(`/api/clients/${params.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.client) {
          setForm(clientRowToForm(data.client));
        } else if (res.status === 401) {
          setError(SESSION_EXPIRED_MESSAGE);
        } else {
          setError(data.error ?? "Cliente não encontrado.");
        }
        setLoadingInitial(false);
      });
  }, [params.id]);

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
      const res = await fetchAuthed(`/api/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientFormToBody(form)),
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
      <main style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px" }}>
        <p style={{ color: colors.tintaMuted }}>Carregando…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px 60px" }}>
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 20 }}>Editar cliente</h1>
      <ClienteForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        submitLabel="Salvar alterações"
      />
    </main>
  );
}
