alter table public.clients
  add column if not exists person_type text not null default 'pf' check (person_type in ('pf', 'pj')),
  add column if not exists document text,
  add column if not exists contact_name text,
  add column if not exists contact_role text,
  add column if not exists zip_code text,
  add column if not exists street text,
  add column if not exists number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists notes text;

create unique index if not exists clients_created_by_document_key
  on public.clients (created_by, document) where document is not null;
