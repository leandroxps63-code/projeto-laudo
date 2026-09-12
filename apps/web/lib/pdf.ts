import puppeteer from "puppeteer";

/**
 * Renderiza HTML/CSS -> PDF com Chromium headless local (puppeteer), em vez
 * de depender de um serviço gerenciado externo tipo Browserless — decisão
 * a5 previa um serviço gerenciado, mas rodar o Chromium aqui mesmo evita
 * a dependência de conta/API key de terceiro. Se o deploy de produção for
 * pra um serverless com limite de tamanho de pacote (ex: Vercel), trocar
 * puppeteer por puppeteer-core + @sparticuz/chromium-min é o caminho —
 * decisão a tomar junto da escolha de hosting, não antes.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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
