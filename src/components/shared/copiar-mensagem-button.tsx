"use client";

import { useState } from "react";
import { Copy, CopyCheck, X } from "lucide-react";

/** `navigator.clipboard` só existe em contexto seguro (https ou localhost) —
 * acessando o app pelo IP da rede local (http://192.168.x.x) ele é
 * `undefined`, então cai sempre pro fallback via `execCommand("copy")` numa
 * textarea invisível, que funciona em qualquer contexto. */
async function copiarTexto(texto: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // segue pro fallback
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopiarMensagemButton({ mensagem, label = "Copiar mensagem" }: { mensagem: string; label?: string }) {
  const [estado, setEstado] = useState<"idle" | "copiado" | "erro">("idle");

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await copiarTexto(mensagem);
        setEstado(ok ? "copiado" : "erro");
        setTimeout(() => setEstado("idle"), 2000);
      }}
      className="inline-flex items-center gap-1 self-start rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
    >
      {estado === "copiado" ? (
        <CopyCheck className="size-3.5" />
      ) : estado === "erro" ? (
        <X className="size-3.5 text-destructive" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {estado === "copiado" ? "Copiado!" : estado === "erro" ? "Não foi possível copiar" : label}
    </button>
  );
}
