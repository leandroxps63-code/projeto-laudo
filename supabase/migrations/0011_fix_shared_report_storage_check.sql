-- A policy de storage.objects de 0009 fazia uma subquery direta em `reports`
-- pra checar share_enabled — mas essa subquery também é filtrada pela RLS
-- de `reports` (que não libera nada pra anon), então nunca encontrava a
-- linha mesmo com share_enabled=true: signed URL sempre voltava "Object
-- not found". A correção NÃO pode ser abrir SELECT em `reports` pra anon
-- (vazaria share_token de outros laudos compartilhados) — usa-se uma
-- função SECURITY DEFINER que só devolve um boolean, mesmo padrão já usado
-- pra resolver a recursão de RLS em inspections/inspection_members.
-- Achado testando o link público de verdade no navegador.

create or replace function public.is_report_file_shared(p_path text)
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

revoke all on function public.is_report_file_shared(text) from public;
grant execute on function public.is_report_file_shared(text) to anon, authenticated;

drop policy if exists "arquivo de laudo com compartilhamento ativo é legível" on storage.objects;
create policy "arquivo de laudo com compartilhamento ativo é legível"
  on storage.objects for select
  to anon
  using (bucket_id = 'reports' and public.is_report_file_shared(name));
