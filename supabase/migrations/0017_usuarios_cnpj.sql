-- Permite cadastrar login com CNPJ (vendedor/assessor que opera como PJ),
-- mesmo padrão tipo_doc/cnpj/cpf já usado em `clientes` (0001_core.sql).
alter table public.usuarios
  add column tipo_doc text not null default 'cpf' check (tipo_doc in ('cnpj', 'cpf')),
  add column cnpj text;
