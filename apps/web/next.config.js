const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@projeto-laudo/shared"],
  // O monorepo tem o app mobile (Expo/React Native) puxando uma pilha de
  // pacotes que dependem de react@18.2.0, e isso fica hoisted pra raiz do
  // workspace — sem esse alias, código empacotado pelo Next (ex: o
  // StyleRegistry do styled-jsx) resolve esse react@18.2.0 da raiz em vez
  // do react@18.3.1 que o site realmente usa, e acaba com duas cópias do
  // React ao mesmo tempo: "Cannot read properties of null (reading
  // 'useContext')" ao pré-renderizar /404 e /500. Só aparece em `next
  // build` de produção (não no dev), achado testando o build de verdade
  // depois que o deploy na Vercel falhou com esse erro.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Apontar pro diretório do pacote (não um arquivo específico) deixa
      // a resolução de subpaths (react/jsx-runtime etc.) funcionar normal.
      react: path.dirname(require.resolve("react/package.json")),
      "react-dom": path.dirname(require.resolve("react-dom/package.json")),
    };
    return config;
  },
};

module.exports = nextConfig;
