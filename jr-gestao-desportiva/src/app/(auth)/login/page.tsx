import { AlertCircle, LockKeyhole } from "lucide-react";

import { signIn } from "@/app/actions/auth";
import { BrandLogo } from "@/components/app/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.erro === "credenciais";

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="hidden bg-jr-black text-white lg:flex lg:flex-col lg:justify-between">
          <div className="p-10">
            <BrandLogo className="w-44" priority />
          </div>
          <div className="max-w-2xl p-10">
            <p className="mb-4 inline-flex rounded-md bg-jr-red px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Sistema interno
            </p>
            <h1 className="text-4xl font-black leading-tight">
              Gestão desportiva com controle, privacidade e responsabilidade.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
              Acesso restrito para organização de atletas, equipe técnica,
              documentos e rotinas administrativas da JR.
            </p>
          </div>
          <div className="h-2 bg-jr-red" />
        </section>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <BrandLogo className="w-36" priority />
              <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-jr-red">
                Associação Paradesportiva JR-SP
              </p>
              <h2 className="mt-2 text-2xl font-black text-zinc-950">
                Acesso ao painel interno
              </h2>
            </div>

            {hasError ? (
              <div className="mb-5 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                E-mail ou senha inválidos.
              </div>
            ) : null}

            <form action={signIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@jr.local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <LockKeyhole className="size-4" aria-hidden="true" />
                Acessar sistema
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
