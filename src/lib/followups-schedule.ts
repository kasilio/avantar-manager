// Cronograma de follow-up gerado automaticamente pra cada produção fechada —
// fonte da verdade em supabase/migrations/0006_followups_fluxo_cliente.sql
// (função `gerar_followups()`); duplicado aqui só porque o mock client não
// roda triggers de Postgres, então precisa simular o mesmo efeito em TS pra
// dar pra testar localmente. Se mudar um dos dois, muda o outro também.
export interface EtapaFollowup {
  dias: number;
  motivo: string;
}

export const FOLLOWUP_SCHEDULE: EtapaFollowup[] = [
  { dias: 2, motivo: "Agradecer o fechamento" },
  { dias: 14, motivo: "Pedir indicação" },
  { dias: 60, motivo: "Ofertar um novo produto" },
  { dias: 180, motivo: "Verificar se está tudo bem" },
  { dias: 300, motivo: "Reforçar benefícios da apólice" },
  { dias: 330, motivo: "Negociar renovação" },
];
