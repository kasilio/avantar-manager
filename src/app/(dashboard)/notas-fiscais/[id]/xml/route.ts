import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: emissao } = await supabase
    .from("nfse_emissoes")
    .select("dps_xml_assinado, numero_dps")
    .eq("id", id)
    .single();

  if (!emissao?.dps_xml_assinado) {
    return NextResponse.json({ error: "XML assinado não encontrado." }, { status: 404 });
  }

  return new NextResponse(emissao.dps_xml_assinado, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="dps-${emissao.numero_dps}.xml"`,
    },
  });
}
