# packages/shared

Código compartilhado entre `apps/web` e `apps/mobile`:

- `types.ts` — tipos de domínio "amigáveis" (camelCase), usados na maioria dos componentes
- `database.types.ts` — **gerado automaticamente** a partir do projeto Supabase real (`projeto-laudo-dev`), reflete o schema exato incluindo enums. Regenerar sempre que a migration mudar.
- `supabaseClient.ts` — fábrica do cliente Supabase, já tipado com `Database`

Modelo de dados de referência: `supabase/migrations/0001_init.sql` na raiz do repo, e documento "Arquitetura Técnica — Stack e Decisões" (seção a4) no Notion do projeto.
