/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@projeto-laudo/shared"],
  // O Chromium do @sparticuz/chromium é um binário dentro de node_modules,
  // não código que o webpack deveria empacotar — sem isso, o build da
  // Vercel relocaliza/poda a pasta e "Gerar laudo" quebra em produção com
  // "input directory .../@sparticuz/chromium/bin does not exist". Achado
  // testando a geração de PDF de verdade, depois do primeiro deploy com o
  // @sparticuz/chromium (nunca aparece em build/dev local).
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

module.exports = nextConfig;
