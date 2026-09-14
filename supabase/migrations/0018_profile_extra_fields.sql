-- Checklist "criação de conta" (2026-09-14): CPF, data de nascimento e
-- telefone entram como campos opcionais no perfil, preenchidos depois do
-- cadastro (tela própria de completar/editar perfil), não no formulário de
-- /cadastro — vale pra quem entra por e-mail/senha ou por Google.
--
-- crea já existe desde 0001_init.sql mas nunca teve UI pra preencher —
-- resolvido junto (mesma tela de perfil), sem precisar de migration nova
-- pra ele.
--
-- CPF ganha índice único parcial (ignora nulos, já que o campo é opcional)
-- — impede duas contas com o mesmo CPF sem impedir quem ainda não
-- preencheu. RLS de update já existente em profiles ("usuário edita o
-- próprio perfil") cobre a linha inteira, incluindo essas colunas novas —
-- não precisa de policy nova.
alter table public.profiles
  add column if not exists cpf text,
  add column if not exists birth_date date,
  add column if not exists phone text;

create unique index if not exists profiles_cpf_key
  on public.profiles (cpf)
  where cpf is not null;
