# Projeto Laudo

Plataforma de laudos de inspeção predial (ABNT NBR 16.747) — app + portal web. Automatiza a montagem do laudo (fotos, classificação de anomalias, tratamento recomendado, PDF + Excel) sem substituir o responsável técnico.

> Codinome do produto ainda não definido. Documentação completa (PRD, arquitetura, design) no Notion do projeto.

## Estrutura (monorepo, npm workspaces)

```
apps/
  web/       Next.js — portal (dashboard, revisão, personalização) + API routes
  mobile/    Expo (React Native) — app de campo, offline-first
packages/
  shared/    Tipos TypeScript (incl. gerados do banco) e cliente Supabase compartilhados
supabase/
  migrations/  Schema SQL (fonte de verdade do banco)
```

## Stack

- **Dados/backend:** Supabase (Postgres + Auth + Storage)
- **Web/API:** Next.js + React, deploy na Vercel
- **Mobile:** React Native + Expo
- **Documento:** HTML/CSS → PDF (serviço gerenciado) + ExcelJS
- **Linguagem:** TypeScript de ponta a ponta

Detalhe e justificativa de cada decisão: ver documento "Arquitetura Técnica" no Notion do projeto.

## Ambientes

| Ambiente | Web/API | Banco | Status |
|---|---|---|---|
| Desenvolvimento | localhost | Supabase **projeto-laudo-dev** (`ckufbpmnvnifbemmithn`, região sa-east-1) | ✅ Criado, migration aplicada, RLS revisado (0 alertas de segurança) |
| Staging | Vercel Preview (por PR) | Supabase "staging" | Não criado |
| Produção | Vercel Production | Supabase "produção" | Não criado |

Credenciais do ambiente dev já estão em `apps/web/.env.local` e `apps/mobile/.env` (fora do git, cobertos pelo `.gitignore`).

## Como rodar

```bash
npm install
npm run dev:web       # portal em http://localhost:3000/login
npm run dev:mobile    # Expo — escaneie o QR code com o app Expo Go
```

Login: crie um usuário direto no painel do Supabase (Authentication → Add user) e depois insira a linha correspondente em `profiles` — o app ainda não tem tela de cadastro (fica pra um próximo sprint).

## Links

- Quadro de tarefas: https://trello.com/b/MXCZM0cU/projeto-laudo
- Documentação completa: Notion — projeto "Projeto Laudo"
- Painel Supabase (dev): https://supabase.com/dashboard/project/ckufbpmnvnifbemmithn
