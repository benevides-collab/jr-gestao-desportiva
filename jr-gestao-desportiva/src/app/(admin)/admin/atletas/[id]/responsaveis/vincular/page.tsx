import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { linkGuardianToAthlete } from "@/app/(admin)/admin/responsaveis/actions";
import { GuardianLinkFields } from "@/components/app/guardian-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { relationshipOptions } from "@/lib/guardians";
import { canManageGuardians } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type VincularResponsavelPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VincularResponsavelPage({
  params,
}: VincularResponsavelPageProps) {
  const user = await getCurrentUser();

  if (!user || !canManageGuardians(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const athlete = await getPrisma().athlete.findUnique({
    where: { id },
    include: { guardians: true },
  });

  if (!athlete) {
    notFound();
  }

  const linkedGuardianIds = athlete.guardians.map((link) => link.guardianId);
  const guardians = await getPrisma().guardian.findMany({
    where: {
      id: { notIn: linkedGuardianIds },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Vincular responsável
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Selecione um responsável já cadastrado para vincular a {athlete.fullName}.
        </p>
      </div>

      <form action={linkGuardianToAthlete} className="space-y-6">
        <input type="hidden" name="athleteId" value={athlete.id} />
        <Card>
          <CardHeader>
            <CardTitle>Responsável existente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="guardianId">Responsável</Label>
            <select
              id="guardianId"
              name="guardianId"
              required
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Selecione</option>
              {guardians.map((guardian) => (
                <option key={guardian.id} value={guardian.id}>
                  {guardian.fullName} - {guardian.phone ?? "sem telefone"}
                </option>
              ))}
            </select>
            {guardians.length === 0 ? (
              <p className="text-sm font-semibold text-zinc-500">
                Todos os responsáveis cadastrados já estão vinculados a este atleta.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grau de parentesco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="relationship">Grau de parentesco</Label>
            <select
              id="relationship"
              name="relationship"
              required
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Selecione</option>
              {relationshipOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <GuardianLinkFields />

        <div className="flex justify-end gap-3">
          <Button asChild variant="secondary">
            <Link href={`/admin/atletas/${athlete.id}?aba=responsaveis`}>
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={guardians.length === 0}>
            Vincular responsável
          </Button>
        </div>
      </form>
    </div>
  );
}
