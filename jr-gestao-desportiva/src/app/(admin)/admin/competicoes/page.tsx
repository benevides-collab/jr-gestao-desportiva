import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  competitionStatusClass,
  competitionStatusLabel,
} from "@/lib/competitions";
import { canManageCompetitions, canViewCompetitions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

export default async function CompetitionsPage() {
  const user = await getCurrentUser();
  if (!user || !canViewCompetitions(user.role)) {
    redirect("/acesso-negado");
  }

  const scopedWhere =
    user.role === "PROFESSOR" || user.role === "ASSISTENTE"
      ? {
          OR: [
            { responsibleTeacher: { email: user.email } },
            { assistants: { some: { staffMember: { email: user.email } } } },
          ],
        }
      : {};
  const competitions = await getPrisma().competition.findMany({
    where: scopedWhere,
    include: {
      modality: true,
      responsibleTeacher: true,
      athletes: true,
    },
    orderBy: { startsAt: "desc" },
  });
  const canManage = canManageCompetitions(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Competições
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Eventos esportivos, convocações e participação dos atletas.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/competicoes/nova">Nova competição</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Competição</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Treinador</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atletas</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {competitions.map((competition) => (
                <tr key={competition.id}>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    {competition.name}
                    <p className="mt-1 font-normal text-zinc-600">
                      {competition.location ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{competition.modality?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    {formatDate(competition.startsAt)}
                    {competition.endsAt ? ` até ${formatDate(competition.endsAt)}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {competition.responsibleTeacher?.fullName ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={competitionStatusClass(competition.status)}>
                      {competitionStatusLabel(competition.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{competition.athletes.length}</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="secondary">
                      <Link href={`/admin/competicoes/${competition.id}`}>
                        Abrir
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {competitions.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-zinc-600">
              Nenhuma competição cadastrada.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
