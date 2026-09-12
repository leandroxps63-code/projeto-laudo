-- reports tinha só SELECT/INSERT — faltava UPDATE, então gravar excel_url/pdf_url
-- depois de gerar o arquivo falhava silenciosamente sob RLS (0 linhas afetadas,
-- "Cannot coerce the result to a single JSON object" no .single() do Supabase JS).
-- Achado testando o fluxo real de "Gerar laudo" logado.
create policy "responsável técnico atualiza o laudo"
  on reports for update
  using (public.is_inspection_responsible(inspection_id))
  with check (public.is_inspection_responsible(inspection_id));
