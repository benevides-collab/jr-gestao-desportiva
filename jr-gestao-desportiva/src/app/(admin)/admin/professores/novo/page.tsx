import { redirect } from "next/navigation";

import { StaffForm } from "@/components/app/staff-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function NovoTreinadorPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const modalities = await getPrisma().modality.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Novo treinador ou assistente
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre treinadores e assistentes da equipe técnica.
        </p>
      </div>
      <StaffForm modalities={modalities} error={query.erro} />
    </div>
  );
}
