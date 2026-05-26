import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { scopedTrainingClassWhere, todayInputValue } from "@/lib/attendance";
import { canManageAttendance } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { weekdayLabel } from "@/lib/training";

export default async function ChamadaPage() {
  const user = await getCurrentUser();
  if (!user || !canManageAttendance(user.role)) {
    redirect("/acesso-negado");
  }

  const today = todayInputValue();
  const classes = await getPrisma().trainingClass.findMany({
    where: {
      isActive: true,
      ...(await scopedTrainingClassWhere(user)),
    },
    include: {
      modality: true,
      trainingLocation: true,
      schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      athletes: { where: { isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Chamada do dia
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Selecione a turma para registrar a presença de hoje.
        </p>
      </div>

      <div className="grid gap-4">
        {classes.map((trainingClass) => (
          <Card key={trainingClass.id}>
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-lg font-black text-zinc-950">
                  {trainingClass.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-zinc-700">
                  {trainingClass.modality.name} • {trainingClass.trainingLocation.name}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {trainingClass.schedules
                    .map(
                      (schedule) =>
                        `${weekdayLabel(schedule.weekday)} ${schedule.startTime}-${schedule.endTime}`
                    )
                    .join("; ") || "Sem horários cadastrados"}
                </p>
              </div>
              <Button asChild>
                <Link href={`/admin/turmas/${trainingClass.id}/presenca?data=${today}`}>
                  Fazer chamada
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
