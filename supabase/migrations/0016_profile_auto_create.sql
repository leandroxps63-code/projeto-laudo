-- Cria profiles automaticamente para novos usuários do Supabase Auth.
-- Sem isso, todo usuário novo (criado direto no painel, sem passar por um
-- fluxo de signup que grave metadata) quebra em qualquer insert que
-- referencie profiles(id) — ex: clients.created_by — com violação de FK,
-- porque a linha correspondente em public.profiles nunca é criada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill dos usuários que já existiam antes desse trigger existir.
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
