import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente Supabase compartilhado entre apps/web e apps/mobile, já tipado
 * com o schema real (database.types.ts, gerado do projeto "projeto-laudo-dev").
 * Cada app passa suas próprias variáveis de ambiente (Next.js usa
 * process.env.NEXT_PUBLIC_*, Expo usa process.env.EXPO_PUBLIC_*).
 *
 * `storage` é obrigatório no mobile: sem `window.localStorage` (que não
 * existe em React Native), `persistSession: true` sozinho guarda a sessão
 * só em memória — o que causa erros de "sessão expirada" sob condições
 * específicas mesmo com a sessão válida (achado testando offline de
 * verdade). Web deixa em branco e usa o localStorage do navegador, que o
 * supabase-js já detecta sozinho.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  storage?: SupportedStorage
): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL/anon key ausentes. Configure as variáveis de ambiente (ver README do app)."
    );
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      ...(storage ? { storage } : {}),
    },
  });
}
