import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { INSPECTION_STATUS_LABELS, type InspectionStatus } from "@projeto-laudo/shared";
import { colors, headingStyle, primaryButtonStyle, secondaryButtonStyle, cardStyle } from "@/lib/theme";

/**
 * Dashboard — lista de laudos/vistorias do responsável técnico logado.
 * Tela de referência: protótipo clicável, tela "s-dash".
 */
export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: inspections } = await supabase
    .from("inspections")
    .select("id, status, created_at, buildings(name, address)")
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ ...headingStyle, fontSize: "1.4rem" }}>Meus laudos</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/clientes" style={{ ...secondaryButtonStyle, padding: "9px 16px", fontSize: "0.82rem" }}>
            Clientes
          </Link>
          <Link
            href="/vistorias/nova"
            style={{ ...primaryButtonStyle, padding: "9px 16px", fontSize: "0.82rem", textDecoration: "none" }}
          >
            + Nova vistoria
          </Link>
        </div>
      </div>

      {(!inspections || inspections.length === 0) && (
        <p style={{ color: colors.tintaMuted }}>
          Nenhuma vistoria ainda. Crie a primeira em{" "}
          <Link href="/vistorias/nova" style={{ color: colors.azul, fontWeight: 700 }}>
            Nova vistoria
          </Link>
          .
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {inspections?.map((inspection) => {
          const building = Array.isArray(inspection.buildings)
            ? inspection.buildings[0]
            : inspection.buildings;
          return (
            <li key={inspection.id}>
              <Link
                href={`/vistorias/${inspection.id}`}
                style={{
                  ...cardStyle,
                  padding: "13px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: colors.tinta }}>
                    {building?.name ?? "Edificação sem nome"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: colors.tintaMuted }}>{building?.address}</div>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: colors.azul }}>
                  {INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
