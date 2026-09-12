import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import ClienteCard from "./ClienteCard";

/**
 * Listagem de clientes e edificações — gestão avulsa, fora do fluxo "Nova vistoria".
 */
export default async function ClientesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, email, phone, buildings(id, name, address, floors)")
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Clientes e edificações</h1>
        <Link
          href="/clientes/novo"
          style={{
            padding: "9px 16px",
            borderRadius: 9,
            background: "#205e73",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.82rem",
            textDecoration: "none",
          }}
        >
          + Novo cliente
        </Link>
      </div>

      {error && <p style={{ color: "#c0392b" }}>{error.message}</p>}

      {!error && (!clients || clients.length === 0) && (
        <p style={{ color: "#6b7176" }}>
          Nenhum cliente ainda. Crie o primeiro em{" "}
          <Link href="/clientes/novo" style={{ color: "#205e73", fontWeight: 700 }}>
            Novo cliente
          </Link>
          .
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {clients?.map((client) => (
          <ClienteCard key={client.id} client={client} />
        ))}
      </ul>
    </main>
  );
}
