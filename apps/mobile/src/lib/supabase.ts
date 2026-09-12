import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient } from "@projeto-laudo/shared";

// Expo expõe variáveis prefixadas com EXPO_PUBLIC_ automaticamente via process.env.
// AsyncStorage é obrigatório aqui — sem ele a sessão fica só em memória
// (React Native não tem window.localStorage) e "sessão expirada" aparece
// mesmo com login válido, especialmente sob condições de rede instável.
export const supabase = createSupabaseClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  AsyncStorage
);
