import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Próximo número de DPS pra uma série. A migration 0019 semeia a NFS-e nº16
 * (numero_dps 17) já emitida manualmente antes deste sistema existir, então
 * a primeira chamada real aqui já retorna 18 — não há caso especial pra
 * tabela vazia.
 */
export async function proximoNumeroDps(
  supabase: SupabaseClient<Database>,
  serieDps: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("nfse_emissoes")
    .select("numero_dps")
    .eq("serie_dps", serieDps)
    .order("numero_dps", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.numero_dps ?? 0) + 1;
}
