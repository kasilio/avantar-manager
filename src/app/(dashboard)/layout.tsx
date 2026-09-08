import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserProvider } from "@/components/layout/user-context";
import { logout } from "./actions";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sua conta ainda não está associada a um cadastro de usuário. Peça para o
          administrador concluir seu cadastro.
        </p>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </div>
    );
  }

  return (
    <UserProvider
      value={{ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel }}
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 bg-background p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        </div>
        <BottomNav />
      </div>
    </UserProvider>
  );
}
