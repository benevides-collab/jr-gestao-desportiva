import { redirect } from "next/navigation";

import { AthleteForm } from "@/components/app/athlete-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageAthletes } from "@/lib/permissions";

type NovoAtletaPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function NovoAtletaPage({ searchParams }: NovoAtletaPageProps) {
  const user = await getCurrentUser();

  if (!user || !canManageAthletes(user.role)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Novo atleta
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Preencha os dados básicos do atleta. Responsáveis, escola, médico e
          documentos ficam para cards futuros.
        </p>
      </div>
      <AthleteForm error={params.erro} />
    </div>
  );
}
