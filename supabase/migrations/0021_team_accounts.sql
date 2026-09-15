-- Equipe (RF pendente, pedido do Leandro): um usuário pode entrar na
-- "conta" de outro (dono) e passar a enxergar e editar os mesmos
-- clientes/edificações/vistorias/laudos — a landing já promete isso
-- ("padroniza o laudo entre todos os vistoriadores do time"), só não
-- existia nenhuma implementação. Modelo: dono (team_owner_id null) +
-- membros (team_owner_id = id do dono). Acesso de membro é paridade
-- total com o dono dentro da conta — sem hierarquia adicional além do
-- que já existia (papel é só rótulo de exibição). Confirmado com o
-- Leandro (2026-09-15) o compartilhamento de dado entre contas e a
-- função com privilégio elevado que consulta e-mail de usuário.

alter table profiles add column if not exists team_owner_id uuid references profiles(id);
create index if not exists profiles_team_owner_id_idx on profiles (team_owner_id);

create or replace function private.my_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select team_owner_id from profiles where id = auth.uid()),
    auth.uid()
  );
$$;
revoke all on function private.my_account_id() from public;
grant execute on function private.my_account_id() to authenticated;

-- ============================================================
-- profiles: dono vê seus membros, membro vê o dono e os colegas
-- ============================================================
drop policy if exists "usuário vê o próprio perfil" on profiles;
create policy "equipe vê os perfis da mesma conta"
  on profiles for select
  using (id = private.my_account_id() or team_owner_id = private.my_account_id());

-- ============================================================
-- clients: account_id é a conta dona do dado (independe de quem
-- pessoalmente cadastrou) — permite a equipe inteira compartilhar a
-- mesma carteira de clientes.
-- ============================================================
alter table clients add column if not exists account_id uuid;
update clients set account_id = created_by where account_id is null;
alter table clients alter column account_id set not null;
create index if not exists clients_account_id_idx on clients (account_id);

create or replace function private.set_client_account_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_id is null then
    new.account_id := private.my_account_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_client_account_id on clients;
create trigger set_client_account_id
  before insert on clients
  for each row execute function private.set_client_account_id();

drop policy if exists "criador vê e edita seus clientes" on clients;
create policy "equipe vê e edita os clientes da conta"
  on clients for all
  using (account_id = private.my_account_id())
  with check (account_id = private.my_account_id());

-- ============================================================
-- buildings: segue account_id do cliente dono
-- ============================================================
drop policy if exists "vê edificações de clientes próprios" on buildings;
create policy "vê edificações de clientes da equipe"
  on buildings for select
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.account_id = private.my_account_id()));

drop policy if exists "cria edificações em clientes próprios" on buildings;
create policy "cria edificações em clientes da equipe"
  on buildings for insert
  with check (exists (select 1 from clients c where c.id = buildings.client_id and c.account_id = private.my_account_id()));

drop policy if exists "edita edificações de clientes próprios" on buildings;
create policy "edita edificações de clientes da equipe"
  on buildings for update
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.account_id = private.my_account_id()))
  with check (exists (select 1 from clients c where c.id = buildings.client_id and c.account_id = private.my_account_id()));

drop policy if exists "exclui edificações de clientes próprios" on buildings;
create policy "exclui edificações de clientes da equipe"
  on buildings for delete
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.account_id = private.my_account_id()));

-- ============================================================
-- inspections/anomalies/anomaly_photos/reports: um membro do time é
-- tratado como colega de vistoria em qualquer vistoria da conta, além
-- dos mecanismos já existentes (responsible_id e inspection_members,
-- que continuam funcionando do jeito que já funcionavam).
-- ============================================================
create or replace function private.is_inspection_teammate(target_inspection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from inspections i
    join buildings b on b.id = i.building_id
    join clients c on c.id = b.client_id
    where i.id = target_inspection_id and c.account_id = private.my_account_id()
  );
$$;
revoke all on function private.is_inspection_teammate(uuid) from public;
grant execute on function private.is_inspection_teammate(uuid) to anon, authenticated;

drop policy if exists "responsável e membros veem a vistoria" on inspections;
create policy "responsável e membros veem a vistoria"
  on inspections for select
  using (
    responsible_id = (select auth.uid())
    or private.is_inspection_member(id)
    or private.is_inspection_teammate(id)
  );

drop policy if exists "responsável técnico atualiza vistoria" on inspections;
create policy "responsável técnico atualiza vistoria"
  on inspections for update
  using (responsible_id = (select auth.uid()) or private.is_inspection_teammate(id))
  with check (responsible_id = (select auth.uid()) or private.is_inspection_teammate(id));

drop policy if exists "responsável técnico exclui vistoria" on inspections;
create policy "responsável técnico exclui vistoria"
  on inspections for delete
  using (responsible_id = (select auth.uid()) or private.is_inspection_teammate(id));

drop policy if exists "membros veem anomalias da vistoria" on anomalies;
create policy "membros veem anomalias da vistoria"
  on anomalies for select
  using (
    private.is_inspection_responsible(inspection_id)
    or private.is_inspection_member(inspection_id)
    or private.is_inspection_teammate(inspection_id)
  );

drop policy if exists "responsável e assistente registram anomalias" on anomalies;
create policy "responsável e assistente registram anomalias"
  on anomalies for insert
  with check (
    private.is_inspection_responsible(inspection_id)
    or private.is_inspection_assistant(inspection_id)
    or private.is_inspection_teammate(inspection_id)
  );

drop policy if exists "responsável e assistente editam anomalias" on anomalies;
create policy "responsável e assistente editam anomalias"
  on anomalies for update
  using (
    private.is_inspection_responsible(inspection_id)
    or private.is_inspection_assistant(inspection_id)
    or private.is_inspection_teammate(inspection_id)
  )
  with check (
    private.is_inspection_responsible(inspection_id)
    or private.is_inspection_assistant(inspection_id)
    or private.is_inspection_teammate(inspection_id)
  );

drop policy if exists "responsável e assistente excluem anomalias" on anomalies;
create policy "responsável e assistente excluem anomalias"
  on anomalies for delete
  using (
    private.is_inspection_responsible(inspection_id)
    or private.is_inspection_assistant(inspection_id)
    or private.is_inspection_teammate(inspection_id)
  );

drop policy if exists "membros veem fotos da anomalia" on anomaly_photos;
create policy "membros veem fotos da anomalia"
  on anomaly_photos for select
  using (
    exists (
      select 1 from anomalies a
      where a.id = anomaly_photos.anomaly_id
        and (
          private.is_inspection_responsible(a.inspection_id)
          or private.is_inspection_member(a.inspection_id)
          or private.is_inspection_teammate(a.inspection_id)
        )
    )
  );

drop policy if exists "responsável e assistente registram fotos da anomalia" on anomaly_photos;
create policy "responsável e assistente registram fotos da anomalia"
  on anomaly_photos for insert
  with check (
    exists (
      select 1 from anomalies a
      where a.id = anomaly_photos.anomaly_id
        and (
          private.is_inspection_responsible(a.inspection_id)
          or private.is_inspection_assistant(a.inspection_id)
          or private.is_inspection_teammate(a.inspection_id)
        )
    )
  );

drop policy if exists "membros veem laudos da vistoria" on reports;
create policy "membros veem laudos da vistoria"
  on reports for select
  using (
    private.is_inspection_responsible(inspection_id)
    or private.is_inspection_member(inspection_id)
    or private.is_inspection_teammate(inspection_id)
  );

drop policy if exists "responsável técnico gera laudo" on reports;
create policy "responsável técnico gera laudo"
  on reports for insert
  with check (private.is_inspection_responsible(inspection_id) or private.is_inspection_teammate(inspection_id));

drop policy if exists "responsável técnico atualiza o laudo" on reports;
create policy "responsável técnico atualiza o laudo"
  on reports for update
  using (private.is_inspection_responsible(inspection_id) or private.is_inspection_teammate(inspection_id))
  with check (private.is_inspection_responsible(inspection_id) or private.is_inspection_teammate(inspection_id));

-- ---- storage: mesma extensão nos buckets anomaly-photos e reports ----

drop policy if exists "membros veem fotos da vistoria no storage" on storage.objects;
create policy "membros veem fotos da vistoria no storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'anomaly-photos'
    and (
      private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_member(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_teammate(((storage.foldername(name))[1])::uuid)
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
      or private.is_inspection_teammate(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "responsável e assistente apagam fotos no storage" on storage.objects;
create policy "responsável e assistente apagam fotos no storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'anomaly-photos'
    and (
      private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_assistant(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_teammate(((storage.foldername(name))[1])::uuid)
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
      or private.is_inspection_teammate(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "responsável técnico sobe arquivos de laudo no storage" on storage.objects;
create policy "responsável técnico sobe arquivos de laudo no storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reports'
    and (
      private.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
      or private.is_inspection_teammate(((storage.foldername(name))[1])::uuid)
    )
  );

-- ============================================================
-- convite/saída de equipe — SECURITY DEFINER porque precisa consultar
-- auth.users por e-mail (inacessível direto pra authenticated) e
-- escrever no profiles de OUTRO usuário (fora do que a policy de
-- update de profiles permite: cada um só edita o próprio).
-- ============================================================
create or replace function private.invite_to_team(p_email text, p_role public.user_role default 'assistente')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_team_owner uuid;
  target_user_id uuid;
  target_profile record;
begin
  if caller_id is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select team_owner_id into caller_team_owner from profiles where id = caller_id;
  if caller_team_owner is not null then
    return json_build_object('ok', false, 'error', 'caller_is_a_member');
  end if;

  select id into target_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if target_user_id is null then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if target_user_id = caller_id then
    return json_build_object('ok', false, 'error', 'cannot_invite_self');
  end if;

  select * into target_profile from profiles where id = target_user_id;

  if target_profile.team_owner_id is not null and target_profile.team_owner_id <> caller_id then
    return json_build_object('ok', false, 'error', 'already_on_another_team');
  end if;

  if exists (select 1 from clients where account_id = target_user_id) then
    return json_build_object('ok', false, 'error', 'target_has_own_data');
  end if;

  update profiles set team_owner_id = caller_id, role = p_role where id = target_user_id;

  return json_build_object('ok', true, 'id', target_user_id, 'name', target_profile.full_name);
end;
$$;
revoke all on function private.invite_to_team(text, public.user_role) from public;
grant execute on function private.invite_to_team(text, public.user_role) to authenticated;

create or replace function private.remove_team_member(p_member_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = p_member_id and team_owner_id = auth.uid()) then
    return json_build_object('ok', false, 'error', 'not_a_member');
  end if;
  update profiles set team_owner_id = null where id = p_member_id;
  return json_build_object('ok', true);
end;
$$;
revoke all on function private.remove_team_member(uuid) from public;
grant execute on function private.remove_team_member(uuid) to authenticated;

create or replace function private.leave_team()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set team_owner_id = null where id = auth.uid() and team_owner_id is not null;
  return json_build_object('ok', true);
end;
$$;
revoke all on function private.leave_team() from public;
grant execute on function private.leave_team() to authenticated;
