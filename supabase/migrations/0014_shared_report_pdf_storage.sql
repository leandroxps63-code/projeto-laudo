-- is_report_file_shared (usada pela policy de storage do link público, RF-11)
-- só comparava com reports.excel_url — sobrou de quando só existia planilha.
-- Com o PDF real (a5), o arquivo .pdf batia em share_enabled=true mas a
-- função devolvia false pra ele, e createSignedUrl falhava silenciosamente
-- (RLS bloqueando), fazendo a página pública mostrar sempre "PDF ainda não
-- disponível" mesmo com o compartilhamento ativo. Achado testando o link
-- público de verdade depois de implementar o PDF.
create or replace function private.is_report_file_shared(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from reports r
    where (r.excel_url = p_path or r.pdf_url = p_path) and r.share_enabled = true
  );
$$;
