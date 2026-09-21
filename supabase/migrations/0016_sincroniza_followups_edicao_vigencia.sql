-- gerar_followups() (0006/0014) só roda no INSERT da produção. Quando a
-- vigência é corrigida depois (updateProducao em
-- src/app/(dashboard)/producoes/actions.ts faz um UPDATE simples, sem tocar
-- em followups), os follow-ups pendentes ficavam com o due_date antigo —
-- foi exatamente isso que descolou as datas de follow-up/tarefa da vigência
-- real quando os dados de produção foram importados/publicados. Este
-- trigger mantém due_date em dia sempre que vigencia_inicio mudar.
-- Follow-ups já concluídos não são tocados (ficam como histórico, mesma
-- regra usada em 0006).
create or replace function public.sincronizar_followups_vigencia()
returns trigger
language plpgsql
as $$
begin
  if new.vigencia_inicio is distinct from old.vigencia_inicio then
    update public.followups
    set due_date = coalesce(new.vigencia_inicio, new.created_at::date) + dias
    where producao_id = new.id
      and concluido_em is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sincronizar_followups_vigencia on public.producoes;
create trigger trg_sincronizar_followups_vigencia
  after update on public.producoes
  for each row
  execute function public.sincronizar_followups_vigencia();
