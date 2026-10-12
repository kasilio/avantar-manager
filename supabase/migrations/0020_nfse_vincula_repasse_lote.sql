-- Vincula emissões de NFS-e ao lote de repasse que elas cobrem — toda NF que
-- a Avantar emite corresponde ao valor total de um lote já importado (ver
-- repasses_lotes.comissao_bruta_total e o fluxo legado "Anexar NF" em
-- src/app/(dashboard)/repasses/actions.ts). Nullable: nem toda emissão
-- precisa vir de um lote (a NF nº16 seedada em 0019 fica sem vínculo).
-- Sem unique: uma tentativa rejeitada/com erro gera uma nova linha pro mesmo
-- lote, nunca reaproveitando número de DPS (mesma regra da 0019).
--
-- on delete restrict: trava no banco contra apagar um lote que ainda tem
-- emissão assinada/transmitida vinculada — a action excluirLote() limpa
-- rascunhos/rejeitados/erros antes de tentar apagar o lote, então essa
-- trava só dispara se sobrar algo com valor legal real.
alter table public.nfse_emissoes
  add column repasse_lote_id uuid references public.repasses_lotes (id) on delete restrict;

create index nfse_emissoes_repasse_lote_id_idx on public.nfse_emissoes (repasse_lote_id);
