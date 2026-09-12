// Bug real do next@14.2.x: node_modules/next/dist/server/lib/dedupe-fetch.js
// chama React.cache() incondicionalmente pra deduplicar fetch() dentro de
// Route Handlers do App Router — mas React.cache só existe a partir do
// React 19, e o peerDependency oficial do Next 14.2.x continua sendo
// React 18 ("^18.2.0"). Com React 18 instalado (o suportado de verdade),
// `next build` quebra em toda rota de API com segmento dinâmico: "n.cache
// is not a function", só na fase "Collecting page data". Achado testando
// o build de produção de verdade (não aparece no `next dev`).
//
// Fix mínimo: se React.cache não existir, usa um polyfill que só devolve
// a função sem cachear (mesma assinatura, sem persistir nada entre
// chamadas). Isso desativa a deduplicação interna de fetch() nessa fase
// de build-time-only (coleta de rotas estáticas) — não afeta o
// comportamento de runtime do app de verdade.
//
// Roda via "postinstall" pra sobreviver a `npm ci`/`npm install` (inclusive
// na Vercel), já que a correção vive dentro de node_modules e se perde a
// cada reinstalação.
const fs = require("fs");
const path = require("path");

// Só a variante CJS — é a que o build de Route Handlers do App Router usa de
// verdade (confirmado inspecionando o chunk webpack gerado). A variante ESM
// usa "import * as React" (namespace object, geralmente congelado — tentar
// sobrescrever .cache nela arriscaria quebrar em vez de corrigir).
const candidates = [
  "node_modules/next/dist/server/lib/dedupe-fetch.js",
  "apps/web/node_modules/next/dist/server/lib/dedupe-fetch.js",
];

const marker = "// patch-next-cache: polyfill de React.cache ausente no React 18";

for (const rel of candidates) {
  const file = path.join(__dirname, "..", rel);
  if (!fs.existsSync(file)) continue;

  const original = fs.readFileSync(file, "utf8");
  if (original.includes(marker)) continue; // já aplicado

  const anchor = `const _react = /*#__PURE__*/ _interop_require_wildcard(require("react"));`;

  if (!original.includes(anchor)) {
    console.warn(`[patch-next-cache] âncora não encontrada em ${rel}, pulando.`);
    continue;
  }

  const patched = original.replace(
    anchor,
    `${anchor}\n${marker}\nif (typeof _react.cache !== "function") { _react.cache = function (fn) { return fn; }; }`
  );

  fs.writeFileSync(file, patched);
  console.log(`[patch-next-cache] patch aplicado em ${rel}`);
}
