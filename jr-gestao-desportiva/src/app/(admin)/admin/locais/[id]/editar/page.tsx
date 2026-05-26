import { notFound, redirect } from "next/navigation";

import { TrainingLocationForm } from "@/components/app/training-location-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarLocalPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const location = await getPrisma().trainingLocation.findUnique({
    where: { id },
    include: { address: true },
  });
  if (!location) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar local
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{location.name}</p>
      </div>
      <TrainingLocationForm location={location} />
    </div>
  );
}
