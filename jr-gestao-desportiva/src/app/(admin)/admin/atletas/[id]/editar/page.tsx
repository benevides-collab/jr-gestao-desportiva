import { notFound, redirect } from "next/navigation";

import { AthleteForm } from "@/components/app/athlete-form";
import { AthleteTabs } from "@/components/app/athlete-tabs";
import { getCurrentUser } from "@/lib/auth";
import { canManageAthletes } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type EditarAtletaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function EditarAtletaPage({
  params,
  searchParams,
}: EditarAtletaPageProps) {
  const user = await getCurrentUser();

  if (!user || !canManageAthletes(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const athlete = await getPrisma().athlete.findUnique({
    where: { id },
    include: { address: true },
  });

  if (!athlete) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar atleta
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Atualize apenas os dados básicos do cadastro.
        </p>
      </div>
      <AthleteTabs athleteId={athlete.id} activeTab="dados" />
      <AthleteForm athlete={athlete} error={query.erro} />
    </div>
  );
}
