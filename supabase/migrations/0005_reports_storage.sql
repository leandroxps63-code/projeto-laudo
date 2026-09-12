-- RF-10/RF-11 — arquivos gerados do laudo (planilha de ação, e futuramente PDF).
-- Bucket privado; acesso via signed URL, nunca público direto.
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Convenção de caminho: {inspection_id}/{report_id}.xlsx (ou .pdf)

create policy "membros veem arquivos de laudo no storage"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and exists (
      select 1 from inspections i
      where i.id = (storage.foldername(name))[1]::uuid
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid()))
    )
  );

create policy "responsável técnico sobe arquivos de laudo no storage"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and exists (
      select 1 from inspections i
      where i.id = (storage.foldername(name))[1]::uuid and i.responsible_id = auth.uid()
    )
  );
