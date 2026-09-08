import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border/60 shadow-lg">
        <CardHeader className="flex flex-col items-center gap-3 pb-2">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary p-2">
            <Image
              src="/avantar-logo.png"
              alt="Avantar"
              width={48}
              height={48}
              className="size-full object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold">Avantar Manager</h1>
            <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha</p>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
