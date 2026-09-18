import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";

export async function GET(_request: Request, { params }: { params: Promise<{ periodo: string }> }) {
  await requireCurrentUsuario();
  const { periodo } = await params;
  const supabase = await createClient();

  const { data: fechamento } = await supabase
    .from("fechamentos_mensais")
    .select("das_arquivo_nome, das_arquivo_base64")
    .eq("periodo", periodo)
    .single();

  if (!fechamento?.das_arquivo_base64) {
    return NextResponse.json({ error: "DAS não encontrado." }, { status: 404 });
  }

  const bytes = Buffer.from(fechamento.das_arquivo_base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fechamento.das_arquivo_nome ?? "das.pdf"}"`,
    },
  });
}
