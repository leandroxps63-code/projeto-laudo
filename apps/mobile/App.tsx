import { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import RootNavigator from "./src/navigation/RootNavigator";

/**
 * Entrada do app — login real via Supabase Auth, mesma base do apps/web.
 * Logado, mostra a navegação real (dashboard → nova vistoria → detalhe com
 * câmera). Fila offline (expo-sqlite, já instalado) ainda não conectada —
 * hoje toda operação exige conexão com o Supabase.
 */
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (session) {
    return <RootNavigator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LoginScreen />
    </SafeAreaView>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("E-mail ou senha inválidos.");
    setLoading(false);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.brand}>Projeto Laudo</Text>
      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Senha</Text>
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Entrando…" : "Entrar"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f6f2" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  form: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  brand: { fontSize: 20, fontWeight: "800", color: "#171b1f", marginBottom: 12 },
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
  button: {
    backgroundColor: "#205e73",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
