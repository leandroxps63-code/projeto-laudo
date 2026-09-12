import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "NovaVistoria">;

/** Cria cliente + edificação + vistoria numa tacada só (RF-01). Espelha apps/web/app/vistorias/nova. */
export default function NovaVistoriaScreen({ navigation }: Props) {
  const [clientName, setClientName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [floors, setFloors] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!clientName || !buildingName || !address) {
      setError("Preencha nome do cliente, edificação e endereço.");
      return;
    }
    setLoading(true);
    setError(null);

    // getSession() lê a sessão local sem chamada de rede — getUser() bate no
    // servidor e falha com "sessão expirada" enganoso quando está offline.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setError("Sessão expirada, faça login novamente.");
      setLoading(false);
      return;
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({ name: clientName, created_by: user.id })
      .select()
      .single();
    if (clientError || !client) {
      setError(clientError?.message ?? "Falha ao criar cliente.");
      setLoading(false);
      return;
    }

    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .insert({
        client_id: client.id,
        name: buildingName,
        address,
        floors: floors ? Number(floors) : null,
      })
      .select()
      .single();
    if (buildingError || !building) {
      setError(buildingError?.message ?? "Falha ao criar edificação.");
      setLoading(false);
      return;
    }

    const { data: inspection, error: inspectionError } = await supabase
      .from("inspections")
      .insert({ building_id: building.id, responsible_id: user.id })
      .select()
      .single();
    if (inspectionError || !inspection) {
      setError(inspectionError?.message ?? "Falha ao criar vistoria.");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigation.replace("VistoriaDetalhe", {
      inspectionId: inspection.id,
      buildingName: building.name,
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Field label="Nome do cliente" value={clientName} onChangeText={setClientName} />
      <Field label="Nome da edificação" value={buildingName} onChangeText={setBuildingName} />
      <Field label="Endereço" value={address} onChangeText={setAddress} />
      <Field
        label="Nº de pavimentos (opcional)"
        value={floors}
        onChangeText={setFloors}
        keyboardType="numeric"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Criando…" : "Iniciar vistoria"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f6f2" },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7176" },
  input: {
    borderWidth: 1.3,
    borderColor: "#c9c3b4",
    borderRadius: 9,
    padding: 11,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  error: { color: "#c0392b", fontSize: 13 },
  button: { backgroundColor: "#205e73", borderRadius: 10, padding: 13, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
});
