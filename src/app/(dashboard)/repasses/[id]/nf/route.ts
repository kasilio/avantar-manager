import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCurrentUsuario();
  const { id } = await params;
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("repasses_lotes")
    .select("nf_arquivo_nome, nf_arquivo_base64")
    .eq("id", id)
    .single();

  if (!lote?.nf_arquivo_base64) {
    return NextResponse.json({ error: "NF não encontrada." }, { status: 404 });
  }

  const bytes = Buffer.from(lote.nf_arquivo_base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${lote.nf_arquivo_nome ?? "nf.pdf"}"`,
    },
  });
}
