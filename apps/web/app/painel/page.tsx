import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { INSPECTION_STATUS_LABELS, type InspectionStatus } from "@projeto-laudo/shared";
import { colors, headingStyle, primaryButtonStyle, secondaryButtonStyle, cardStyle } from "@/lib/theme";

/**
 * Dashboard — lista de laudos/vistorias do responsável técnico logado (e da
 * equipe, se houver — RLS de inspections já inclui os colegas de conta).
 * Cada card mostra cliente, última atividade e contagem de anomalia grave em
 * aberto, pra dar pra priorizar o dia sem abrir cada vistoria.
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
    .select("id, status, created_at, buildings(name, address, clients(name)), anomalies(severity, created_at)")
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
          const client = building
            ? Array.isArray(building.clients)
              ? building.clients[0]
              : building.clients
            : null;

          const anomalies = inspection.anomalies ?? [];
          const criticalCount = anomalies.filter((a) => a.severity === "critica").length;
          const highCount = anomalies.filter((a) => a.severity === "alta").length;
          const lastActivity = anomalies.reduce<string>(
            (latest, a) => (a.created_at > latest ? a.created_at : latest),
            inspection.created_at
          );

          return (
            <li key={inspection.id}>
              <Link
                href={`/vistorias/${inspection.id}`}
                style={{
                  ...cardStyle,
                  padding: "13px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: colors.tinta }}>
                    {building?.name ?? "Edificação sem nome"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: colors.tintaMuted }}>
                    {[client?.name, building?.address].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: colors.tintaFaint, marginTop: 3 }}>
                    Última atividade em {new Date(lastActivity).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: colors.azul, whiteSpace: "nowrap" }}>
                    {INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus]}
                  </span>
                  {(criticalCount > 0 || highCount > 0) && (
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: colors.erro,
                        background: colors.erroBg,
                        padding: "2px 8px",
                        borderRadius: 100,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {[
                        criticalCount > 0 ? `${criticalCount} crítica${criticalCount > 1 ? "s" : ""}` : null,
                        highCount > 0 ? `${highCount} alta${highCount > 1 ? "s" : ""}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      em aberto
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
