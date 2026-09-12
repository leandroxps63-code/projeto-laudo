# apps/web

Portal web (Next.js 14, App Router) — dashboard de laudos, revisão/personalização do documento, gestão de clientes/projetos, exportação. Também hospeda as rotas de API (`/api/*`).

## Implementado nesta rodada

- `app/login` — login real via Supabase Auth (e-mail/senha)
- `app/page.tsx` — dashboard, lista as vistorias do responsável técnico logado (server component), com link "Nova vistoria" e cada card levando pro detalhe
- `app/vistorias/nova` — cria cliente + edificação + vistoria numa tacada só (RF-01), redireciona pro detalhe
- `app/vistorias/[id]` — lista anomalias da vistoria (com contagem de fotos), formulário de registro com busca/sugestão no banco de anomalias (RF-07), upload de foto opcional e botão "Gerar laudo"
- `app/components/PhotoMarkupModal.tsx` — marcação/anotação na foto (desenho livre em vermelho com o mouse), versão web do que já existia no app mobile. Ao escolher um arquivo no input, abre o modal com a imagem desenhada num `<canvas>`; "Usar esta foto" exporta o canvas (imagem + traços) como um novo `File` via `canvas.toBlob`, sem guardar a marcação à parte — o resto do fluxo de upload trata como uma foto normal. "Pular marcação" usa o arquivo original sem gerar cópia. Testado de ponta a ponta: upload real (via `file_upload` do Chrome, já que o seletor de arquivo do SO não é automatizável), traço desenhado de verdade, registrado na anomalia, e confirmado "queimado" na imagem dentro do PDF gerado.
- `app/clientes` — listagem de clientes com edificações aninhadas, editar/excluir para ambos (gestão avulsa, fora do fluxo "Nova vistoria"); confirmação de exclusão via modal próprio da aplicação, não `window.confirm()` nativo (mais consistente visualmente e testável em automação)
- `app/clientes/novo` — cadastro de cliente avulso
- `app/clientes/[id]/editar` — edição de cliente
- `app/clientes/[id]/edificacoes/nova` — cadastro de edificação vinculada a um cliente existente
- `app/clientes/[id]/edificacoes/[buildingId]/editar` — edição de edificação
- `app/laudos/compartilhado/[token]` — RF-11, página pública (sem login) de um laudo compartilhado — acesso por "capability URL": só quem tem o token exato (uuid aleatório) consegue ver; o dono ativa/desativa o link a qualquer momento na tela de detalhe da vistoria
- `app/privacidade` — política de privacidade, página pública (sem login) — link estável exigido pelas lojas de app antes de submeter (Fase 06, l1); linkada no rodapé da tela de login. Conteúdo é o rascunho registrado no Notion; não é aconselhamento jurídico, recomendação de revisão por profissional antes de publicar de verdade continua valendo.
- `app/icon.png` / `app/apple-icon.png` — ícone do site/favicon (convenção do App Router, detectado automaticamente pelo Next.js). Primeira versão da identidade visual (12/09) — ver nota abaixo.
- `lib/supabase-browser.ts` / `lib/supabase-server.ts` — clientes Supabase (padrão `@supabase/ssr`)
- `app/components/SiteHeader.tsx` — botão "Sair" no topo, presente em toda página autenticada do site (dashboard, clientes, vistorias) via inclusão no `app/layout.tsx` raiz; some sozinho nas páginas públicas (`/login`, `/laudos/compartilhado/*`) checando o path. Chama `supabase.auth.signOut()` no client browser e redireciona pro login — testado clicando de verdade no Chrome: sessão encerrada de fato (tentativa de abrir `/clientes` direto pela URL depois do logout foi barrada pelo middleware e voltou pro `/login`, não só troca de tela).
- `middleware.ts` — redireciona pro login quem tenta abrir página autenticada sem sessão (antes só o dashboard tinha esse guard; `/vistorias/*` e `/clientes/*` dependiam só da API retornar 401, deixando a tela vazia piscando); usuário logado que tenta abrir `/login` é redirecionado pro dashboard; `/laudos/compartilhado/*` e `/api/*` ficam de fora (API já reforça auth via RLS/`getUser()` e deve responder JSON, não redirect)
- **API (todas exigem estar autenticado, RLS reforça no banco):**
  - `GET/POST /api/clients` · `GET/PATCH/DELETE /api/clients/:id` — cadastro/edição/exclusão de cliente (exclusão bloqueada se houver edificação vinculada)
  - `GET/POST /api/buildings?clientId=` · `GET/PATCH/DELETE /api/buildings/:id` — edificações de um cliente (exclusão bloqueada se houver vistoria vinculada)
  - `GET /api/inspections` · `POST /api/inspections` — RF-01, cria vistoria
  - `GET /api/anomaly-catalog?q=` — RF-07, busca no banco de anomalias/tratamentos
  - `GET/POST /api/inspections/:id/anomalies` — RF-02/07/09, registra anomalia (aceita `catalogId` pra puxar a sugestão do banco; código `AN-001`, `AN-002`... gerado automaticamente)
  - `GET/POST /api/inspections/:id/anomalies/:anomalyId/photos` — RF-09, upload de foto (Supabase Storage, bucket privado `anomaly-photos`); GET devolve signed URLs (1h)
  - `GET/POST /api/inspections/:id/reports` — RF-10/11/14, cria uma versão do laudo e gera de verdade **a planilha de ação (.xlsx)** com ExcelJS **e o PDF** (`lib/reportTemplate.ts` monta o HTML — cabeçalho, dados da edificação, anomalias com foto/tratamento/severidade, resumo consolidado, assinatura —, `lib/pdf.ts` renderiza com Chromium headless local via `puppeteer`), sobe os dois pro Storage (`reports`) e devolve signed URLs
  - `PATCH /api/inspections/:id/reports/:reportId/share` — RF-11, ativa/desativa o link público de compartilhamento
- **API pública (sem autenticação):**
  - `GET /api/public/laudos/:token` — dados do laudo + signed URLs do PDF e da planilha, só quando o token bate e o compartilhamento está ativo
- `lib/errorLog.ts` — monitoramento de erros self-hosted (decisão l4, Fase 06): grava em `error_log` (Supabase) em vez de depender de conta paga externa (Sentry/PostHog). Instrumentado nos pontos de maior risco real: geração de laudo (planilha/PDF), upload de foto de anomalia, rota pública de laudo compartilhado. `error_log` aceita INSERT de `anon`/`authenticated` mas não tem policy de SELECT — só é consultável pelo painel do Supabase (acesso privilegiado, ignora RLS), nunca pela API.

## Nota técnica — geração de PDF (decisão a5)

Decisão a5 original previa HTML/CSS → PDF via **serviço gerenciado** (ex: Browserless), que exigia o usuário criar conta e obter API key — bloqueio de infraestrutura fora do nosso controle. Revisado: em vez de depender de terceiro, o PDF é gerado com **Chromium headless local** (`puppeteer`, `lib/pdf.ts`) rodando dentro da própria API route — sem conta, sem API key, sem serviço externo. Testado gerando um laudo de verdade e abrindo o PDF baixado: cabeçalho, dados da edificação, anomalia com foto e tratamento, resumo consolidado e assinatura, tudo presente.

Ponto de atenção só pra quando a Fase 06 (lançamento) escolher onde hospedar produção: `puppeteer` baixa um Chromium completo (~300MB), o que funciona bem em servidor próprio/container mas estoura o limite de tamanho de function em serverless tipo Vercel. Se o deploy for serverless, trocar por `puppeteer-core` + `@sparticuz/chromium-min` (Chromium comprimido pra ambiente serverless) resolve sem precisar voltar a depender de serviço externo — decisão a tomar junto da escolha de hosting, não antes.

## Nota técnica — acesso público (RF-11) e cache do Next.js

Rotas que servem dado público via token (`app/laudos/compartilhado/[token]`, `app/api/public/laudos/[token]`) **precisam** passar um `fetch` customizado com `cache: "no-store"` pro client do `supabase-js`. `export const dynamic = "force-dynamic"` sozinho não basta — o Next.js App Router faz patch global do `fetch()` (inclusive o que bibliotecas de terceiros usam por baixo) e cacheia em disco entre requisições, sobrevivendo até a restart do dev server. Sem isso, a página serve um estado desatualizado do laudo (ex: compartilhamento já desativado continua acessível). Ver comentário no topo dos dois arquivos.

`private.is_report_file_shared` (policy de storage do link público) só reconhecia `reports.excel_url` — sobrou de antes do PDF existir. Quando o PDF real (a5) entrou, o arquivo `.pdf` batia em `share_enabled = true` mas a função devolvia `false` pra esse caminho específico, e `createSignedUrl` falhava silenciosamente sob RLS: a página pública sempre mostrava "PDF ainda não disponível", mesmo com o link ativo. Corrigido em `0014_shared_report_pdf_storage.sql` pra checar `excel_url` OU `pdf_url`. Achado testando o link público de verdade (não só a chamada de API isolada) depois de implementar o PDF — mesma classe de bug já vista antes neste projeto (RLS cobre o caminho que existia quando a policy foi escrita, não o que foi adicionado depois).

## Nota técnica — identidade visual (12/09)

Primeira versão do ícone do app (site e mobile): documento com canto dobrado + checkmark, usando só os tokens já definidos no Design System (`brand` #205e73, `paper` #f8f6f2) — sem introduzir cor nova. Fonte vetorial em `apps/mobile/assets/icon-source.svg`; os PNGs (`app/icon.png`, `app/apple-icon.png` aqui, e os equivalentes em `apps/mobile/assets/`) foram gerados renderizando esse SVG com Chromium headless (mesmo mecanismo do PDF, `lib/pdf.ts`). Middleware ajustado (`middleware.ts`) pra não bloquear `icon.png`/`apple-icon.png` — sem isso, o favicon batia no guard de autenticação e ficava quebrado pra quem não estava logado (achado testando de verdade, deslogado, no Chrome). Não é decisão definitiva de marca — fácil de trocar depois editando o SVG fonte e regerando.

## Nota técnica — revisão de segurança (Fase 05)

Rodei o advisor de segurança/performance do Supabase (`get_advisors`) como parte dos testes da Fase 05. Achados, todos WARN/INFO (nada crítico), corrigidos em `0012_security_hardening.sql`:
- As funções `is_inspection_responsible/member/assistant` e `is_report_file_shared` (SECURITY DEFINER, usadas só internamente por policies de RLS) ficavam no schema `public`, que o PostgREST expõe automaticamente como RPC (`/rest/v1/rpc/...`) — qualquer um, inclusive anon, podia chamá-las direto. Não vazava dado sensível (só devolvem boolean), mas não era a intenção. Movidas pro schema `private` (não exposto pelo PostgREST); RLS continua funcionando igual, é SQL puro. `get_shared_report` foi deixada de fora de propósito — ela É a RPC pública do RF-11, sua segurança vem do token, não de estar escondida.
- `auth.uid()` "bare" nas policies de RLS é reavaliado linha a linha; trocado por `(select auth.uid())` em todas (deixa o planner cachear o valor uma vez por statement).
- `inspections` tinha 2 policies permissivas de SELECT se sobrepondo; a policy `ALL` do responsável virou 3 policies (insert/update/delete), removendo a duplicidade.
- Índices adicionados nas 12 foreign keys que não tinham cobertura.

Único item que fica: **"Leaked Password Protection" desabilitado** no Auth — não dá pra ligar por API/MCP, é um toggle no painel (Authentication → Policies → Password → "Leaked password protection"). Ação de 1 clique pra vocês, não bloqueio de código.

## Ainda não implementado

Nada pendente nesta rodada — o site tem paridade com o app mobile em todas as features rastreadas no roadmap.

## Rodar localmente

```bash
npm install
npm run dev
```

`.env.local` já está preenchido com o projeto Supabase "projeto-laudo-dev" (schema aplicado, RLS revisado). Pra logar, crie um usuário em Authentication → Add user no painel do Supabase e uma linha correspondente em `profiles`.

Já existe um usuário de teste (`teste@projetolaudo.dev`) criado direto no banco pra validar o fluxo logado — senha combinada fora deste arquivo (não commitar senha, nem de teste, no repositório). Um "Ed. Aurora do Ipiranga" no dashboard é dado sintético desse teste, não um cliente real.

## Testar a API rapidamente

```bash
# depois de logado no navegador, copie o cookie de sessão e:
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Condomínio Teste"}'
```
