-- Fase 05 (testes de carga e segurança) — revisão de segurança/performance
-- via `get_advisors`. Três classes de achado, nenhum crítico (todos WARN/INFO):
--
-- 1) SEGURANÇA (WARN): is_inspection_responsible/member/assistant e
--    is_report_file_shared são SECURITY DEFINER e ficaram no schema `public`
--    — PostgREST expõe automaticamente toda função de `public` como RPC
--    (ex: POST /rest/v1/rpc/is_inspection_member), então qualquer um
--    (inclusive anon) pode chamar essas funções internas diretamente.
--    Não vaza dado sensível (só devolvem boolean), mas não é a intenção —
--    elas existem só pra uso dentro de outras policies de RLS. Fix
--    recomendado pelo próprio linter da Supabase: mover pra um schema que o
--    PostgREST não expõe. RLS funciona igual (é SQL puro, não depende de
--    exposição HTTP) — só o `revoke`/`grant` de EXECUTE continua idêntico,
--    então nenhum comportamento de acesso muda, só o schema.
--    `get_shared_report` fica de fora dessa mudança de propósito: ela É a
--    RPC pública da RF-11 (compartilhamento de laudo), sua segurança vem do
--    token (uuid impossível de adivinhar), não de estar escondida.
--
-- 2) PERFORMANCE (WARN): `auth.uid()` bare numa policy de RLS é reavaliado
--    linha a linha; `(select auth.uid())` deixa o planner cachear o valor
--    uma vez por statement. Sem efeito de acesso, só de custo em tabelas
--    grandes.
--
-- 3) PERFORMANCE (WARN): `inspections` tinha 2 policies permissivas de
--    SELECT (a de "vê" e a "ALL" do responsável, que também cobre select) —
--    Postgres avalia as duas em toda query. A de "vê" já cobre o caso do
--    responsável, então a "ALL" vira só insert/update/delete.
--
-- (Índices em FK sem cobertura — INFO, mesma leva — no fim do arquivo.)

-- ============================================================
-- 1) Funções internas de RLS saem de `public`, entram em `private`
-- ============================================================
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_inspection_responsible(target_inspection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from inspections i
    where i.id = target_inspection_id and i.responsible_id = auth.uid()
  );
$$;

create or replace function private.is_inspection_member(target_inspection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from inspection_members im
    where im.inspection_id = target_inspection_id and im.profile_id = auth.uid()
  );
$$;

create or replace function private.is_inspection_assistant(target_inspection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from inspection_members im
    where im.inspection_id = target_inspection_id
      and im.profile_id = auth.uid()
      and im.role_on_inspection = 'assistente'
  );
$$;

create or replace function private.is_report_file_shared(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from reports r where r.excel_url = p_path and r.share_enabled = true
  );
$$;

revoke all on function private.is_inspection_responsible(uuid) from public;
revoke all on function private.is_inspection_member(uuid) from public;
revoke all on function private.is_inspection_assistant(uuid) from public;
revoke all on function private.is_report_file_shared(text) from public;
-- mesma exposição que as versões antigas em public já tinham (confirmado via
-- advisor antes desta migration): as 3 primeiras + anon foram liberadas na
-- correção de 09/09 (anon precisa poder validar a função durante o
-- planejamento de query de storage.objects, mesmo em policy "to authenticated"
-- — ver nota em 0010); is_report_file_shared sempre foi anon+authenticated (0011).
grant execute on function private.is_inspection_responsible(uuid) to anon, authenticated;
grant execute on function private.is_inspection_member(uuid) to anon, authenticated;
grant execute on function private.is_inspection_assistant(uuid) to anon, authenticated;
grant execute on function private.is_report_file_shared(text) to anon, authenticated;

-- ---- recria as policies que usavam public.* apontando pra private.* ----

drop policy if exists "responsável e membros veem a vistoria" on inspections;
create policy "responsável e membros veem a vistoria"
  on inspections for select
  using (responsible_id = (select auth.uid()) or private.is_inspection_member(id));

drop policy if exists "membros veem a própria lista de membros da vistoria" on inspection_members;
create policy "membros veem a própria lista de membros da vistoria"
  on inspection_members for select
  using (profile_id = (select auth.uid()) or private.is_inspection_responsible(inspection_id));

drop policy if exists "responsável técnico adiciona membros" on inspection_members;
create policy "responsável técnico adiciona membros"
  on inspection_members for insert
  with check (private.is_inspection_responsible(inspection_id));

drop policy if exists "responsável técnico remove membros" on inspection_members;
create policy "responsável técnico remove membros"
  on inspection_members for delete
  using (private.is_inspection_responsible(inspection_id));

drop policy if exists "membros veem anomalias da vistoria" on anomalies;
create policy "membros veem anomalias da vistoria"
  on anomalies for select
  using (private.is_inspection_responsible(inspection_id) or private.is_inspection_member(inspection_id));

drop policy if exists "responsável e assistente registram anomalias" on anomalies;
create policy "responsável e assistente registram anomalias"
  on anomalies for insert
  with check (private.is_inspection_responsible(inspection_id) or private.is_inspection_assistant(inspection_id));

drop policy if exists "membros veem fotos da anomalia" on anomaly_photos;
create policy "membros veem fotos da anomalia"
  on anomaly_photos for select
  using (
    exists (
      select 1 from anomalies a
      where a.id = anomaly_photos.anomaly_id
        and (private.is_inspection_responsible(a.inspection_id) or private.is_inspection_member(a.inspection_id))
    )
  );

drop policy if exists "responsável e assistente registram fotos da anomalia" on anomaly_photos;
create policy "responsável e assistente registram fotos da anomalia"
  on anomaly_photos for insert
  with check (
    exists (
      select 1 from anomalies a
      where a.id = anomaly_photos.anomaly_id
        and (private.is_inspection_responsible(a.inspection_id) or private.is_inspection_assistant(a.inspection_id))
    )
  );

drop policy if exists "membros veem laudos da vistoria" on reports;
create policy "membros veem laudos da vistoria"
  on reports for select
  using (private.is_inspection_responsible(inspection_id) or private.is_inspection_member(inspection_id));

drop policy if exists "responsável técnico gera laudo" on reports;
create policy "responsável técnico gera laudo"
  on reports for insert
  with check (private.is_inspection_responsible(inspection_id));

drop policy if exists "responsável técnico atualiza o laudo" on reports;
create policy "responsável técnico atualiza o laudo"
  on reports for update
  using (private.is_inspection_responsible(inspection_id))
  with check (private.is_inspection_responsible(inspection_id));

drop policy if exists "membros veem fotos da vistoria no storage" on storage.objects;
create policy "membros veem fotos da vistoria no storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'anomaly-photos'
    and (
      private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_member(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "responsável e assistente sobem fotos no storage" on storage.objects;
create policy "responsável e assistente sobem fotos no storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'anomaly-photos'
    and (
      private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_assistant(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "membros veem arquivos de laudo no storage" on storage.objects;
create policy "membros veem arquivos de laudo no storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'reports'
    and (
      private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_member(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "responsável técnico sobe arquivos de laudo no storage" on storage.objects;
create policy "responsável técnico sobe arquivos de laudo no storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reports'
    and private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "arquivo de laudo com compartilhamento ativo é legível" on storage.objects;
create policy "arquivo de laudo com compartilhamento ativo é legível"
  on storage.objects for select
  to anon
  using (bucket_id = 'reports' and private.is_report_file_shared(name));

-- agora sim dá pra tirar as versões antigas de `public` (nenhuma policy mais
-- as referencia — se ainda referenciasse, o drop abaixo falharia com erro
-- de dependência, o que serviria de rede de segurança).
drop function if exists public.is_inspection_responsible(uuid);
drop function if exists public.is_inspection_member(uuid);
drop function if exists public.is_inspection_assistant(uuid);
drop function if exists public.is_report_file_shared(text);

-- ============================================================
-- 2) auth.uid() -> (select auth.uid()) nas policies restantes do advisor
-- ============================================================
drop policy if exists "usuário vê o próprio perfil" on profiles;
create policy "usuário vê o próprio perfil"
  on profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "usuário edita o próprio perfil" on profiles;
create policy "usuário edita o próprio perfil"
  on profiles for update
  using ((select auth.uid()) = id);

drop policy if exists "criador vê e edita seus clientes" on clients;
create policy "criador vê e edita seus clientes"
  on clients for all
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "vê edificações de clientes próprios" on buildings;
create policy "vê edificações de clientes próprios"
  on buildings for select
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = (select auth.uid())));

drop policy if exists "cria edificações em clientes próprios" on buildings;
create policy "cria edificações em clientes próprios"
  on buildings for insert
  with check (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = (select auth.uid())));

drop policy if exists "edita edificações de clientes próprios" on buildings;
create policy "edita edificações de clientes próprios"
  on buildings for update
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = (select auth.uid())))
  with check (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = (select auth.uid())));

drop policy if exists "exclui edificações de clientes próprios" on buildings;
create policy "exclui edificações de clientes próprios"
  on buildings for delete
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = (select auth.uid())));

drop policy if exists "usuário registra sua própria ação de auditoria" on audit_log;
create policy "usuário registra sua própria ação de auditoria"
  on audit_log for insert
  with check (profile_id = (select auth.uid()));

-- ============================================================
-- 3) inspections: elimina a policy permissiva duplicada de SELECT
-- ============================================================
drop policy if exists "responsável técnico cria/edita a vistoria" on inspections;

create policy "responsável técnico cria vistoria"
  on inspections for insert
  with check (responsible_id = (select auth.uid()));

create policy "responsável técnico atualiza vistoria"
  on inspections for update
  using (responsible_id = (select auth.uid()))
  with check (responsible_id = (select auth.uid()));

create policy "responsável técnico exclui vistoria"
  on inspections for delete
  using (responsible_id = (select auth.uid()));

-- ============================================================
-- 4) Índices em FK sem cobertura (INFO do advisor de performance)
-- ============================================================
create index if not exists anomalies_catalog_id_idx on anomalies (catalog_id);
create index if not exists anomalies_created_by_idx on anomalies (created_by);
create index if not exists anomalies_inspection_id_idx on anomalies (inspection_id);
create index if not exists anomaly_photos_anomaly_id_idx on anomaly_photos (anomaly_id);
create index if not exists audit_log_profile_id_idx on audit_log (profile_id);
create index if not exists buildings_client_id_idx on buildings (client_id);
create index if not exists catalog_products_anomaly_catalog_id_idx on catalog_products (anomaly_catalog_id);
create index if not exists clients_created_by_idx on clients (created_by);
create index if not exists inspection_members_profile_id_idx on inspection_members (profile_id);
create index if not exists inspections_building_id_idx on inspections (building_id);
create index if not exists inspections_responsible_id_idx on inspections (responsible_id);
create index if not exists reports_created_by_idx on reports (created_by);
