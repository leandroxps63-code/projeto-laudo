-- get_shared_report (RF-11) só devolvia excel_path — ficou desatualizada
-- desde que a geração real de PDF (a5) passou a existir. Achado testando o
-- link público de verdade depois da migration de segurança (0012).
-- Mudar as colunas do retorno exige dropar a função antes (Postgres não
-- deixa trocar o "row type" de uma function existente com create or replace).
drop function if exists public.get_shared_report(uuid);

create or replace function public.get_shared_report(p_token uuid)
returns table (
  id uuid,
  report_number text,
  version int,
  status report_status,
  art_number text,
  excel_path text,
  pdf_path text,
  generated_at timestamptz,
  created_at timestamptz,
  building_name text,
  building_address text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.report_number, r.version, r.status, r.art_number, r.excel_url, r.pdf_url,
         r.generated_at, r.created_at, b.name, b.address
  from reports r
  join inspections i on i.id = r.inspection_id
  join buildings b on b.id = i.building_id
  where r.share_token = p_token and r.share_enabled = true;
$$;

revoke all on function public.get_shared_report(uuid) from public;
grant execute on function public.get_shared_report(uuid) to anon, authenticated;
