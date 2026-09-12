import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@projeto-laudo/shared";

/**
 * Monitoramento de erros self-hosted (decisão l4, Fase 06): grava na tabela
 * `error_log` em vez de depender de um serviço externo pago (Sentry/
 * PostHog) — mesma lógica da decisão a5 do PDF. Nunca deixa a falha de log
 * derrubar a requisição que estava sendo tratada.
 */
export async function logError(
  supabase: SupabaseClient<Database>,
  source: string,
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;

  try {
    await supabase
      .from("error_log")
      .insert({ source, message, stack, context: (context as Json) ?? null });
  } catch {
    // logging nunca deve quebrar a resposta real ao usuário
  }
}
