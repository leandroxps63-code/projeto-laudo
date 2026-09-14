import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { INSPECTION_STATUS_LABELS, type InspectionStatus } from "@projeto-laudo/shared";
import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

type InspectionRow = {
  id: string;
  status: InspectionStatus;
  buildings: { name: string; address: string } | { name: string; address: string }[] | null;
};

/** Dashboard — lista as vistorias do responsável técnico logado. Espelha apps/web/app/page.tsx. */
export default function DashboardScreen({ navigation }: Props) {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("inspections")
      .select("id, status, buildings(name, address)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setInspections(data as InspectionRow[]);
      setLoadFailed(false);
    } else if (error) {
      // Não deixar a lista de vistorias somem da tela por uma falha de
      // carregamento — isso pareceria "perdi meus dados" e, pior, pode levar
      // a pessoa a tocar em "+ Nova vistoria" e duplicar cliente/edificação
      // que já existe (o mesmo problema que a SelecionarClienteScreen existe
      // pra evitar).
      setLoadFailed(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function getBuilding(row: InspectionRow) {
    return Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("SelecionarCliente")}>
          <Text style={styles.primaryButtonText}>+ Nova vistoria</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : loadFailed ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            Não deu pra carregar suas vistorias agora (sem conexão?). Toque para tentar de novo.
          </Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.errorBannerRetry}>Tentar agora</Text>
          </TouchableOpacity>
        </View>
      ) : inspections.length === 0 ? (
        <Text style={styles.empty}>Nenhuma vistoria ainda. Toque em "+ Nova vistoria" para começar.</Text>
      ) : (
        <FlatList
          data={inspections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => {
            const building = getBuilding(item);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  navigation.navigate("VistoriaDetalhe", {
                    inspectionId: item.id,
                    buildingName: building?.name ?? "Vistoria",
                  })
                }
              >
                <View>
                  <Text style={styles.cardTitle}>{building?.name ?? "Edificação sem nome"}</Text>
                  <Text style={styles.cardSubtitle}>{building?.address}</Text>
                </View>
                <Text style={styles.cardStatus}>{INSPECTION_STATUS_LABELS[item.status]}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f6f2", padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 },
  primaryButton: { backgroundColor: "#205e73", borderRadius: 9, paddingVertical: 10, paddingHorizontal: 16 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { color: "#6b7176", marginTop: 8 },
  errorBanner: {
    backgroundColor: "#f8ecdb",
    borderWidth: 1,
    borderColor: "#e0b876",
    borderRadius: 9,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  errorBannerText: { fontSize: 12.5, color: "#8a5a1c" },
  errorBannerRetry: { fontSize: 12.5, fontWeight: "700", color: "#205e73" },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1ddd2",
    borderRadius: 11,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontWeight: "700", fontSize: 14, color: "#171b1f" },
  cardSubtitle: { fontSize: 12, color: "#6b7176", marginTop: 2 },
  cardStatus: { fontSize: 11, fontWeight: "700", color: "#205e73" },
});
