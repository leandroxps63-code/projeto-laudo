-- As policies de storage.objects criadas em 0004/0005 não tinham "to
-- authenticated" explícito, então valiam pra QUALQUER role (inclusive anon).
-- Quando o visitante anônimo de um link público (0009) tentava gerar a
-- signed URL do .xlsx, o Postgres avaliava TAMBÉM essas policies antigas
-- (que chamam is_inspection_responsible/is_inspection_member) — e como
-- anon não tem EXECUTE nessas funções, a query inteira falhava com
-- "permission denied for function is_inspection_responsible" em vez de
-- simplesmente pular a policy que não se aplica a ele.
-- Achado testando o link público de verdade no navegador.

drop policy if exists "membros veem fotos da vistoria no storage" on storage.objects;
create policy "membros veem fotos da vistoria no storage"
  on storage.objects for select
  to authenticated
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
  to authenticated
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
  to authenticated
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
  to authenticated
  with check (
    bucket_id = 'reports'
    and public.is_inspection_responsible(((storage.foldername(name))[1])::uuid)
  );
