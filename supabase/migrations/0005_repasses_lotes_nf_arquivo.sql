-- Guarda o próprio arquivo da NF anexada ao lote (pra poder baixar depois) e a
-- competência lida do documento. `nf_info` já existia e passa a guardar o
-- número da NFS-e extraído automaticamente do PDF, em vez de digitado à mão.
alter table public.repasses_lotes
  add column nf_competencia date,
  add column nf_arquivo_nome text,
  add column nf_arquivo_base64 text;
