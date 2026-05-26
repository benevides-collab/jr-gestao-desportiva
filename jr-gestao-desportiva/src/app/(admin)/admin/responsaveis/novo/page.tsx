import { redirect } from "next/navigation";

import { GuardianForm } from "@/components/app/guardian-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageGuardians } from "@/lib/permissions";

type NovoResponsavelPageProps = {
  searchParams: Promise<{
    athleteId?: string;
    erro?: string;
  }>;
};

export default async function NovoResponsavelPage({
  searchParams,
}: NovoResponsavelPageProps) {
  const user = await getCurrentUser();

  if (!user || !canManageGuardians(user.role)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Novo responsável
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Cadastre o responsável e, quando vindo do atleta, já registre o vínculo.
        </p>
      </div>
      <GuardianForm athleteId={params.athleteId} error={params.erro} />
    </div>
  );
}
