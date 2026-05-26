import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceStatusLabel, scopedTrainingClassWhere } from "@/lib/attendance";
import { getCurrentUser } from "@/lib/auth";
import { canViewAttendance } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ turma?: string }>;
};

export default async function HistoricoPresencaProfessorPage({
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canViewAttendance(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const classScope = await scopedTrainingClassWhere(user);
  const classes = await getPrisma().trainingClass.findMany({
    where: classScope,
    orderBy: { name: "asc" },
  });
  const classIds = classes.map((trainingClass) => trainingClass.id);

  const attendances = await getPrisma().attendance.findMany({
    where: {
      ...(query.turma
        ? { trainingClassId: query.turma }
        : { trainingClassId: { in: classIds } }),
    },
    include: {
      athlete: true,
      trainingClass: true,
    },
    orderBy: [{ attendanceDate: "desc" }, { trainingClass: { name: "asc" } }],
    take: 150,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Histórico de presença
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Últimos registros das suas turmas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id}>
                  <td className="px-4 py-3">
                    {attendance.attendanceDate.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/turmas/${attendance.trainingClassId}/presenca`}>
                      {attendance.trainingClass.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    {attendance.athlete.fullName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{attendanceStatusLabel(attendance.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {attendance.notes ?? "-"}
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
