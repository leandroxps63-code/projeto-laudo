-- Corrige "infinite recursion detected in policy for relation inspections",
-- encontrado testando o fluxo real logado (criar vistoria).
--
-- Causa: a policy de SELECT de `inspections` faz EXISTS em `inspection_members`,
-- e a policy de SELECT de `inspection_members` faz EXISTS em `inspections` —
-- cada tabela reavalia a policy da outra indefinidamente.
--
-- Fix padrão do Postgres/Supabase: funções SECURITY DEFINER, que rodam com o
-- privilégio de quem criou a função (dono das tabelas), então a consulta
-- interna ignora RLS — quebra o ciclo em vez de reavaliar a policy da tabela
-- referenciada.

create or replace function public.is_inspection_responsible(target_inspection_id uuid)
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

create or replace function public.is_inspection_member(target_inspection_id uuid)
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

create or replace function public.is_inspection_assistant(target_inspection_id uuid)
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

revoke all on function public.is_inspection_responsible(uuid) from public;
revoke all on function public.is_inspection_member(uuid) from public;
revoke all on function public.is_inspection_assistant(uuid) from public;
grant execute on function public.is_inspection_responsible(uuid) to authenticated;
grant execute on function public.is_inspection_member(uuid) to authenticated;
grant execute on function public.is_inspection_assistant(uuid) to authenticated;
-- Supabase concede EXECUTE em toda função nova do schema public pra anon/authenticated
-- por default privilege própria (independente do "revoke ... from public" acima) —
-- precisa revogar de anon explicitamente; só usuário autenticado usa essas funções.
revoke execute on function public.is_inspection_responsible(uuid) from anon;
revoke execute on function public.is_inspection_member(uuid) from anon;
revoke execute on function public.is_inspection_assistant(uuid) from anon;

-- ============================================================
-- inspections
-- ============================================================
drop policy if exists "responsável e membros veem a vistoria" on inspections;
create policy "responsável e membros veem a vistoria"
  on inspections for select
  using (responsible_id = auth.uid() or public.is_inspection_member(id));

-- ============================================================
-- inspection_members
-- ============================================================
drop policy if exists "membros veem a própria lista de membros da vistoria" on inspection_members;
create policy "membros veem a própria lista de membros da vistoria"
  on inspection_members for select
  using (profile_id = auth.uid() or public.is_inspection_responsible(inspection_id));

drop policy if exists "responsável técnico adiciona membros" on inspection_members;
create policy "responsável técnico adiciona membros"
  on inspection_members for insert
  with check (public.is_inspection_responsible(inspection_id));

drop policy if exists "responsável técnico remove membros" on inspection_members;
create policy "responsável técnico remove membros"
  on inspection_members for delete
  using (public.is_inspection_responsible(inspection_id));

-- ============================================================
-- anomalies
-- ============================================================
drop policy if exists "membros veem anomalias da vistoria" on anomalies;
create policy "membros veem anomalias da vistoria"
  on anomalies for select
  using (public.is_inspection_responsible(inspection_id) or public.is_inspection_member(inspection_id));

drop policy if exists "responsável e assistente registram anomalias" on anomalies;
create policy "responsável e assistente registram anomalias"
  on anomalies for insert
  with check (public.is_inspection_responsible(inspection_id) or public.is_inspection_assistant(inspection_id));

-- ============================================================
-- anomaly_photos
-- ============================================================
drop policy if exists "membros veem fotos da anomalia" on anomaly_photos;
create policy "membros veem fotos da anomalia"
  on anomaly_photos for select
  using (
    exists (
      select 1 from anomalies a
      where a.id = anomaly_photos.anomaly_id
        and (public.is_inspection_responsible(a.inspection_id) or public.is_inspection_member(a.inspection_id))
    )
  );

drop policy if exists "responsável e assistente registram fotos da anomalia" on anomaly_photos;
create policy "responsável e assistente registram fotos da anomalia"
  on anomaly_photos for insert
  with check (
    exists (
      select 1 from anomalies a
      where a.id = anomaly_photos.anomaly_id
        and (public.is_inspection_responsible(a.inspection_id) or public.is_inspection_assistant(a.inspection_id))
    )
  );

-- ============================================================
-- reports
-- ============================================================
drop policy if exists "membros veem laudos da vistoria" on reports;
create policy "membros veem laudos da vistoria"
  on reports for select
  using (public.is_inspection_responsible(inspection_id) or public.is_inspection_member(inspection_id));

drop policy if exists "responsável técnico gera laudo" on reports;
create policy "responsável técnico gera laudo"
  on reports for insert
  with check (public.is_inspection_responsible(inspection_id));

-- ============================================================
-- storage.objects (buckets anomaly-photos e reports)
-- ============================================================
drop policy if exists "membros veem fotos da vistoria no storage" on storage.objects;
create policy "membros veem fotos da vistoria no storage"
  on storage.objects for select
  using (
    bucket_id = 'anomaly-photos'
    and (
      public.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or public.is_inspection_member(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "responsável e assistente sobem fotos no storage" on storage.objects;
create policy "responsável e assistente sobem fotos no storage"
  on storage.objects for insert
  with check (
    bucket_id = 'anomaly-photos'
    and (
      public.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or public.is_inspection_assistant(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "membros veem arquivos de laudo no storage" on storage.objects;
create policy "membros veem arquivos de laudo no storage"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and (
      public.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or public.is_inspection_member(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "responsável técnico sobe arquivos de laudo no storage" on storage.objects;
create policy "responsável técnico sobe arquivos de laudo no storage"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and public.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
  );
