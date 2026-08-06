import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  attendanceStatusLabel,
  attendanceStatusOptions,
  parseAttendanceDate,
  scopedTrainingClassWhere,
  toDateInputValue,
} from "@/lib/attendance";
import { getCurrentUser } from "@/lib/auth";
import { canViewAttendance } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    data?: string;
    turma?: string;
    status?: string;
    atleta?: string;
  }>;
};

export default async function AdminPresencaPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canViewAttendance(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const attendanceDate = query.data ? parseAttendanceDate(query.data) : null;
  const classScope = await scopedTrainingClassWhere(user);
  const classes = await getPrisma().trainingClass.findMany({
    where: classScope,
    include: { modality: true, teacher: true },
    orderBy: { name: "asc" },
  });
  const classIds = classes.map((item) => item.id);

  const attendances = await getPrisma().attendance.findMany({
    where: {
      trainingClassId: query.turma || classIds.length === 0 ? query.turma : { in: classIds },
      ...(attendanceDate ? { attendanceDate } : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.atleta
        ? { athlete: { fullName: { contains: query.atleta, mode: "insensitive" } } }
        : {}),
    },
    include: {
      athlete: true,
      trainingClass: { include: { modality: true, teacher: true } },
      recordedByUser: true,
      updatedByUser: true,
    },
    orderBy: [{ attendanceDate: "desc" }, { trainingClass: { name: "asc" } }],
    take: 200,
  });

  const summary = attendanceStatusOptions.map((option) => ({
    ...option,
    total: attendances.filter((attendance) => attendance.status === option.value).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Presença
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Acompanhamento de chamadas por turma, atleta e status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                name="data"
                type="date"
                defaultValue={attendanceDate ? toDateInputValue(attendanceDate) : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <select
                id="turma"
                name="turma"
                defaultValue={query.turma ?? ""}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="">Todas</option>
                {classes.map((trainingClass) => (
                  <option key={trainingClass.id} value={trainingClass.id}>
                    {trainingClass.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={query.status ?? ""}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="">Todos</option>
                {attendanceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="atleta">Atleta</Label>
              <Input id="atleta" name="atleta" defaultValue={query.atleta ?? ""} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map((item) => (
          <Card key={item.value}>
            <CardContent className="p-4">
              <p className="text-xs font-black uppercase text-zinc-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{item.total}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {attendances.map((attendance) => (
              <div
                key={attendance.id}
                className="rounded-md border border-zinc-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/atletas/${attendance.athleteId}?aba=presenca`}
                    className="break-words text-sm font-black text-zinc-950"
                  >
                    {attendance.athlete.fullName}
                  </Link>
                  <Badge>{attendanceStatusLabel(attendance.status)}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-600">
                  <div>
                    <dt className="font-bold uppercase text-zinc-500">Data</dt>
                    <dd>{attendance.attendanceDate.toLocaleDateString("pt-BR")}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-zinc-500">Turma</dt>
                    <dd>{attendance.trainingClass.name}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-bold uppercase text-zinc-500">Observação</dt>
                    <dd>{attendance.notes ?? "-"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-bold uppercase text-zinc-500">Registrado por</dt>
                    <dd>{attendance.recordedByUser?.name ?? "-"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id}>
                  <td className="px-4 py-3">
                    {attendance.attendanceDate.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    <Link href={`/admin/atletas/${attendance.athleteId}?aba=presenca`}>
                      {attendance.athlete.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{attendance.trainingClass.name}</td>
                  <td className="px-4 py-3">
                    <Badge>{attendanceStatusLabel(attendance.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {attendance.notes ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {attendance.recordedByUser?.name ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
