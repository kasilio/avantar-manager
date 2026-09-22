import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  MessagesSquare,
  ShieldCheck,
  FileStack,
  CheckSquare,
  Wallet,
  Landmark,
  Tags,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Aparece nas 4 abas fixas da bottom nav mobile (o resto vai pro drawer "Mais"). */
  mobilePrimary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard, mobilePrimary: true },
  { href: "/clientes", label: "Clientes", icon: Building2, mobilePrimary: true },
  { href: "/crm", label: "CRM", icon: MessagesSquare, mobilePrimary: true },
  { href: "/producoes", label: "Produções", icon: ShieldCheck, adminOnly: true },
  { href: "/repasses", label: "Repasses", icon: FileStack },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true, mobilePrimary: true },
  { href: "/seguradoras", label: "Seguradoras", icon: Landmark, adminOnly: true },
  { href: "/tipos-produto", label: "Tipos de Produto", icon: Tags, adminOnly: true },
  { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];
