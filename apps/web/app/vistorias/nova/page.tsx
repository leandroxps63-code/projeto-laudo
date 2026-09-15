"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed, SESSION_EXPIRED_MESSAGE } from "@/lib/fetchAuthed";
import {
  colors,
  headingStyle,
  labelStyle,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  cardStyle,
  errorTextStyle,
} from "@/lib/theme";

type Building = { id: string; name: string; address: string; floors: number | null };
type ClientWithBuildings = { id: string; name: string; buildings: Building[] };

/**
 * Nova vistoria — por padrão deixa escolher um cliente/edificação já
 * cadastrado (evita duplicar cliente pra vistoria recorrente, o mesmo
 * problema que o mobile já resolvia em SelecionarClienteScreen). "+
 * Cliente novo" abre o formulário de criar do zero.
 */
export default function NovaVistoriaPage() {
  const [mode, setMode] = useState<"escolher" | "novo">("escolher");

  if (mode === "novo") {
    return <NovoClienteForm onBack={() => setMode("escolher")} />;
  }
  return <EscolherCliente onNovoCliente={() => setMode("novo")} />;
}

function EscolherCliente({ onNovoCliente }: { onNovoCliente: () => void }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithBuildings[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [query, setQuery] = useState("");
  const [startingBuildingId, setStartingBuildingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  function load() {
    setLoadingClients(true);
    fetchAuthed("/api/clients")
      .then(async (res) => {
        if (res.status === 401) {
          setSessionExpired(true);
          setLoadingClients(false);
          return;
        }
        const data = await res.json();
        if (res.ok) {
          setClients(data.clients ?? []);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
        setLoadingClients(false);
      })
      .catch(() => {
        setLoadFailed(true);
        setLoadingClients(false);
      });
  }

  useEffect(load, []);

  async function startInspection(buildingId: string) {
    setPickError(null);
    setStartingBuildingId(buildingId);

    const res = await fetchAuthed("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) setSessionExpired(true);
      setPickError(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error ?? "Falha ao iniciar vistoria.");
      setStartingBuildingId(null);
      return;
    }

    router.push(`/vistorias/${data.inspection.id}`);
  }

  const filtered = query
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  return (
    <main style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px 60px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ ...headingStyle, fontSize: "1.2rem" }}>Nova vistoria</h1>
        <button
          type="button"
          onClick={onNovoCliente}
          style={{ ...secondaryButtonStyle, padding: "8px 14px", fontSize: "0.8rem" }}
        >
          + Cliente novo
        </button>
      </div>

      {sessionExpired && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: colors.erroBg,
            color: colors.erro,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <span>{SESSION_EXPIRED_MESSAGE}</span>
          <a href="/login" style={{ color: colors.erro, fontWeight: 700, whiteSpace: "nowrap" }}>
            Fazer login
          </a>
        </div>
      )}

      {!sessionExpired && (
        <input
          placeholder="Buscar cliente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }}
        />
      )}

      {pickError && <p style={{ ...errorTextStyle, marginBottom: 14 }}>{pickError}</p>}

      {sessionExpired ? null : loadingClients ? (
        <p style={{ color: colors.tintaMuted }}>Carregando…</p>
      ) : loadFailed ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: colors.ambarTint,
            color: "#8a5a1c",
            fontSize: 13,
          }}
        >
          <span>Não deu pra carregar seus clientes agora (sem conexão?).</span>
          <button
            type="button"
            onClick={load}
            style={{ background: "none", border: "none", color: "#8a5a1c", fontWeight: 700, cursor: "pointer" }}
          >
            Tentar agora
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: colors.tintaMuted, fontSize: 13.5 }}>
          {clients.length === 0
            ? 'Nenhum cliente cadastrado ainda. Toque em "+ Cliente novo" para começar.'
            : "Nenhum cliente encontrado com esse nome."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((client) => (
            <li key={client.id} style={{ ...cardStyle, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: colors.tinta, marginBottom: client.buildings.length ? 8 : 0 }}>
                {client.name}
              </div>
              {client.buildings.length === 0 ? (
                <p style={{ fontSize: 12, color: colors.tintaFaint, margin: 0 }}>Nenhuma edificação cadastrada.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {client.buildings.map((building) => (
                    <li
                      key={building.id}
                      style={{
                        background: colors.concreto,
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: "0.82rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span>
                        <span style={{ fontWeight: 600, color: colors.tinta }}>{building.name}</span>
                        <span style={{ color: colors.tintaMuted }}> — {building.address}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => startInspection(building.id)}
                        disabled={startingBuildingId === building.id}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: colors.azul,
                          fontWeight: 700,
                          fontSize: "0.74rem",
                          cursor: startingBuildingId === building.id ? "default" : "pointer",
                          opacity: startingBuildingId === building.id ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {startingBuildingId === building.id ? "Iniciando…" : "Iniciar vistoria"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NovoClienteForm({ onBack }: { onBack: () => void }) {
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
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: colors.tintaMuted,
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        ← Voltar pra escolher cliente
      </button>
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 8 }}>Cliente novo</h1>
      <p style={{ fontSize: 12.5, color: colors.tintaMuted, marginBottom: 20 }}>
        Use só quando o cliente ainda não existe. Depois clique em Editar em{" "}
        <a href="/clientes" style={{ color: colors.azul, fontWeight: 700 }}>
          Clientes
        </a>{" "}
        pra completar CPF/CNPJ, endereço e contato.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome do cliente" value={form.clientName} onChange={(v) => update("clientName", v)} />
        <Field
          label="Nome da edificação"
          value={form.buildingName}
          onChange={(v) => update("buildingName", v)}
        />
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
