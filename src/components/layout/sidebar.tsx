"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { useCurrentUser } from "./user-context";

export function Sidebar() {
  const pathname = usePathname();
  const { nome, papel, email } = useCurrentUser();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || papel === "admin");

  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border bg-sidebar/60 px-4">
        <Image
          src="/avantar-mark.png"
          alt=""
          width={28}
          height={24}
          className="h-6 w-auto shrink-0 object-contain"
          priority
        />
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight text-white">Avantar</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/55">Manager</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const className = cn(
            "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "border-l-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          );

          if (item.external) {
            return (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                <Icon className="size-4 shrink-0" />
                {item.label}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
          <div className="truncate text-xs font-semibold text-white">{nome}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/60">
            {papel === "admin" ? "Administrador" : "Vendedor"}
          </div>
          <div className="mt-1 truncate text-[10px] text-white/40">{email}</div>
        </div>
      </div>
    </aside>
  );
}
