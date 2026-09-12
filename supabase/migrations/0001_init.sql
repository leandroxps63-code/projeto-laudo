-- Projeto Laudo — schema inicial
-- Implementa a modelagem de dados decidida em Fase 01 (a4) e o RLS decidido em (a8).
-- Rodar via `supabase db push` (ou colar no SQL editor do painel Supabase).

-- ============================================================
-- Extensões
-- ============================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- Perfis (estende auth.users do Supabase com o papel de cada pessoa)
-- ============================================================
create type user_role as enum ('responsavel_tecnico', 'assistente', 'sindico');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'assistente',
  full_name text not null,
  crea text,                         -- só preenchido para responsável técnico
  created_at timestamptz not null default now()
);

-- ============================================================
-- Clientes e edificações
-- ============================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,                -- ex: "Ed. Aurora do Ipiranga"
  address text not null,
  floors int,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Vistorias
-- ============================================================
create type inspection_status as enum ('rascunho', 'em_vistoria', 'concluida');

create table inspections (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  responsible_id uuid not null references profiles(id), -- responsável técnico (RF-15)
  inspection_type text not null default 'NBR 16.747 — Nível II',
  status inspection_status not null default 'rascunho',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- Quem, além do responsável, pode acessar a vistoria (assistente de campo, síndico) — RF-15
create table inspection_members (
  inspection_id uuid not null references inspections(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role_on_inspection user_role not null,
  primary key (inspection_id, profile_id)
);

-- ============================================================
-- Banco de anomalias e tratamentos (RF-07/RF-08) — biblioteca de referência,
-- não é por vistoria: é a base de conhecimento reutilizada em todo laudo.
-- ============================================================
create table anomaly_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null,             -- ex: "Infiltração"
  description text not null,          -- ex: "Infiltração por falha de rejunte"
  system_type text not null,          -- ex: "Vedação/impermeabilização"
  default_severity text not null check (default_severity in ('baixa','media','alta','critica')),
  treatment_recommendation text not null,
  created_at timestamptz not null default now()
);

create table catalog_products (
  id uuid primary key default gen_random_uuid(),
  anomaly_catalog_id uuid not null references anomaly_catalog(id) on delete cascade,
  manufacturer text not null,
  product_name text not null,
  datasheet_url text,
  video_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Anomalias encontradas numa vistoria específica
-- ============================================================
create table anomalies (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  catalog_id uuid references anomaly_catalog(id),  -- sugestão aceita do banco (RF-07), pode ser nula se descrito manualmente
  environment text not null,          -- ex: "Fachada norte — 3º pavimento"
  system_type text not null,
  description text not null,
  treatment_recommendation text not null,
  severity text not null check (severity in ('baixa','media','alta','critica')),
  code text,                          -- ex: "AN-003", gerado no app
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table anomaly_photos (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references anomalies(id) on delete cascade,
  storage_path text not null,         -- caminho no Supabase Storage
  caption text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Laudos (o documento gerado — RF-10/RF-11/RF-14)
-- Uma vistoria pode gerar mais de um laudo (reemissão/nova versão sem custo).
-- ============================================================
create type report_status as enum ('rascunho', 'gerado', 'entregue');

create table reports (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  version int not null default 1,
  report_number text not null,        -- ex: "2026-0847"
  art_number text,                    -- nº da ART emitida fora do app (Fase 00, item 1)
  status report_status not null default 'rascunho',
  pdf_url text,
  excel_url text,
  generated_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (inspection_id, version)
);

-- ============================================================
-- Auditoria (RNF-05)
-- ============================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  action text not null,               -- ex: "report.generated", "inspection.status_changed"
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (a8) — cada tabela só é visível pra quem tem
-- relação direta com a vistoria (responsável ou membro), reforçando
-- a permissão no banco, não só na API.
-- ============================================================
alter table profiles enable row level security;
alter table clients enable row level security;
alter table buildings enable row level security;
alter table inspections enable row level security;
alter table inspection_members enable row level security;
alter table anomalies enable row level security;
alter table anomaly_photos enable row level security;
alter table reports enable row level security;
alter table audit_log enable row level security;
-- anomaly_catalog / catalog_products: leitura liberada para qualquer usuário autenticado (é biblioteca compartilhada, não dado sensível)
alter table anomaly_catalog enable row level security;
alter table catalog_products enable row level security;

create policy "usuário vê o próprio perfil"
  on profiles for select
  using (auth.uid() = id);

create policy "usuário edita o próprio perfil"
  on profiles for update
  using (auth.uid() = id);

create policy "catálogo de anomalias é legível por qualquer autenticado"
  on anomaly_catalog for select
  to authenticated
  using (true);

create policy "produtos do catálogo são legíveis por qualquer autenticado"
  on catalog_products for select
  to authenticated
  using (true);

create policy "responsável e membros veem a vistoria"
  on inspections for select
  using (
    responsible_id = auth.uid()
    or exists (
      select 1 from inspection_members im
      where im.inspection_id = inspections.id and im.profile_id = auth.uid()
    )
  );

create policy "responsável técnico cria/edita a vistoria"
  on inspections for all
  using (responsible_id = auth.uid())
  with check (responsible_id = auth.uid());

create policy "membros veem anomalias da vistoria"
  on anomalies for select
  using (
    exists (
      select 1 from inspections i
      where i.id = anomalies.inspection_id
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid()))
    )
  );

create policy "responsável e assistente registram anomalias"
  on anomalies for insert
  with check (
    exists (
      select 1 from inspections i
      where i.id = anomalies.inspection_id
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid() and im.role_on_inspection = 'assistente'))
    )
  );

create policy "membros veem fotos da anomalia"
  on anomaly_photos for select
  using (
    exists (
      select 1 from anomalies a
      join inspections i on i.id = a.inspection_id
      where a.id = anomaly_photos.anomaly_id
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid()))
    )
  );

create policy "membros veem laudos da vistoria"
  on reports for select
  using (
    exists (
      select 1 from inspections i
      where i.id = reports.inspection_id
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid()))
    )
  );

create policy "responsável técnico gera laudo"
  on reports for insert
  with check (
    exists (select 1 from inspections i where i.id = reports.inspection_id and i.responsible_id = auth.uid())
  );

-- clients/buildings: visíveis para quem criou (MVP; refinar quando "escritório" com múltiplos
-- responsáveis compartilhando carteira de clientes for um requisito real).
create policy "criador vê e edita seus clientes"
  on clients for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "vê edificações de clientes próprios"
  on buildings for select
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = auth.uid()));

create policy "cria edificações em clientes próprios"
  on buildings for insert
  with check (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = auth.uid()));
