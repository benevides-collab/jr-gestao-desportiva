import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageTrainingStructure,
  canViewTrainingStructure,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { weekdayLabel } from "@/lib/training";

export default async function TurmasPage() {
  const user = await getCurrentUser();
  if (!user || !canViewTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const classes = await getPrisma().trainingClass.findMany({
    include: {
      modality: true,
      trainingLocation: true,
      teacher: true,
      assistants: { include: { staffMember: true } },
      schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      athletes: true,
    },
    orderBy: { name: "asc" },
  });
  const canManage = canManageTrainingStructure(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Turmas
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Organização de modalidades, locais, equipe técnica e horários.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/turmas/nova">Nova turma</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {classes.map((trainingClass) => (
          <Card key={trainingClass.id}>
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-zinc-950">
                    {trainingClass.name}
                  </h2>
                  <Badge>{trainingClass.isActive ? "Ativa" : "Inativa"}</Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-700">
                  {trainingClass.modality.name} • {trainingClass.trainingLocation.name}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Treinador: {trainingClass.teacher.fullName}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Assistentes:{" "}
                  {trainingClass.assistants
                    .map((link) => link.staffMember.fullName)
                    .join(", ") || "-"}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Horários:{" "}
                  {trainingClass.schedules
                    .map(
                      (schedule) =>
                        `${weekdayLabel(schedule.weekday)} ${schedule.startTime}-${schedule.endTime}`
                    )
                    .join("; ") || "-"}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <Button asChild variant="secondary">
                  <Link href={`/admin/turmas/${trainingClass.id}`}>Ver</Link>
                </Button>
                {canManage ? (
                  <Button asChild variant="secondary">
                    <Link href={`/admin/turmas/${trainingClass.id}/editar`}>
                      Editar
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
