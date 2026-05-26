import { notFound, redirect } from "next/navigation";

import { ModalityForm } from "@/components/app/modality-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarModalidadePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const modality = await getPrisma().modality.findUnique({ where: { id } });
  if (!modality) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar modalidade
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{modality.name}</p>
      </div>
      <ModalityForm modality={modality} />
    </div>
  );
}
