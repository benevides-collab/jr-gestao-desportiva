import { notFound, redirect } from "next/navigation";

import { TrainingClassForm } from "@/components/app/training-class-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarTurmaPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const [trainingClass, modalities, locations, teachers, assistants] =
    await Promise.all([
      getPrisma().trainingClass.findUnique({
        where: { id },
        include: {
          schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
          teachers: true,
          assistants: true,
        },
      }),
      getPrisma().modality.findMany({ orderBy: { name: "asc" } }),
      getPrisma().trainingLocation.findMany({ orderBy: { name: "asc" } }),
      getPrisma().staffMember.findMany({
        where: { type: { in: ["teacher", "coordinator"] } },
        orderBy: { fullName: "asc" },
      }),
      getPrisma().staffMember.findMany({
        where: { type: { in: ["assistant", "teacher", "coordinator"] } },
        orderBy: { fullName: "asc" },
      }),
    ]);

  if (!trainingClass) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar turma
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{trainingClass.name}</p>
      </div>
      <TrainingClassForm
        trainingClass={trainingClass}
        modalities={modalities}
        locations={locations}
        teachers={teachers}
        assistants={assistants}
      />
    </div>
  );
}
