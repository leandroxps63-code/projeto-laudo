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

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("inspections")
      .select("id, status, buildings(name, address)")
      .order("created_at", { ascending: false });
    if (!error && data) setInspections(data as InspectionRow[]);
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
