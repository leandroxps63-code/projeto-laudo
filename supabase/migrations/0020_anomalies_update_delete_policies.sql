drop policy if exists "responsável e assistente editam anomalias" on anomalies;
create policy "responsável e assistente editam anomalias"
  on anomalies for update
  using (private.is_inspection_responsible(inspection_id) or private.is_inspection_assistant(inspection_id))
  with check (private.is_inspection_responsible(inspection_id) or private.is_inspection_assistant(inspection_id));

drop policy if exists "responsável e assistente excluem anomalias" on anomalies;
create policy "responsável e assistente excluem anomalias"
  on anomalies for delete
  using (private.is_inspection_responsible(inspection_id) or private.is_inspection_assistant(inspection_id));
