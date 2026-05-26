import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PersonAvatar } from "@/components/app/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageTrainingStructure,
  canViewTrainingStructure,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { athleteClassStatusLabel, weekdayLabel } from "@/lib/training";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TurmaDetalhePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canViewTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const trainingClass = await getPrisma().trainingClass.findUnique({
    where: { id },
    include: {
      modality: true,
      trainingLocation: { include: { address: true } },
      teacher: true,
      assistants: { include: { staffMember: true } },
      schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      athletes: { include: { athlete: true }, orderBy: { joinedAt: "desc" } },
    },
  });

  if (!trainingClass) {
    notFound();
  }

  const canManage = canManageTrainingStructure(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            {trainingClass.name}
          </h1>
          <p className="mt-2 text-sm font-semibold text-zinc-700">
            {trainingClass.modality.name} • {trainingClass.trainingLocation.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/admin/turmas/${trainingClass.id}/presenca`}>
              Fazer chamada
            </Link>
          </Button>
          {canManage ? (
            <Button asChild variant="secondary">
              <Link href={`/admin/turmas/${trainingClass.id}/editar`}>Editar</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <PersonAvatar
                name={trainingClass.teacher.fullName}
                photoUrl={trainingClass.teacher.photoUrl}
              />
              <div>
                <p className="text-sm font-black text-zinc-950">
                  {trainingClass.teacher.fullName}
                </p>
                <p className="text-xs font-semibold text-zinc-500">Treinador</p>
              </div>
            </div>
            {trainingClass.assistants.map((link) => (
              <div key={link.id} className="flex items-center gap-3">
                <PersonAvatar
                  name={link.staffMember.fullName}
                  photoUrl={link.staffMember.photoUrl}
                />
                <div>
                  <p className="text-sm font-black text-zinc-950">
                    {link.staffMember.fullName}
                  </p>
                  <p className="text-xs font-semibold text-zinc-500">Assistente</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trainingClass.schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-md bg-zinc-50 p-3 text-sm">
                <p className="font-black text-zinc-950">
                  {weekdayLabel(schedule.weekday)}
                </p>
                <p className="font-semibold text-zinc-600">
                  {schedule.startTime} às {schedule.endTime}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-700">
            <p className="font-black text-zinc-950">
              {trainingClass.trainingLocation.name}
            </p>
            <p className="mt-2">
              {trainingClass.trainingLocation.address?.street ?? "-"}{" "}
              {trainingClass.trainingLocation.address?.number ?? ""}
            </p>
            <p>
              {trainingClass.trainingLocation.address?.city ?? ""}{" "}
              {trainingClass.trainingLocation.address?.state ?? ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atletas vinculados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {trainingClass.athletes.map((link) => (
                <tr key={link.id}>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    <Link href={`/admin/atletas/${link.athleteId}`}>
                      {link.athlete.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {link.joinedAt?.toLocaleDateString("pt-BR") ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{athleteClassStatusLabel(link.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
