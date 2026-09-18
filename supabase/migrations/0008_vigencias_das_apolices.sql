-- Início/fim de vigência lidos das apólices reais (pasta APÓLICES/ do
-- projeto) — 15 das 21 produções tinham o PDF da apólice correspondente.
-- As 6 restantes (Allianz da Rebeca, duas produções TRANSPORTE-TR da LAL,
-- duas da Marques Transportes e a Empresarial da PVN) não têm apólice na
-- pasta — ficam sem vigência até o PDF aparecer.
update public.producoes set vigencia_inicio = '2025-12-29', vigencia_fim = '2026-12-29' where num_apolice = '31.08.2025.0547853';
update public.producoes set vigencia_inicio = '2026-01-01', vigencia_fim = '2026-07-01' where num_apolice = '001 0655 06 0040037280000';
update public.producoes set vigencia_inicio = '2026-01-01', vigencia_fim = '2026-07-01' where num_apolice = '001 0654 06 0040052040000';
update public.producoes set vigencia_inicio = '2026-01-01', vigencia_fim = '2026-07-01' where num_apolice = '001 0655 06 0040037290000';
update public.producoes set vigencia_inicio = '2026-01-01', vigencia_fim = '2026-07-01' where num_apolice = '001 0654 06 0040052050000';
update public.producoes set vigencia_inicio = '2026-02-19', vigencia_fim = '2027-02-19' where num_apolice = '540 00103059';
update public.producoes set vigencia_inicio = '2026-02-19', vigencia_fim = '2027-02-19' where num_apolice = '550 00101517';
update public.producoes set vigencia_inicio = '2026-04-01', vigencia_fim = '2027-04-01' where num_apolice = '01.035.131.034174';
update public.producoes set vigencia_inicio = '2026-04-01', vigencia_fim = '2027-04-01' where num_apolice = '01.035.131.034174 / 0001';
update public.producoes set vigencia_inicio = '2026-07-03', vigencia_fim = '2027-07-03' where num_apolice = '1003100135942';
update public.producoes set vigencia_inicio = '2026-03-05', vigencia_fim = '2027-03-05' where num_apolice = '001 0654 06 0040055570000';
update public.producoes set vigencia_inicio = '2026-03-05', vigencia_fim = '2027-03-05' where num_apolice = '001 0655 06 0040039790000';
update public.producoes set vigencia_inicio = '2026-07-31', vigencia_fim = '2027-07-31' where num_apolice = '54044';
update public.producoes set vigencia_inicio = '2026-07-31', vigencia_fim = '2027-07-30' where num_apolice = '02241202605311343320';
update public.producoes set vigencia_inicio = '2026-06-06', vigencia_fim = '2027-06-06' where num_apolice = '06 26 0531 29035625';
