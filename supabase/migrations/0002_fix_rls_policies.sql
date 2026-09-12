-- Corrige o advisor "rls_enabled_no_policy" em inspection_members e audit_log.

-- inspection_members: precisa de política própria, porque outras tabelas
-- (inspections, anomalies, anomaly_photos, reports) fazem subquery nela
-- dentro das próprias políticas de RLS — sem policy aqui, essa subquery
-- nunca retorna linha nenhuma e quebra o acesso de assistente/síndico.
create policy "membros veem a própria lista de membros da vistoria"
  on inspection_members for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from inspections i
      where i.id = inspection_members.inspection_id and i.responsible_id = auth.uid()
    )
  );

create policy "responsável técnico adiciona membros"
  on inspection_members for insert
  with check (
    exists (
      select 1 from inspections i
      where i.id = inspection_members.inspection_id and i.responsible_id = auth.uid()
    )
  );

create policy "responsável técnico remove membros"
  on inspection_members for delete
  using (
    exists (
      select 1 from inspections i
      where i.id = inspection_members.inspection_id and i.responsible_id = auth.uid()
    )
  );

-- audit_log: append-only para o próprio usuário: qualquer autenticado pode
-- registrar uma ação seguindo sua própria identidade; leitura fica de fora
-- do MVP (é log de sistema, não dado de usuário) — service role sempre
-- consegue ler/gravar, ignora RLS por padrão.
create policy "usuário registra sua própria ação de auditoria"
  on audit_log for insert
  with check (profile_id = auth.uid());
