-- Fase 06 (l4) — monitoramento de erros, versão self-hosted: sem depender de
-- conta paga externa (Sentry/PostHog), uma tabela no próprio Supabase.
-- Qualquer role pode INSERT (authenticated ou anon, já que rotas públicas
-- também podem falhar); ninguém lê via API — consulta é só pelo painel do
-- Supabase (Table Editor / SQL editor), que usa acesso privilegiado e
-- ignora RLS, então não precisa de policy de SELECT aqui.
create table error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,           -- ex: "api.inspections.reports.post"
  message text not null,
  stack text,
  context jsonb,
  profile_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table error_log enable row level security;

create policy "qualquer um registra um erro"
  on error_log for insert
  to anon, authenticated
  with check (true);

create index error_log_created_at_idx on error_log (created_at desc);
create index error_log_source_idx on error_log (source);
