"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(dashboard)/actions";
import { useCurrentUser } from "./user-context";

export function Header() {
  const { nome, papel } = useCurrentUser();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Image src="/avantar-logo.png" alt="Avantar" width={28} height={28} className="size-7 object-contain" />
        <span className="text-sm font-semibold">Avantar Manager</span>
      </div>
      <div className="hidden text-sm text-muted-foreground md:block">
        {papel === "admin" ? "Painel administrativo" : "Minha carteira"}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right text-sm md:block">
          <div className="font-medium">{nome}</div>
          <div className="text-xs text-muted-foreground">
            {papel === "admin" ? "Administrador" : "Vendedor"}
          </div>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" title="Sair">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
