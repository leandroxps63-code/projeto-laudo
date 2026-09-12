-- RF-09 — upload de foto por anomalia (Supabase Storage).
-- Bucket privado; acesso via signed URL, nunca público direto.
insert into storage.buckets (id, name, public)
values ('anomaly-photos', 'anomaly-photos', false)
on conflict (id) do nothing;

-- Convenção de caminho: {inspection_id}/{anomaly_id}/{arquivo}
-- storage.foldername(name) retorna os segmentos de pasta como array de texto.

create policy "membros veem fotos da vistoria no storage"
  on storage.objects for select
  using (
    bucket_id = 'anomaly-photos'
    and exists (
      select 1 from inspections i
      where i.id = (storage.foldername(name))[1]::uuid
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid()))
    )
  );

create policy "responsável e assistente sobem fotos no storage"
  on storage.objects for insert
  with check (
    bucket_id = 'anomaly-photos'
    and exists (
      select 1 from inspections i
      where i.id = (storage.foldername(name))[1]::uuid
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid() and im.role_on_inspection = 'assistente'))
    )
  );

-- anomaly_photos (tabela de metadados) tinha só policy de SELECT — mesmo
-- gap de "RLS enabled no policy" já corrigido em 0002 pra outras tabelas.
create policy "responsável e assistente registram fotos da anomalia"
  on anomaly_photos for insert
  with check (
    exists (
      select 1 from anomalies a
      join inspections i on i.id = a.inspection_id
      where a.id = anomaly_photos.anomaly_id
        and (i.responsible_id = auth.uid()
             or exists (select 1 from inspection_members im where im.inspection_id = i.id and im.profile_id = auth.uid() and im.role_on_inspection = 'assistente'))
    )
  );
