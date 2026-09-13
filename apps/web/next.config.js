const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@projeto-laudo/shared"],
  // O Chromium do @sparticuz/chromium é um binário dentro de node_modules,
  // não código que o webpack deveria empacotar — serverComponentsExternalPackages
  // evita que o webpack tente embutir/podar o pacote, mas isso sozinho não
  // basta: a Vercel também roda seu próprio rastreamento de arquivos (Node
  // File Trace) pra decidir o que empacotar na função serverless, e esse
  // rastreamento estático não segue a extração dinâmica de binário do
  // pacote — resultado: "input directory .../@sparticuz/chromium/bin does
  // not exist" em runtime, mesmo com o build local e o webpack corretos.
  // outputFileTracingRoot aponta pra raiz do monorepo (onde node_modules
  // de verdade fica, já que é hoisted pelo workspace do npm) e
  // outputFileTracingIncludes força a inclusão do pacote inteiro na rota
  // que gera o laudo. Achado testando a geração de PDF de verdade em
  // produção — não aparece em build nem em dev local.
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingRoot: path.join(__dirname, "../.."),
    outputFileTracingIncludes: {
      "/api/inspections/[id]/reports": ["../../node_modules/@sparticuz/chromium/**/*"],
    },
  },
};

module.exports = nextConfig;
