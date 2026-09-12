import { Alert, Text, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";

/** Botão de logout no header — aparece em todas as telas do app autenticado. */
export default function LogoutButton() {
  function handlePress() {
    Alert.alert("Sair", "Deseja encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={{ color: "#c0392b", fontWeight: "700", fontSize: 13 }}>Sair</Text>
    </TouchableOpacity>
  );
}
