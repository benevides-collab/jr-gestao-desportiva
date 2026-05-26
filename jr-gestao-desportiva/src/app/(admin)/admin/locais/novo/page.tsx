import { redirect } from "next/navigation";

import { TrainingLocationForm } from "@/components/app/training-location-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";

export default async function NovoLocalPage() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Novo local
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre um local de treino da JR.
        </p>
      </div>
      <TrainingLocationForm />
    </div>
  );
}
