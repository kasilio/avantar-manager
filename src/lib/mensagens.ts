// Mensagens prontas (copiar e colar) por etapa do fluxo de relacionamento —
// ajuste o texto à vontade, isso aqui é só o ponto de partida.
const MENSAGENS_FOLLOWUP: Record<string, (cliente: string) => string> = {
  "Agradecer o fechamento": (c) =>
    `Oi ${c}! Passando pra agradecer demais pela confiança em fechar comigo. Qualquer dúvida ou necessidade, pode me chamar sempre! 🙌`,
  "Pedir indicação": (c) =>
    `Oi ${c}, tudo bem? Fico muito feliz em ter você como cliente! Se conhecer alguém que também possa precisar de um seguro, eu ficaria muito grato se pudesse me indicar 🙏`,
  "Ofertar um novo produto": (c) =>
    `Oi ${c}! Passando pra saber como você está e aproveitar pra te apresentar outras soluções que podem fazer sentido pra você, além do que já temos hoje. Posso te mandar mais detalhes?`,
  "Verificar se está tudo bem": (c) =>
    `Oi ${c}, tudo bem? Só passando pra saber se está tudo certo com sua apólice e se você está precisando de alguma coisa. Pode me chamar sempre que precisar! 😊`,
  "Reforçar benefícios da apólice": (c) =>
    `Oi ${c}! Passando pra te lembrar dos benefícios que você tem disponíveis na sua apólice e que pode usar sempre que precisar. Qualquer dúvida, é só chamar!`,
  "Negociar renovação": (c) =>
    `Oi ${c}, tudo bem? Sua apólice está próxima do vencimento e eu adoraria já ir alinhando a renovação com você pra garantir as melhores condições. Podemos conversar?`,
};

export function mensagemFollowup(motivo: string, clienteNome: string): string | null {
  return MENSAGENS_FOLLOWUP[motivo]?.(clienteNome || "tudo bem") ?? null;
}

export function mensagemAniversario(nomeContato: string): string {
  return `Feliz aniversário, ${nomeContato}! 🎉 Desejo um dia incrível e um ano cheio de conquistas. Um abraço!`;
}
