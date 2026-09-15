-- Trava contra código de anomalia duplicado (AN-001, AN-002...) quando duas
-- pessoas da mesma equipe registram anomalia na mesma vistoria ao mesmo
-- tempo — o código antes só vinha de um count() lido antes do insert, sem
-- nenhuma garantia contra corrida. A unique constraint faz o banco recusar
-- a segunda tentativa com o mesmo código; a rota da API tenta de novo com o
-- próximo número (ver api/inspections/[id]/anomalies/route.ts).
create unique index if not exists anomalies_inspection_code_key
  on public.anomalies (inspection_id, code);
