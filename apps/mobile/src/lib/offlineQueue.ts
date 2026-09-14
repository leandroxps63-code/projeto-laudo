import * as SQLite from "expo-sqlite";
import { supabase } from "./supabase";

/**
 * Fila offline (decisão a7 — obrigatório funcionar sem internet em campo).
 * Política de conflito v1: last-write-wins (não há merge, o que sincroniza
 * primeiro "ganha"; suficiente porque cada anomalia tem um dono claro em
 * campo, revisitar se dois assistentes puderem editar a mesma linha).
 *
 * Guarda anomalias que falharam ao salvar por falta de conexão e tenta
 * reenviá-las quando chamado (no foco da tela e ao reabrir o app). Se a
 * anomalia tinha foto, o upload da foto também fica pendente até a
 * anomalia em si sincronizar (precisa do anomaly_id gerado pelo Supabase).
 */

export type QueuedAnomaly = {
  id: number;
  inspection_id: string;
  environment: string;
  system_type: string;
  description: string;
  treatment_recommendation: string;
  severity: string;
  catalog_id: string | null;
  photo_uri: string | null;
  created_by: string;
  created_at: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Sem isso, um init de SQLite que trava (em vez de rejeitar) deixa a
 * Promise pendurada pra sempre — o try/catch em volta de getDb() não
 * protege contra isso, já que só pega throw/reject, não uma Promise que
 * nunca resolve nem rejeita. Achado simulando queda de rede: o caminho de
 * "salvar offline" ficava preso no "Salvando…" indefinidamente porque o
 * getDb() nunca resolvia (nem com erro) — sem timeout, quem está em campo
 * fica sem saber se o dado foi salvo, sem conseguir tentar de novo, e sem
 * poder fechar o formulário sem perder o que já digitou.
 */
const DB_INIT_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[offlineQueue] ${label}: tempo esgotado`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * No app de verdade (Android/iOS) isso usa SQLite nativo. No preview Web
 * (só usado pra desenvolvimento) a versão instalada tenta um worker
 * WASM que o Metro deste projeto não consegue empacotar (falta o wasm
 * como assetExt) — a Promise fica pendurada, nem resolve nem rejeita
 * (achado simulando queda de rede nesta sessão). Por isso getDb() é
 * sempre usado com withTimeout: sem isso, o try/catch de quem chama não
 * protege contra um init que nunca termina.
 */
function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("projeto-laudo-offline.db").then(async (db) => {
      await db.execAsync(`
        create table if not exists sync_queue (
          id integer primary key autoincrement,
          inspection_id text not null,
          environment text not null,
          system_type text not null,
          description text not null,
          treatment_recommendation text not null,
          severity text not null,
          catalog_id text,
          photo_uri text,
          created_by text not null,
          created_at text not null
        );
      `);
      return db;
    });
    // A mesma dbPromise é aguardada em paralelo por várias chamadas (ex:
    // refreshPendingCount + trySync no useFocusEffect). Sem um handler extra
    // aqui, o runtime reporta "unhandled rejection" quando ela falha, mesmo
    // com cada chamador tratando o erro no próprio try/catch — anexar (e
    // descartar) um .catch aqui só suprime esse aviso de dev tools, não
    // interfere no valor/erro que os consumidores reais recebem.
    dbPromise.catch(() => {});
  }
  return dbPromise;
}

/**
 * Salva uma anomalia localmente porque o envio pro Supabase falhou
 * (provavelmente sem rede). Retorna se a gravação local deu certo — quem
 * chama precisa saber, porque se isso falhar também (storage cheio,
 * corrompido) o dado não pode ser tratado como "salvo com segurança".
 */
export async function enqueueAnomaly(payload: Omit<QueuedAnomaly, "id">): Promise<boolean> {
  try {
    const db = await withTimeout(getDb(), DB_INIT_TIMEOUT_MS, "enqueueAnomaly");
    await db.runAsync(
      `insert into sync_queue
        (inspection_id, environment, system_type, description, treatment_recommendation, severity, catalog_id, photo_uri, created_by, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.inspection_id,
        payload.environment,
        payload.system_type,
        payload.description,
        payload.treatment_recommendation,
        payload.severity,
        payload.catalog_id,
        payload.photo_uri,
        payload.created_by,
        payload.created_at,
      ]
    );
    return true;
  } catch (err) {
    console.warn("[offlineQueue] Falha ao salvar anomalia offline localmente:", err);
    return false;
  }
}

/** Quantidade de anomalias de uma vistoria ainda não sincronizadas. */
export async function getPendingCount(inspectionId: string): Promise<number> {
  try {
    const db = await withTimeout(getDb(), DB_INIT_TIMEOUT_MS, "getPendingCount");
    const row = await db.getFirstAsync<{ count: number }>(
      "select count(*) as count from sync_queue where inspection_id = ?",
      [inspectionId]
    );
    return row?.count ?? 0;
  } catch (err) {
    console.warn("[offlineQueue] Falha ao ler fila offline:", err);
    return 0;
  }
}

/**
 * Tenta enviar cada anomalia pendente pro Supabase. Item que sincronizar
 * com sucesso é removido da fila local; item que falhar de novo continua
 * na fila pro próximo try. Retorna quantos sincronizaram com sucesso.
 */
export async function syncPendingAnomalies(inspectionId: string): Promise<number> {
  let db: SQLite.SQLiteDatabase;
  let pending: QueuedAnomaly[];
  try {
    db = await withTimeout(getDb(), DB_INIT_TIMEOUT_MS, "syncPendingAnomalies");
    pending = await db.getAllAsync<QueuedAnomaly>(
      "select * from sync_queue where inspection_id = ? order by created_at asc",
      [inspectionId]
    );
  } catch (err) {
    console.warn("[offlineQueue] Falha ao ler fila offline pra sincronizar:", err);
    return 0;
  }

  let synced = 0;

  for (const item of pending) {
    const { count } = await supabase
      .from("anomalies")
      .select("id", { count: "exact", head: true })
      .eq("inspection_id", inspectionId);
    const code = `AN-${String((count ?? 0) + 1).padStart(3, "0")}`;

    const { data: anomaly, error } = await supabase
      .from("anomalies")
      .insert({
        inspection_id: item.inspection_id,
        catalog_id: item.catalog_id,
        environment: item.environment,
        system_type: item.system_type,
        description: item.description,
        treatment_recommendation: item.treatment_recommendation,
        severity: item.severity,
        code,
        created_by: item.created_by,
      })
      .select()
      .single();

    if (error || !anomaly) {
      // ainda sem rede (ou outro erro) — deixa na fila, tenta de novo depois
      continue;
    }

    if (item.photo_uri) {
      try {
        const response = await fetch(item.photo_uri);
        const arrayBuffer = await response.arrayBuffer();
        const path = `${inspectionId}/${anomaly.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("anomaly-photos")
          .upload(path, arrayBuffer, { contentType: "image/jpeg" });
        if (!uploadError) {
          await supabase.from("anomaly_photos").insert({ anomaly_id: anomaly.id, storage_path: path });
        }
      } catch {
        // a anomalia já sincronizou; a foto que falhou fica perdida nesta
        // versão (v1 não tem fila separada pra foto) — aceitável pro MVP,
        // já que o registro textual da anomalia é o que importa primeiro.
      }
    }

    await db.runAsync("delete from sync_queue where id = ?", [item.id]);
    synced += 1;
  }

  return synced;
}
