import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "SelecionarCliente">;

type Building = { id: string; name: string; address: string; floors: number | null };
type ClientRow = { id: string; name: string; buildings: Building[] };

/**
 * Escolher cliente/edificação já cadastrados pra iniciar uma vistoria sem
 * duplicar registro — o atalho "+ Cliente novo" (NovaVistoriaScreen) sempre
 * cria cliente+edificação do zero, então usá-lo pra um cliente recorrente
 * duplicava dado (mesmo bug já corrigido no site, em
 * apps/web/app/clientes/ClienteCard.tsx — botão "Nova vistoria" em cada
 * edificação já cadastrada). Aqui é a mesma lógica, como tela própria já
 * que o mobile não tem uma lista de clientes/edificações fora desse fluxo.
 */
export default function SelecionarClienteScreen({ navigation }: Props) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [startingBuildingId, setStartingBuildingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, buildings(id, name, address, floors)")
      .order("created_at", { ascending: false });
    if (!error && data) setClients(data as unknown as ClientRow[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function startInspection(building: Building) {
    setError(null);
    setStartingBuildingId(building.id);

    // getSession() lê a sessão local sem chamada de rede — mesmo motivo do
    // resto do app (ver NovaVistoriaScreen/VistoriaDetalheScreen): evita
    // "sessão expirada" enganoso quando a rede está ruim em campo.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setError("Sessão expirada, faça login novamente.");
      setStartingBuildingId(null);
      return;
    }

    const { data: inspection, error: inspectionError } = await supabase
      .from("inspections")
      .insert({ building_id: building.id, responsible_id: user.id })
      .select()
      .single();

    if (inspectionError || !inspection) {
      setError(inspectionError?.message ?? "Falha ao iniciar vistoria.");
      setStartingBuildingId(null);
      return;
    }

    navigation.replace("VistoriaDetalhe", {
      inspectionId: inspection.id,
      buildingName: building.name,
    });
  }

  const filtered = query
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate("NovaVistoria")}>
        <Text style={styles.newButtonText}>+ Cliente novo</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.search}
        placeholder="Buscar cliente…"
        value={query}
        onChangeText={setQuery}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>
          {clients.length === 0
            ? 'Nenhum cliente cadastrado ainda. Toque em "+ Cliente novo" para começar.'
            : "Nenhum cliente encontrado."}
        </Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.clientCard}>
              <Text style={styles.clientName}>{item.name}</Text>
              {item.buildings.length === 0 ? (
                <Text style={styles.noBuilding}>Nenhuma edificação cadastrada.</Text>
              ) : (
                item.buildings.map((building) => (
                  <TouchableOpacity
                    key={building.id}
                    style={styles.buildingRow}
                    onPress={() => startInspection(building)}
                    disabled={startingBuildingId === building.id}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.buildingName}>{building.name}</Text>
                      <Text style={styles.buildingAddress}>{building.address}</Text>
                    </View>
                    <Text style={styles.startLabel}>
                      {startingBuildingId === building.id ? "Iniciando…" : "Iniciar"}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f6f2", padding: 16 },
  newButton: {
    backgroundColor: "#205e73",
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  newButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  search: {
    borderWidth: 1.3,
    borderColor: "#c9c3b4",
    borderRadius: 9,
    padding: 11,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  error: { color: "#c0392b", fontSize: 13, marginBottom: 10 },
  empty: { color: "#6b7176", marginTop: 8 },
  clientCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1ddd2",
    borderRadius: 11,
    padding: 14,
    gap: 8,
  },
  clientName: { fontWeight: "700", fontSize: 14, color: "#171b1f" },
  noBuilding: { fontSize: 12, color: "#9a9d93" },
  buildingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#faf8f3",
    borderRadius: 8,
    padding: 10,
  },
  buildingName: { fontWeight: "600", fontSize: 13, color: "#171b1f" },
  buildingAddress: { fontSize: 11.5, color: "#6b7176", marginTop: 2 },
  startLabel: { color: "#205e73", fontWeight: "700", fontSize: 12.5 },
});
