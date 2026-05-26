import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { BrandLogo } from "@/components/app/brand-logo";
import { Button } from "@/components/ui/button";

export default function AcessoNegadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-10">
      <section className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <BrandLogo className="mx-auto w-28" priority />
        <div className="mx-auto mt-6 flex size-12 items-center justify-center rounded-md bg-jr-red/10 text-jr-red">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-zinc-950">
          Acesso negado
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Seu perfil não possui permissão para acessar esta área do sistema
          interno da Associação Paradesportiva JR-SP.
        </p>
        <Button asChild className="mt-6">
          <Link href="/admin/dashboard">Voltar ao dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
