"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { previewImportacao, confirmarImportacao } from "@/app/(dashboard)/repasses/importar/actions";
import type {
  PreviewResultado,
  PreviewLinha,
  PreviewLancamento,
  CommitLinhaInput,
  CommitLancamentoInput,
  CommitResultado,
} from "@/lib/import/repasse-import";

function chaveLinha(l: PreviewLinha) {
  return `${l.arquivo}::${l.propostaId}::${l.parcela}`;
}

function chaveLancamento(l: PreviewLancamento) {
  return `${l.arquivo}::${l.creditoDebitoId}`;
}

function NovoBadge({ existe, label }: { existe: boolean; label: string }) {
  if (existe) return <>{label}</>;
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Badge variant="outline" className="text-[10px]">
        novo
      </Badge>
    </span>
  );
}

export function ImportarRepassesForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewResultado | null>(null);
  const [incluidas, setIncluidas] = useState<Record<string, boolean>>({});
  const [lancamentosIncluidos, setLancamentosIncluidos] = useState<Record<string, boolean>>({});
  const [tiposDoc, setTiposDoc] = useState<Record<string, "cnpj" | "cpf">>({});
  const [resultado, setResultado] = useState<CommitResultado | null>(null);
  const [analisando, startAnalise] = useTransition();
  const [confirmando, startConfirmacao] = useTransition();

  function handleAnalisar() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      toast.error("Selecione pelo menos um PDF.");
      return;
    }
    const formData = new FormData();
    for (const f of Array.from(files)) formData.append("arquivos", f);

    startAnalise(async () => {
      const resposta = await previewImportacao(formData);
      if (!resposta.ok) {
        toast.error(resposta.message);
        return;
      }
      const resultado = resposta.data;
      setPreview(resultado);
      setResultado(null);
      const inc: Record<string, boolean> = {};
      const doc: Record<string, "cnpj" | "cpf"> = {};
      for (const l of resultado.linhas) {
        inc[chaveLinha(l)] = !l.jaImportado;
        doc[chaveLinha(l)] = l.tipoDocSugerido;
      }
      setIncluidas(inc);
      setTiposDoc(doc);
      const incLanc: Record<string, boolean> = {};
      for (const l of resultado.lancamentos) {
        incLanc[chaveLancamento(l)] = !l.jaImportado;
      }
      setLancamentosIncluidos(incLanc);
    });
  }

  const totalSelecionadas = useMemo(
    () => Object.values(incluidas).filter(Boolean).length,
    [incluidas]
  );

  const totalLancamentosSelecionados = useMemo(
    () => Object.values(lancamentosIncluidos).filter(Boolean).length,
    [lancamentosIncluidos]
  );

  function handleConfirmar() {
    if (!preview) return;
    const linhas: CommitLinhaInput[] = preview.linhas
      .filter((l) => incluidas[chaveLinha(l)])
      .map((l) => ({
        arquivo: l.arquivo,
        propostaId: l.propostaId,
        apoliceEndosso: l.apoliceEndosso,
        seguradoNome: l.seguradoNome,
        parcelaId: l.parcelaId,
        parcela: l.parcela,
        ramoNome: l.ramoNome,
        companhiaNome: l.companhiaNome,
        apolicePct: l.apolicePct,
        repassePct: l.repassePct,
        comissao: l.comissao,
        periodo: l.periodo,
        tipoDocEscolhido: tiposDoc[chaveLinha(l)] ?? l.tipoDocSugerido,
      }));

    const lancamentos: CommitLancamentoInput[] = preview.lancamentos
      .filter((l) => lancamentosIncluidos[chaveLancamento(l)])
      .map((l) => ({
        arquivo: l.arquivo,
        creditoDebitoId: l.creditoDebitoId,
        data: l.data,
        documento: l.documento,
        descricao: l.descricao,
        corretora: l.corretora,
        valor: l.valor,
      }));

    if (linhas.length === 0 && lancamentos.length === 0) {
      toast.error("Nenhuma linha selecionada.");
      return;
    }

    startConfirmacao(async () => {
      const resposta = await confirmarImportacao(preview.relatorios, linhas, lancamentos);
      if (!resposta.ok) {
        toast.error(resposta.message);
        return;
      }
      setResultado(resposta.data);
      setPreview(null);
      toast.success("Importação concluída.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Selecione os PDFs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
          <Button type="button" onClick={handleAnalisar} disabled={analisando}>
            <Upload className="size-4" />
            {analisando ? "Analisando..." : "Analisar"}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importação concluída</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>Clientes criados: <span className="font-medium">{resultado.clientesCriados}</span></div>
            <div>Seguradoras criadas: <span className="font-medium">{resultado.seguradorasCriadas}</span></div>
            <div>Tipos de produto criados: <span className="font-medium">{resultado.tiposProdutoCriados}</span></div>
            <div>Produções criadas: <span className="font-medium">{resultado.producoesCriadas}</span></div>
            <div>Repasses criados: <span className="font-medium">{resultado.repassesCriados}</span></div>
            <div>Repasses ignorados (já existiam): <span className="font-medium">{resultado.repassesIgnorados}</span></div>
            <div>Lançamentos avulsos criados: <span className="font-medium">{resultado.lancamentosCriados}</span></div>
            <div>Lançamentos ignorados (já existiam): <span className="font-medium">{resultado.lancamentosIgnorados}</span></div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Confira os relatórios</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {preview.relatorios.map((r) => (
                <div key={r.arquivo} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.arquivo}</span>
                  <span className="text-muted-foreground">
                    {r.periodoInicio} a {r.periodoFim}
                  </span>
                  {r.totalConfere === false && (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <AlertTriangle className="size-3.5" />
                      soma ({fmtMoney(r.somaLinhas)}) não bate com o total do relatório ({fmtMoney(r.comissaoBrutaTotal)}) — revise antes de confirmar
                    </span>
                  )}
                  {r.linhasIgnoradas > 0 && (
                    <span className="text-destructive">{r.linhasIgnoradas} linha(s) não reconhecida(s)</span>
                  )}
                  {r.lancamentosAvulsosConferem === false && (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <AlertTriangle className="size-3.5" />
                      soma dos lançamentos avulsos ({fmtMoney(r.somaLancamentosAvulsos)}) não bate com o Créd./Déb. do relatório ({fmtMoney(r.creditoDebitoTotal)}) — revise antes de confirmar
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                3. Revise as linhas ({totalSelecionadas} de {preview.linhas.length} selecionadas)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Seguradora</TableHead>
                      <TableHead>Proposta / Apólice</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.linhas.map((l) => {
                      const key = chaveLinha(l);
                      return (
                        <TableRow key={key} className={l.jaImportado ? "opacity-50" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={incluidas[key] ?? false}
                              disabled={l.jaImportado}
                              onCheckedChange={(checked) => setIncluidas((prev) => ({ ...prev, [key]: checked }))}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <NovoBadge existe={l.clienteExiste} label={l.seguradoNome} />
                              {!l.clienteExiste && (
                                <Select
                                  value={tiposDoc[key] ?? l.tipoDocSugerido}
                                  onValueChange={(v) => setTiposDoc((prev) => ({ ...prev, [key]: v as "cnpj" | "cpf" }))}
                                  items={{ cnpj: "CNPJ", cpf: "CPF" }}
                                >
                                  <SelectTrigger className="h-7 w-24 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cnpj">CNPJ</SelectItem>
                                    <SelectItem value="cpf">CPF</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <NovoBadge existe={l.tipoProdutoExiste} label={l.ramoNome} />
                          </TableCell>
                          <TableCell>
                            <NovoBadge existe={l.seguradoraExiste} label={l.companhiaNome} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {l.propostaId}
                            <div className="text-xs">{l.apoliceEndosso}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{l.parcela}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {l.periodo}
                            {l.jaImportado && (
                              <div>
                                <Badge variant="outline" className="text-[10px]">
                                  já importado
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{fmtMoney(l.comissao)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {preview.lancamentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  4. Revise os lançamentos avulsos ({totalLancamentosSelecionados} de {preview.lancamentos.length} selecionados)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.lancamentos.map((l) => {
                        const key = chaveLancamento(l);
                        return (
                          <TableRow key={key} className={l.jaImportado ? "opacity-50" : undefined}>
                            <TableCell>
                              <Checkbox
                                checked={lancamentosIncluidos[key] ?? false}
                                disabled={l.jaImportado}
                                onCheckedChange={(checked) =>
                                  setLancamentosIncluidos((prev) => ({ ...prev, [key]: checked }))
                                }
                              />
                            </TableCell>
                            <TableCell>{l.documento}</TableCell>
                            <TableCell className="text-muted-foreground">{l.descricao}</TableCell>
                            <TableCell className="text-muted-foreground">{l.data ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {l.periodo}
                              {l.jaImportado && (
                                <div>
                                  <Badge variant="outline" className="text-[10px]">
                                    já importado
                                  </Badge>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{fmtMoney(l.valor)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Button
              type="button"
              onClick={handleConfirmar}
              disabled={confirmando || (totalSelecionadas === 0 && totalLancamentosSelecionados === 0)}
            >
              {confirmando
                ? "Importando..."
                : `Confirmar importação (${totalSelecionadas + totalLancamentosSelecionados})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
