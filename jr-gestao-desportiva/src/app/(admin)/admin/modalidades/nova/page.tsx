import { redirect } from "next/navigation";

import { ModalityForm } from "@/components/app/modality-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";

export default async function NovaModalidadePage() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Nova modalidade
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre uma modalidade esportiva da JR.
        </p>
      </div>
      <ModalityForm />
    </div>
  );
}
