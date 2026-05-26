import { redirect } from "next/navigation";

import { CompetitionForm } from "@/components/app/competition-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageCompetitions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

export default async function NewCompetitionPage() {
  const user = await getCurrentUser();
  if (!user || !canManageCompetitions(user.role)) {
    redirect("/acesso-negado");
  }

  const [modalities, staffMembers] = await Promise.all([
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["teacher", "assistant"] } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Nova competição
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre evento, modalidade, equipe técnica e dados de logística.
        </p>
      </div>
      <CompetitionForm modalities={modalities} staffMembers={staffMembers} />
    </div>
  );
}
