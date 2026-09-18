-- Reconciliação real dos repasses de 01/2026 a 09/2026 contra as NFS-e de
-- fato emitidas (pasta NFS/ do projeto, nºs 1-4, 6-16 — a 5 nunca foi
-- emitida). Valor e competência foram lidos do PDF de cada nota; só a NFS-e
-- 12 é uma imagem escaneada sem texto selecionável — seu valor
-- (R$ 1.969,46) e o período do lote (11 a 16/06) foram inferidos por
-- diferença exata em relação ao total de junho e às notas 10/11 vizinhas.
-- Reanexe o PDF de cada NF pela tela (`/repasses/{lote}`) pra guardar o
-- arquivo em si — esta migration só grava os dados, não o binário.
with reconciliacao (periodo_inicio, periodo_fim, nf_numero, nf_competencia, valor, data_pagamento) as (
  values
    ('2026-01-01'::date, '2026-01-15'::date, '1',  '2026-01-15'::date, 449.68,   '2026-03-04'::date),
    ('2026-02-01'::date, '2026-02-13'::date, '2',  '2026-02-13'::date, 190.78,   '2026-03-04'::date),
    ('2026-02-14'::date, '2026-02-28'::date, '3',  '2026-02-28'::date, 1626.40,  '2026-03-04'::date),
    ('2026-03-01'::date, '2026-03-30'::date, '4',  '2026-03-30'::date, 2202.40,  '2026-03-30'::date),
    ('2026-04-01'::date, '2026-04-30'::date, '6',  '2026-04-30'::date, 1164.67,  '2026-04-30'::date),
    ('2026-05-01'::date, '2026-05-08'::date, '7',  '2026-05-08'::date, 2153.43,  '2026-05-09'::date),
    ('2026-05-09'::date, '2026-05-20'::date, '8',  '2026-05-20'::date, 12207.49, '2026-05-20'::date),
    ('2026-05-21'::date, '2026-05-28'::date, '9',  '2026-05-28'::date, 1634.78,  '2026-05-28'::date),
    ('2026-06-01'::date, '2026-06-10'::date, '10', '2026-06-10'::date, 2061.77,  '2026-06-10'::date),
    ('2026-06-11'::date, '2026-06-16'::date, '12', '2026-06-16'::date, 1969.46,  '2026-06-16'::date),
    ('2026-06-17'::date, '2026-06-22'::date, '11', '2026-06-22'::date, 13359.10, '2026-06-22'::date),
    ('2026-07-01'::date, '2026-07-30'::date, '13', '2026-07-30'::date, 9915.08,  '2026-07-30'::date),
    ('2026-08-01'::date, '2026-08-07'::date, '14', '2026-08-07'::date, 414.45,   '2026-08-07'::date),
    ('2026-08-08'::date, '2026-08-20'::date, '15', '2026-08-20'::date, 834.63,   '2026-08-20'::date),
    ('2026-09-01'::date, '2026-09-10'::date, '16', '2026-09-10'::date, 4569.42,  '2026-09-10'::date)
)
update public.repasses_lotes l
set
  status = 'pago',
  nf_info = r.nf_numero,
  nf_competencia = r.nf_competencia,
  data_pagamento = r.data_pagamento,
  valor_pago = r.valor
from reconciliacao r
where l.periodo_inicio = r.periodo_inicio and l.periodo_fim = r.periodo_fim;
