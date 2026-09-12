import type { Browser } from "puppeteer-core";

/**
 * Renderiza HTML/CSS -> PDF com Chromium headless local, em vez de depender
 * de um serviço gerenciado externo tipo Browserless — evita a dependência
 * de conta/API key de terceiro (mesma lógica do resto do projeto: self-host
 * em vez de pagar um serviço).
 *
 * A Vercel roda funções serverless num ambiente somente leitura sem Chrome
 * instalado, então o puppeteer "completo" (que baixa/usa um Chromium local
 * de dev) não funciona em produção lá — só localmente. Em produção (ou em
 * qualquer ambiente serverless, detectado por VERCEL/AWS_LAMBDA_*), usamos
 * puppeteer-core apontando pro binário do @sparticuz/chromium, feito
 * especificamente pra rodar em Lambda/Vercel. Achado testando a geração de
 * laudo de verdade em produção (`next dev`/build local nunca acusa isso,
 * já que o Chromium de dev do puppeteer normal existe na máquina local).
 */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    const [{ default: puppeteer }, { default: chromium }] = await Promise.all([
      import("puppeteer-core"),
      import("@sparticuz/chromium"),
    ]);
    return puppeteer.launch({
      headless: true,
      args: chromium.args,
      executablePath: await chromium.executablePath(),
    });
  }

  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as unknown as Promise<Browser>;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
