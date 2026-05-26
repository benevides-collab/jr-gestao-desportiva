import { notFound, redirect } from "next/navigation";

import { GuardianForm } from "@/components/app/guardian-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageGuardians } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type EditarResponsavelPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function EditarResponsavelPage({
  params,
  searchParams,
}: EditarResponsavelPageProps) {
  const user = await getCurrentUser();

  if (!user || !canManageGuardians(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const guardian = await getPrisma().guardian.findUnique({
    where: { id },
    include: { address: true },
  });

  if (!guardian) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar responsável
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Atualize os dados da pessoa responsável sem alterar vínculos existentes.
        </p>
      </div>
      <GuardianForm guardian={guardian} error={query.erro} />
    </div>
  );
}
