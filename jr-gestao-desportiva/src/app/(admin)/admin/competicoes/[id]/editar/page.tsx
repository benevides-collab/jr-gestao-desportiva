import { notFound, redirect } from "next/navigation";

import { CompetitionForm } from "@/components/app/competition-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageCompetitions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type EditCompetitionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCompetitionPage({
  params,
}: EditCompetitionPageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageCompetitions(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const [competition, modalities, staffMembers] = await Promise.all([
    getPrisma().competition.findUnique({
      where: { id },
      include: { assistants: true },
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["teacher", "assistant"] } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  if (!competition) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar competição
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Atualize dados do evento, equipe técnica e logística.
        </p>
      </div>
      <CompetitionForm
        competition={competition}
        modalities={modalities}
        staffMembers={staffMembers}
      />
    </div>
  );
}
