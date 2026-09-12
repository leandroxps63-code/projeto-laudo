-- RF-11 — compartilhamento de laudo por link público, sem exigir login de
-- quem recebe (ex: síndico). Segurança por "capability URL": só quem tem o
-- token (uuid aleatório, impossível de adivinhar) consegue acessar, e o
-- dono pode desativar o link a qualquer momento (share_enabled).

alter table reports add column share_token uuid not null default gen_random_uuid();
alter table reports add column share_enabled boolean not null default false;
create unique index reports_share_token_key on reports (share_token);

-- RPC pública (SECURITY DEFINER): dado um token válido e com compartilhamento
-- ativo, devolve só os dados necessários pra tela pública — nunca expõe a
-- tabela reports inteira nem permite listar/enumerar laudos de outros.
create or replace function public.get_shared_report(p_token uuid)
returns table (
  id uuid,
  report_number text,
  version int,
  status report_status,
  art_number text,
  excel_path text,
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
  select r.id, r.report_number, r.version, r.status, r.art_number, r.excel_url,
         r.generated_at, r.created_at, b.name, b.address
  from reports r
  join inspections i on i.id = r.inspection_id
  join buildings b on b.id = i.building_id
  where r.share_token = p_token and r.share_enabled = true;
$$;

revoke all on function public.get_shared_report(uuid) from public;
grant execute on function public.get_shared_report(uuid) to anon, authenticated;

-- Permite gerar signed URL do arquivo (.xlsx) de um laudo com compartilhamento
-- ativo, sem exigir que o visitante seja membro da vistoria. O path inclui
-- UUIDs (inspection_id/report_id) — impossível de adivinhar sem o token.
create policy "arquivo de laudo com compartilhamento ativo é legível"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'reports'
    and exists (select 1 from reports r where r.excel_url = storage.objects.name and r.share_enabled = true)
  );
