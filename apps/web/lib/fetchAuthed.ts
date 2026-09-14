"use client";

/**
 * fetch com retry único em 401 — mitiga uma corrida real entre o
 * middleware renovando o cookie de sessão do Supabase e a página
 * disparando fetch pro próprio /api assim que monta. Sem isso, a
 * primeira requisição de uma página recém-navegada ocasionalmente falha
 * com "Não autenticado" mesmo com sessão válida, e volta a funcionar
 * normal no retry/reload seguinte — comportamento observado ao vivo
 * nesta sessão (GET de edificação e POST de anomalia, ambos logo após
 * navegar pra página). Só reage a 401 do próprio backend, uma vez —
 * não mascara outros erros.
 */
export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Faça login novamente pra continuar.";

export async function fetchAuthed(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return fetch(input, init);
}
