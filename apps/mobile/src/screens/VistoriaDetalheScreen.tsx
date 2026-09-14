import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { SEVERITY_LABELS, type Severity } from "@projeto-laudo/shared";
import { supabase } from "../lib/supabase";
import { enqueueAnomaly, getPendingCount, syncPendingAnomalies } from "../lib/offlineQueue";
import PhotoMarkupModal from "../components/PhotoMarkupModal";
import type { RootStackParamList } from "../navigation/RootNavigator";

/** Erros de rede do fetch (web) e do React Native têm mensagens diferentes — cobre os dois. */
function looksLikeNetworkError(message: string | undefined) {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("network") || m.includes("failed to fetch") || m.includes("fetch failed");
}

type Props = NativeStackScreenProps<RootStackParamList, "VistoriaDetalhe">;

type CatalogEntry = {
  id: string;
  description: string;
  default_severity: Severity;
  treatment_recommendation: string;
};

type Anomaly = {
  id: string;
  code: string | null;
  environment: string;
  system_type: string;
  description: string;
  severity: Severity;
  anomaly_photos: { id: string }[];
};

const SEVERITIES: Severity[] = ["baixa", "media", "alta", "critica"];

/**
 * Lista de anomalias da vistoria + formulário de registro com sugestão do
 * catálogo (RF-07) e foto pela câmera (RF-09). Espelha apps/web/app/vistorias/[id].
 *
 * A geração do laudo (PDF/planilha, RF-10/11) acontece no portal web — o app
 * de campo foca em captura; ver nota no botão "Concluir vistoria" abaixo.
 */
export default function VistoriaDetalheScreen({ route }: Props) {
  const { inspectionId } = route.params;

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [environment, setEnvironment] = useState("");
  const [systemType, setSystemType] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [severity, setSeverity] = useState<Severity>("media");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [markupVisible, setMarkupVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadAnomalies = useCallback(async () => {
    const { data, error } = await supabase
      .from("anomalies")
      .select("id, code, environment, system_type, description, severity, anomaly_photos(id)")
      .eq("inspection_id", inspectionId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setAnomalies(data as Anomaly[]);
      setLoadFailed(false);
    } else if (error) {
      // Sem rede não é "vistoria sem anomalia" — mostrar a lista vazia aqui
      // esconderia o que já foi registrado antes de perder a conexão.
      setLoadFailed(true);
    }
    setLoadingList(false);
  }, [inspectionId]);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getPendingCount(inspectionId));
  }, [inspectionId]);

  const trySync = useCallback(async () => {
    setSyncing(true);
    const synced = await syncPendingAnomalies(inspectionId);
    setSyncing(false);
    await refreshPendingCount();
    if (synced > 0) loadAnomalies();
  }, [inspectionId, loadAnomalies, refreshPendingCount]);

  useFocusEffect(
    useCallback(() => {
      loadAnomalies();
      refreshPendingCount();
      trySync();
    }, [loadAnomalies, refreshPendingCount, trySync])
  );

  useEffect(() => {
    if (!query || (selected && selected.description === query)) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("anomaly_catalog")
        .select("id, description, default_severity, treatment_recommendation")
        .or(`description.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(6);
      setSuggestions((data as CatalogEntry[]) ?? []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  function pickSuggestion(entry: CatalogEntry) {
    setSelected(entry);
    setQuery(entry.description);
    setSeverity(entry.default_severity);
    setSuggestions([]);
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Autorize o uso da câmera para anexar uma foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setRawPhotoUri(result.assets[0].uri);
      setMarkupVisible(true);
    }
  }

  function handleMarkupConfirm(markedUri: string) {
    setPhotoUri(markedUri);
    setRawPhotoUri(null);
    setMarkupVisible(false);
  }

  async function handleAddAnomaly() {
    if (!environment || !systemType || !query) {
      setError("Preencha ambiente, sistema construtivo e a descrição da anomalia.");
      return;
    }
    setSaving(true);
    setError(null);

    // getSession() lê a sessão salva localmente no aparelho, sem chamada de
    // rede — getUser() sempre bate no servidor pra validar, e por isso
    // falhava com "sessão expirada" assim que a rede caía, mesmo com a
    // sessão local perfeitamente válida (achado testando offline de verdade
    // no celular: o app nunca chegava a cair na fila local).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setError("Sessão expirada, faça login novamente.");
      setSaving(false);
      return;
    }

    const { count } = await supabase
      .from("anomalies")
      .select("id", { count: "exact", head: true })
      .eq("inspection_id", inspectionId);
    const code = `AN-${String((count ?? 0) + 1).padStart(3, "0")}`;

    const { data: anomaly, error: anomalyError } = await supabase
      .from("anomalies")
      .insert({
        inspection_id: inspectionId,
        catalog_id: selected?.id ?? null,
        environment,
        system_type: systemType,
        description: selected?.description ?? query,
        treatment_recommendation: selected?.treatment_recommendation ?? "A definir.",
        severity,
        code,
        created_by: user.id,
      })
      .select()
      .single();

    if (anomalyError || !anomaly) {
      if (looksLikeNetworkError(anomalyError?.message)) {
        const queued = await enqueueAnomaly({
          inspection_id: inspectionId,
          environment,
          system_type: systemType,
          description: selected?.description ?? query,
          treatment_recommendation: selected?.treatment_recommendation ?? "A definir.",
          severity,
          catalog_id: selected?.id ?? null,
          photo_uri: photoUri,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

        if (!queued) {
          // Nem a fila local salvou — não dá pra fingir que está tudo bem:
          // mantém o formulário preenchido pra pessoa não perder o que já
          // digitou e poder tentar de novo (ou copiar à mão).
          setError(
            "Sem conexão e não deu pra salvar offline no aparelho. Mantenha esta tela aberta e tente de novo."
          );
          setSaving(false);
          return;
        }

        setEnvironment("");
        setSystemType("");
        setQuery("");
        setSelected(null);
        setSeverity("media");
        setPhotoUri(null);
        setSaving(false);
        setError(null);
        refreshPendingCount();
        return;
      }
      setError(anomalyError?.message ?? "Falha ao registrar anomalia.");
      setSaving(false);
      return;
    }

    if (photoUri) {
      try {
        const response = await fetch(photoUri);
        const arrayBuffer = await response.arrayBuffer();
        const path = `${inspectionId}/${anomaly.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("anomaly-photos")
          .upload(path, arrayBuffer, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        await supabase.from("anomaly_photos").insert({ anomaly_id: anomaly.id, storage_path: path });
      } catch (err) {
        setError(`Anomalia salva, mas a foto falhou: ${err instanceof Error ? err.message : "erro"}`);
      }
    }

    setEnvironment("");
    setSystemType("");
    setQuery("");
    setSelected(null);
    setSeverity("media");
    setPhotoUri(null);
    setSaving(false);
    loadAnomalies();
  }

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListHeaderComponent={
        <>
          <Text style={styles.sectionTitle}>Anomalias registradas</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                {syncing
                  ? "Sincronizando…"
                  : `${pendingCount} anomalia(s) salva(s) offline, aguardando conexão para sincronizar.`}
              </Text>
              {!syncing && (
                <TouchableOpacity onPress={trySync}>
                  <Text style={styles.pendingRetry}>Tentar agora</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {loadingList ? (
            <ActivityIndicator style={{ marginVertical: 12 }} />
          ) : loadFailed ? (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                Não deu pra atualizar a lista agora (sem conexão?). O que já foi registrado antes
                continua salvo — toque para tentar de novo.
              </Text>
              <TouchableOpacity onPress={loadAnomalies}>
                <Text style={styles.pendingRetry}>Tentar agora</Text>
              </TouchableOpacity>
            </View>
          ) : anomalies.length === 0 ? (
            <Text style={styles.empty}>Nenhuma anomalia registrada ainda.</Text>
          ) : null}
        </>
      }
      data={anomalies}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.anomalyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.anomalyTitle}>
              <Text style={styles.code}>{item.code}</Text> {item.description}
            </Text>
            <Text style={styles.anomalySubtitle}>
              {item.environment} · {item.system_type}
              {item.anomaly_photos.length > 0 ? ` · 📷 ${item.anomaly_photos.length}` : ""}
            </Text>
          </View>
          <SeverityChip severity={item.severity} />
        </View>
      )}
      ListFooterComponent={
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Nova anomalia</Text>
          <TextInput
            style={styles.input}
            placeholder="Ambiente (ex: Fachada norte — 3º pavimento)"
            value={environment}
            onChangeText={setEnvironment}
          />
          <TextInput
            style={styles.input}
            placeholder="Sistema construtivo"
            value={systemType}
            onChangeText={setSystemType}
          />
          <TextInput
            style={styles.input}
            placeholder="Buscar no banco de anomalias…"
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setSelected(null);
            }}
          />
          {suggestions.map((s) => (
            <TouchableOpacity key={s.id} style={styles.suggestion} onPress={() => pickSuggestion(s)}>
              <Text style={{ fontSize: 13 }}>
                <Text style={{ fontWeight: "700" }}>{s.description}</Text> —{" "}
                {SEVERITY_LABELS[s.default_severity]}
              </Text>
            </TouchableOpacity>
          ))}
          {selected && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>Tratamento sugerido: {selected.treatment_recommendation}</Text>
            </View>
          )}

          <View style={styles.severityRow}>
            {SEVERITIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.severityButton, severity === s && styles.severityButtonActive]}
                onPress={() => setSeverity(s)}
              >
                <Text style={severity === s ? styles.severityTextActive : styles.severityText}>
                  {SEVERITY_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
            <Text style={styles.photoButtonText}>
              {photoUri ? "Trocar foto" : "📷 Tirar foto (opcional)"}
            </Text>
          </TouchableOpacity>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleAddAnomaly} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "Salvando…" : "Registrar anomalia"}</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            O laudo (PDF/planilha) é gerado no portal web, depois que a vistoria estiver completa.
          </Text>
        </View>
      }
    />
    <PhotoMarkupModal visible={markupVisible} photoUri={rawPhotoUri} onConfirm={handleMarkupConfirm} />
    </>
  );
}

function SeverityChip({ severity }: { severity: Severity }) {
  const colors: Record<Severity, { bg: string; fg: string }> = {
    baixa: { bg: "#e2efe8", fg: "#2f7d5c" },
    media: { bg: "#f8ecdb", fg: "#c9862a" },
    alta: { bg: "#fbe8e6", fg: "#c0392b" },
    critica: { bg: "#fbe8e6", fg: "#c0392b" },
  };
  const c = colors[severity];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]}>{SEVERITY_LABELS[severity]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f6f2" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#171b1f", marginBottom: 8 },
  empty: { color: "#6b7176", marginBottom: 8 },
  pendingBanner: {
    backgroundColor: "#f8ecdb",
    borderWidth: 1,
    borderColor: "#e0b876",
    borderRadius: 9,
    padding: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  pendingBannerText: { fontSize: 12, color: "#8a5a1c", flex: 1 },
  pendingRetry: { fontSize: 12, fontWeight: "700", color: "#205e73" },
  anomalyRow: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1ddd2",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  anomalyTitle: { fontSize: 13, fontWeight: "700", color: "#171b1f" },
  anomalySubtitle: { fontSize: 11.5, color: "#6b7176", marginTop: 2 },
  code: { fontFamily: "monospace", color: "#9a9d93" },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  chipText: { fontSize: 10.5, fontWeight: "700" },
  form: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1ddd2",
    borderRadius: 11,
    padding: 14,
    gap: 10,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.3,
    borderColor: "#c9c3b4",
    borderRadius: 9,
    padding: 11,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  suggestion: { padding: 8, backgroundColor: "#f8f6f2", borderRadius: 8 },
  hint: { backgroundColor: "#e4eff1", borderWidth: 1, borderColor: "#205e73", borderRadius: 8, padding: 10 },
  hintText: { fontSize: 12, color: "#143f4d" },
  severityRow: { flexDirection: "row", gap: 6 },
  severityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.3,
    borderColor: "#c9c3b4",
    alignItems: "center",
  },
  severityButtonActive: { borderColor: "#205e73", backgroundColor: "#e4eff1" },
  severityText: { fontSize: 12, fontWeight: "700", color: "#6b7176" },
  severityTextActive: { fontSize: 12, fontWeight: "700", color: "#143f4d" },
  photoButton: {
    borderWidth: 1.3,
    borderColor: "#205e73",
    borderRadius: 9,
    padding: 11,
    alignItems: "center",
  },
  photoButtonText: { color: "#205e73", fontWeight: "700", fontSize: 13 },
  preview: { width: "100%", height: 180, borderRadius: 9 },
  error: { color: "#c0392b", fontSize: 13 },
  button: { backgroundColor: "#205e73", borderRadius: 9, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  footerNote: { fontSize: 11, color: "#9a9d93", textAlign: "center" },
});
