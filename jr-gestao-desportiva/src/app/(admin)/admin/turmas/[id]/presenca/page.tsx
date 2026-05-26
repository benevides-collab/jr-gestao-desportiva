import { notFound, redirect } from "next/navigation";

import { saveAttendanceCall } from "@/app/(admin)/admin/presenca/actions";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAge } from "@/lib/athletes";
import {
  attendanceStatusLabel,
  attendanceStatusOptions,
  canAccessTrainingClass,
  isToday,
  parseAttendanceDate,
  toDateInputValue,
} from "@/lib/attendance";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageAttendance,
  canManageRetroactiveAttendance,
  canViewAttendance,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { athleteClassStatusLabel, weekdayLabel } from "@/lib/training";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ data?: string }>;
};

export default async function TurmaPresencaPage({
  params,
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canViewAttendance(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const attendanceDate = parseAttendanceDate(query.data);
  const dateInput = toDateInputValue(attendanceDate);

  if (!(await canAccessTrainingClass(user, id)) && user.role !== "CONSULTA") {
    redirect("/acesso-negado");
  }

  const canEdit =
    canManageAttendance(user.role) &&
    (isToday(attendanceDate) || canManageRetroactiveAttendance(user.role));

  const trainingClass = await getPrisma().trainingClass.findUnique({
    where: { id },
    include: {
      modality: true,
      trainingLocation: true,
      teacher: true,
      assistants: { include: { staffMember: true } },
      schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      athletes: {
        where: { isActive: true },
        include: {
          athlete: {
            include: {
              medicalInfo: true,
              guardians: {
                where: { isEmergencyContact: true },
                include: { guardian: true },
              },
            },
          },
        },
        orderBy: { athlete: { fullName: "asc" } },
      },
      attendance: {
        where: { attendanceDate },
      },
    },
  });

  if (!trainingClass) {
    notFound();
  }

  const attendanceByAthlete = new Map(
    trainingClass.attendance.map((attendance) => [attendance.athleteId, attendance])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Chamada da turma
        </h1>
        <p className="mt-2 text-sm font-semibold text-zinc-700">
          {trainingClass.name} • {trainingClass.modality.name} •{" "}
          {trainingClass.trainingLocation.name}
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

      <Card>
        <CardHeader>
          <CardTitle>Data da chamada</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={dateInput} />
            </div>
            <Button type="submit" variant="secondary">
              Filtrar data
            </Button>
          </form>
        </CardContent>
      </Card>

      <form action={saveAttendanceCall} className="space-y-4">
        <input type="hidden" name="trainingClassId" value={trainingClass.id} />
        <input type="hidden" name="attendanceDate" value={dateInput} />

        {trainingClass.athletes.map((link) => {
          const athlete = link.athlete;
          const attendance = attendanceByAthlete.get(athlete.id);
          const emergency = athlete.guardians[0]?.guardian;

          return (
            <Card key={link.id}>
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[80px_1fr_220px_1fr]">
                <AthleteAvatar
                  name={athlete.fullName}
                  photoUrl={athlete.photoUrl}
                  className="w-20"
                />
                <div>
                  <h2 className="text-base font-black text-zinc-950">
                    {athlete.fullName}
                  </h2>
                  {athlete.preferredName ? (
                    <p className="text-sm font-semibold text-zinc-600">
                      {athlete.preferredName}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-zinc-600">
                    {calculateAge(athlete.birthDate)} anos •{" "}
                    {athleteClassStatusLabel(link.status)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Restrição: {athlete.medicalInfo?.physicalRestrictions ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Emergência: {emergency?.fullName ?? "-"} {emergency?.phone ?? ""}
                  </p>
                </div>
                <div className="space-y-2">
                  <input type="hidden" name="athleteId" value={athlete.id} />
                  <Label htmlFor={`status-${athlete.id}`}>Status</Label>
                  {canEdit ? (
                    <select
                      id={`status-${athlete.id}`}
                      name={`status-${athlete.id}`}
                      defaultValue={attendance?.status ?? "present"}
                      className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
                    >
                      {attendanceStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge>{attendanceStatusLabel(attendance?.status)}</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`notes-${athlete.id}`}>Observação</Label>
                  {canEdit ? (
                    <textarea
                      id={`notes-${athlete.id}`}
                      name={`notes-${athlete.id}`}
                      defaultValue={attendance?.notes ?? ""}
                      rows={3}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
                    />
                  ) : (
                    <p className="text-sm text-zinc-600">{attendance?.notes ?? "-"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit">Salvar chamada</Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 text-sm font-semibold text-zinc-600">
              Edição indisponível para esta data ou perfil.
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
