import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX_BODY_CHARS = 2_500_000;
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    openings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: ["porta", "janela", "abertura", "incerto"] },
          position: { type: "string", enum: ["esquerda", "centro", "direita", "não identificável"] },
          confidence: { type: "string", enum: ["alta", "média", "baixa"] },
          description: { type: "string" },
        },
        required: ["kind", "position", "confidence", "description"],
      },
    },
  },
  required: ["summary", "openings"],
} as const;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Entre na sua conta para analisar a foto.", 401);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonError("A análise de IA ainda não está ativada no servidor.", 503);

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_CHARS) return jsonError("A foto ficou muito grande.", 413);

  let body: { image?: unknown } | null;
  try {
    body = JSON.parse(rawBody || "null") as { image?: unknown } | null;
  } catch {
    return jsonError("O pedido veio em formato inválido.", 400);
  }
  if (!body || typeof body.image !== "string") return jsonError("Envie uma foto para análise.", 400);

  const allowedImage = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"]
    .some((prefix) => body.image!.startsWith(prefix));
  const encodedImage = body.image.slice(body.image.indexOf(",") + 1);
  if (!allowedImage || !/^[A-Za-z0-9+/=]+$/.test(encodedImage) || encodedImage.length > MAX_BODY_CHARS) {
    return jsonError("Formato de imagem inválido ou tamanho acima do limite.", 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-5-mini",
        store: false,
        max_output_tokens: 700,
        input: [{ role: "user", content: [
          {
            type: "input_text",
            text: "Analise somente o que está visível na foto de um ambiente interno. Liste portas, janelas e outras aberturas, sem inventar itens ou dimensões. Informe tipo, posição aproximada (esquerda/centro/direita), confiança e descrição em português. Não estime medidas em metros nem avalie segurança estrutural ou conformidade normativa.",
          },
          { type: "input_image", image_url: body.image, detail: "high" },
        ] }],
        text: { format: { type: "json_schema", name: "room_openings_analysis", strict: true, schema } },
      }),
    });
  } catch {
    return jsonError("A análise não respondeu a tempo. Tente novamente.", 504);
  }

  if (!upstream.ok) {
    if (upstream.status === 429) return jsonError("Limite de uso da API atingido.", 429);
    console.error("OpenAI room photo analysis failed with status", upstream.status);
    return jsonError("A análise de IA falhou. Confira a configuração da API.", 502);
  }

  const result = await upstream.json() as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const outputText = result.output?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === "output_text")?.text;
  if (!outputText) return jsonError("A IA não retornou uma análise legível.", 502);
  try {
    return NextResponse.json({ analysis: JSON.parse(outputText) });
  } catch {
    return jsonError("A resposta da IA veio em formato inválido.", 502);
  }
}
