-- buildings só tinha SELECT/INSERT — faltava UPDATE/DELETE pra edição e
-- exclusão de edificação (mesmo padrão de dono via clients.created_by).
create policy "edita edificações de clientes próprios"
  on buildings for update
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = auth.uid()))
  with check (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = auth.uid()));

create policy "exclui edificações de clientes próprios"
  on buildings for delete
  using (exists (select 1 from clients c where c.id = buildings.client_id and c.created_by = auth.uid()));
