-- As três funções de convite/saída de equipe precisam ser chamadas
-- direto pela aplicação via RPC (supabase.rpc(...)) — diferente de
-- is_inspection_responsible/my_account_id/etc, que só existem pra uso
-- interno dentro de outras policies de RLS, essas são a própria ação.
-- PostgREST só expõe RPC pra funções do schema `public` (por isso as
-- internas foram movidas pra `private` na migration 0012) — então
-- essas três ficam em `public`, mesmo padrão já usado por
-- get_shared_report (RF-11).

drop function if exists private.invite_to_team(text, public.user_role);
drop function if exists private.remove_team_member(uuid);
drop function if exists private.leave_team();

create or replace function public.invite_to_team(p_email text, p_role public.user_role default 'assistente')
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
revoke all on function public.invite_to_team(text, public.user_role) from public;
grant execute on function public.invite_to_team(text, public.user_role) to authenticated;

create or replace function public.remove_team_member(p_member_id uuid)
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
revoke all on function public.remove_team_member(uuid) from public;
grant execute on function public.remove_team_member(uuid) to authenticated;

create or replace function public.leave_team()
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
revoke all on function public.leave_team() from public;
grant execute on function public.leave_team() to authenticated;
