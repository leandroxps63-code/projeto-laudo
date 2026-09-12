# apps/mobile

App de campo (Expo / React Native) — vistoria, captura de foto, formulário dinâmico de anomalia com sugestão automática, funcionamento offline com fila de sincronização.

## Implementado nesta rodada

- `App.tsx` — login real via Supabase Auth (mesmo backend do apps/web); logado, mostra a navegação real
- `index.js` — entry point próprio (`registerRootComponent`), não `expo/AppEntry` direto: esse arquivo resolve seu import relativo à própria localização, e como `expo` é hoisted pra raiz do monorepo (npm workspaces), o caminho quebrava
- `src/navigation/RootNavigator.tsx` — React Navigation **v6** (não v7: a v7 exige `react-native-screens` 4+, incompatível com Expo 51/RN 0.74)
- `src/screens/DashboardScreen.tsx` — lista as vistorias do usuário logado, direto do Supabase (sem passar pela API do site)
- `src/screens/NovaVistoriaScreen.tsx` — cria cliente + edificação + vistoria (RF-01), espelha `apps/web/app/vistorias/nova`
- `src/screens/VistoriaDetalheScreen.tsx` — lista de anomalias, formulário com busca no catálogo (RF-07), severidade e foto pela câmera (RF-09, `expo-image-picker`, upload direto pro Storage)
- `src/lib/offlineQueue.ts` — fila offline (decisão a7): se salvar uma anomalia falhar por falta de rede, ela é guardada localmente (`expo-sqlite`) e reenviada automaticamente ao focar a tela; UI mostra quantas estão pendentes com botão "Tentar agora". Política de conflito v1: last-write-wins.
- **Decisão de escopo:** geração de laudo (PDF/planilha) fica só no site — o app de campo foca em captura. Mensagem nesse sentido aparece na própria tela.
- **Atualizado pro Expo SDK 57** (era SDK 51) — o Expo Go instalado nas lojas de app hoje só suporta a versão mais recente do SDK, então rodar um projeto SDK 51 nele dava erro de incompatibilidade, não erro de rede/conexão. Upgrade via `npx expo install expo@^57 && npx expo install --fix`; junto veio React 19, React Native 0.86 e `react-native-screens` 4.x.
- **`src/lib/supabase.ts` configura `@react-native-async-storage/async-storage` como storage do client** — sem isso, `persistSession: true` sozinho não basta em React Native (não existe `window.localStorage` aqui), a sessão fica só em memória e cai com "sessão expirada" enganoso sob certas condições. Achado testando offline de verdade em dispositivo real.
- `handleAddAnomaly`/`handleSubmit` usam `supabase.auth.getSession()`, não `getUser()` — `getUser()` sempre bate no servidor pra validar, então falha (com mensagem de erro enganosa) assim que a rede cai, mesmo com sessão local válida.
- `src/components/PhotoMarkupModal.tsx` — marcação/anotação na foto (desenho livre em vermelho com o dedo, via `react-native-svg` + `PanResponder`) exibida logo depois de tirar a foto; ao confirmar, a marcação é "queimada" na imagem com `react-native-view-shot` antes do upload (o resto do fluxo trata como uma foto normal, sem guardar as marcações à parte). "Pular marcação" mantém a foto original sem gerar uma cópia.
- `src/components/LogoutButton.tsx` — botão de logout no `headerRight` do `RootNavigator`, portanto visível em todas as telas do app autenticado (não só no dashboard). Confirma antes de sair via `Alert.alert` nativo.
- **Ícone e splash (12/09)** — primeira versão da identidade visual: `assets/icon.png` (app icon), `assets/adaptive-icon.png` (foreground do adaptive icon do Android, fundo transparente) e `assets/splash-icon.png`, configurados em `app.json`. Documento com canto dobrado + checkmark, só com os tokens do Design System (`brand` #205e73, `paper` #f8f6f2). Fonte vetorial em `assets/icon-source.svg` — regenerar os PNGs é só renderizar esse SVG (e a variante sem o `<rect>` de fundo, pro foreground transparente) nos tamanhos certos. Não é decisão definitiva de marca, é fácil de trocar depois. Só aparece de fato num build standalone/EAS — no Expo Go o ícone mostrado é sempre o do próprio Expo Go, não dá pra verificar visualmente em dev.

## Verificação feita

**Testado em dispositivo real (iPhone via Expo Go)**, incluindo o cenário mais importante: modo avião ativado no meio do registro de uma anomalia → salva localmente com aviso "aguardando conexão" → internet de volta → sincroniza sozinha, com foto incluída → confirmado direto no banco de produção. Login, dashboard, criação de vistoria, câmera nativa e upload de foto também testados de ponta a ponta no aparelho.

Antes disso, a base do fluxo (sem SQLite/câmera nativa) tinha sido verificada via `npx expo start --web`, útil como primeira camada de checagem mas insuficiente — `expo-sqlite` não tem implementação nativa no navegador, então a fila offline só pôde ser validada de verdade no dispositivo.

A marcação na foto também foi testada no dispositivo real: desenhei um círculo sobre uma mancha na foto, confirmei via signed URL que a marcação apareceu "queimada" na imagem salva no Storage (não é uma camada separada — é a própria imagem final).

O botão de logout no header também foi confirmado no dispositivo real. Achado no caminho (não é bug de código): na primeira checagem ele pareceu não ter aparecido, mas estava só escondido atrás da bolha flutuante de dev tools do Expo Go, que fica sempre por cima na mesma região onde o `headerRight` renderiza — some em builds de produção. Ao arrastar a bolha, o botão apareceu e funcionou normalmente.

## Ainda não implementado

Nada pendente nesta rodada — captura de foto, formulário dinâmico com sugestão do catálogo, marcação na foto, fila offline e logout estão todos implementados e testados de ponta a ponta em dispositivo real.

## Rodar localmente

```bash
cp .env.example .env
npm install
npm run start
```

Pra testar no navegador (sem emulador): `npx expo start --web`.
