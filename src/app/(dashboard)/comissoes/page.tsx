import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtDateCurta, fmtMoney } from "@/lib/format";
import type { StatusAcertoComissao } from "@/types/database";

type AcertoRow = {
  id: string;
  status: StatusAcertoComissao;
  valor_total: number;
  created_at: string;
  usuarios: { nome: string } | null;
  repasses_lotes: { periodo_inicio: string; periodo_fim: string } | null;
};

// rascunho/enviado/confirmado pedem alguma ação (revisar, confirmar, pagar)
// — ficam no topo; pago é só histórico.
const ORDEM_STATUS: Record<StatusAcertoComissao, number> = {
  rascunho: 0,
  enviado: 1,
  confirmado: 2,
  pago: 3,
};

export default async function ComissoesPage() {
  const usuario = await requireCurrentUsuario();
  const isAdmin = usuario.papel === "admin";
  const supabase = await createClient();

  const { data } = await supabase
    .from("comissoes_acertos")
    .select("id, status, valor_total, created_at, usuarios(nome), repasses_lotes(periodo_inicio, periodo_fim)")
    .order("created_at", { ascending: false });

  const acertos = ((data ?? []) as unknown as AcertoRow[]).sort(
    (a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status],
  );

  const pendentesAdmin = acertos.filter((a) => a.status === "rascunho" || a.status === "confirmado").length;
  const pendentesVendedor = acertos.filter((a) => a.status === "enviado").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Comissões</h1>
      </div>

      {isAdmin && pendentesAdmin > 0 && (
        <p className="text-sm text-muted-foreground">
          {pendentesAdmin} acerto(s) esperando revisão/envio ou pagamento.
        </p>
      )}
      {!isAdmin && pendentesVendedor > 0 && (
        <p className="text-sm text-warning">
          Você tem {pendentesVendedor} acerto(s) esperando sua confirmação.
        </p>
      )}

      {acertos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum acerto de comissão ainda — ele é gerado automaticamente sempre que um repasse é marcado como pago.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {acertos.map((a) => (
          <Link
            key={a.id}
            href={`/comissoes/${a.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:border-primary"
          >
            <div>
              <div className="font-medium">
                {isAdmin ? a.usuarios?.nome ?? "—" : "Seu acerto"}
                {a.repasses_lotes && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    repasse {fmtDateCurta(a.repasses_lotes.periodo_inicio)} à {fmtDateCurta(a.repasses_lotes.periodo_fim)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-success">{fmtMoney(a.valor_total)}</span>
              <StatusBadge status={a.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
