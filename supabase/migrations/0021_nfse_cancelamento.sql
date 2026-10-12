-- Cancelamento de NFS-e autorizada (evento e101101, Sefin Nacional). O
-- cancelamento é um evento sobre a mesma NFS-e, não uma nova emissão, então
-- fica na própria linha em vez de virar outra tentativa.
alter table public.nfse_emissoes
  drop constraint nfse_emissoes_status_check;
alter table public.nfse_emissoes
  add constraint nfse_emissoes_status_check
  check (status in ('rascunho', 'assinado', 'enviando', 'autorizado', 'rejeitado', 'erro', 'cancelado'));

alter table public.nfse_emissoes
  add column evento_cancelamento_xml text,
  add column motivo_cancelamento text,
  add column cancelado_em timestamptz,
  add column cancelado_por uuid references public.usuarios (id) on delete set null;
