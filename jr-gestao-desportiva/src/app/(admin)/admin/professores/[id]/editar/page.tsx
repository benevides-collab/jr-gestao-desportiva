import { notFound, redirect } from "next/navigation";

import { StaffForm } from "@/components/app/staff-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditarTreinadorPage({
  params,
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const [staff, modalities] = await Promise.all([
    getPrisma().staffMember.findUnique({
      where: { id },
      include: { modalities: { include: { modality: true } } },
    }),
    getPrisma().modality.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!staff) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar treinador ou assistente
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{staff.fullName}</p>
      </div>
      <StaffForm staff={staff} modalities={modalities} error={query.erro} />
    </div>
  );
}
