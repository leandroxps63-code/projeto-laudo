"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Building = {
  id: string;
  name: string;
  address: string;
  floors: number | null;
};

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  buildings: Building[];
};

type PendingDelete =
  | { kind: "client"; id: string; label: string }
  | { kind: "building"; id: string; label: string };

/** Card de um cliente com suas edificações, ações de editar/excluir para ambos. */
export default function ClienteCard({ client }: { client: Client }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startingInspectionId, setStartingInspectionId] = useState<string | null>(null);

  async function startInspection(buildingId: string) {
    setError(null);
    setStartingInspectionId(buildingId);

    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Falha ao iniciar vistoria.");
      setStartingInspectionId(null);
      return;
    }

    router.push(`/vistorias/${data.inspection.id}`);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);

    const url =
      pendingDelete.kind === "client" ? `/api/clients/${pendingDelete.id}` : `/api/buildings/${pendingDelete.id}`;
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Falha ao excluir.");
      setDeleting(false);
      setPendingDelete(null);
      return;
    }

    setDeleting(false);
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <li style={{ border: "1px solid #e1ddd2", borderRadius: 11, padding: "14px 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{client.name}</div>
          {(client.email || client.phone) && (
            <div style={{ fontSize: "0.78rem", color: "#6b7176" }}>
              {[client.email, client.phone].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, whiteSpace: "nowrap", fontSize: "0.78rem" }}>
          <Link href={`/clientes/${client.id}/edificacoes/nova`} style={{ color: "#205e73", fontWeight: 700 }}>
            + Edificação
          </Link>
          <Link href={`/clientes/${client.id}/editar`} style={{ color: "#6b7176", fontWeight: 700 }}>
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setPendingDelete({ kind: "client", id: client.id, label: client.name })}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#c0392b",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Excluir
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#c0392b", fontSize: 12, marginBottom: 8 }}>{error}</p>}

      {client.buildings.length === 0 ? (
        <p style={{ fontSize: "0.78rem", color: "#9a9d93", margin: 0 }}>Nenhuma edificação cadastrada.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {client.buildings.map((building) => (
            <li
              key={building.id}
              style={{
                background: "#faf8f3",
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
                <span style={{ fontWeight: 600 }}>{building.name}</span>
                <span style={{ color: "#6b7176" }}>
                  {" "}
                  — {building.address}
                  {building.floors ? ` · ${building.floors} pavimentos` : ""}
                </span>
              </span>
              <span style={{ display: "flex", gap: 10, whiteSpace: "nowrap", fontSize: "0.74rem" }}>
                <button
                  type="button"
                  onClick={() => startInspection(building.id)}
                  disabled={startingInspectionId === building.id}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#205e73",
                    fontWeight: 700,
                    fontSize: "0.74rem",
                    cursor: startingInspectionId === building.id ? "default" : "pointer",
                    opacity: startingInspectionId === building.id ? 0.6 : 1,
                  }}
                >
                  {startingInspectionId === building.id ? "Iniciando…" : "Nova vistoria"}
                </button>
                <Link
                  href={`/clientes/${client.id}/edificacoes/${building.id}/editar`}
                  style={{ color: "#6b7176", fontWeight: 700 }}
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ kind: "building", id: building.id, label: building.name })}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#c0392b",
                    fontWeight: 700,
                    fontSize: "0.74rem",
                    cursor: "pointer",
                  }}
                >
                  Excluir
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,20,18,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 22,
              maxWidth: 360,
              width: "90%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <p style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 6 }}>
              Excluir {pendingDelete.kind === "client" ? "cliente" : "edificação"}?
            </p>
            <p style={{ fontSize: "0.82rem", color: "#6b7176", marginBottom: 18 }}>
              Tem certeza que quer excluir <strong>{pendingDelete.label}</strong>? Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  border: "1.3px solid #c9c3b4",
                  background: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: deleting ? "default" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: "#c0392b",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: deleting ? "default" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
