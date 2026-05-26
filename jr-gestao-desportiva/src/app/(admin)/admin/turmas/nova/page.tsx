import { redirect } from "next/navigation";

import { TrainingClassForm } from "@/components/app/training-class-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

export default async function NovaTurmaPage() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const [modalities, locations, teachers, assistants] = await Promise.all([
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingLocation.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["teacher", "coordinator"] } },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["assistant", "teacher", "coordinator"] } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Nova turma
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre uma turma com modalidade, local, treinador, assistentes e horÃ¡rios.
        </p>
      </div>
      <TrainingClassForm
        modalities={modalities}
        locations={locations}
        teachers={teachers}
        assistants={assistants}
      />
    </div>
  );
}
