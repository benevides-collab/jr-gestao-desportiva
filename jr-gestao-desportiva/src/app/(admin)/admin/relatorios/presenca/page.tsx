import { redirect } from "next/navigation";
import type { AttendanceStatus } from "@prisma/client";

import {
  FilterActions,
  ReportPageHeader,
  SelectFilter,
  SummaryCard,
  TextFilter,
} from "@/components/app/report-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  attendanceStatusLabel,
  attendanceStatusOptions,
  scopedTrainingClassWhere,
} from "@/lib/attendance";
import { formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import { canViewAttendanceReports } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { formatPercent } from "@/lib/reports";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AttendanceReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewAttendanceReports(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const dateFrom = query.inicio ?? "";
  const dateTo = query.fim ?? "";
  const modalityId = query.modalidade ?? "";
  const trainingClassId = query.turma ?? "";
  const teacherId = query.professor ?? "";
  const athleteId = query.atleta ?? "";
  const status = query.status ?? "";
  const classScope = await scopedTrainingClassWhere(user);

  const where = {
    ...(dateFrom || dateTo
      ? {
          attendanceDate: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(athleteId ? { athleteId } : {}),
    ...(status ? { status: status as AttendanceStatus } : {}),
    trainingClass: {
      ...classScope,
      ...(trainingClassId ? { id: trainingClassId } : {}),
      ...(modalityId ? { modalityId } : {}),
      ...(teacherId
        ? {
            OR: [
              { teacherId },
              { teachers: { some: { staffMemberId: teacherId } } },
            ],
          }
        : {}),
    },
  };

  const [records, athletes, modalities, classes, teachers] = await Promise.all([
    getPrisma().attendance.findMany({
      where,
      include: {
        athlete: true,
        recordedByUser: true,
        trainingClass: { include: { modality: true, teacher: true } },
      },
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
    }),
    getPrisma().athlete.findMany({
      select: { id: true, fullName: true, preferredName: true },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true, ...classScope },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["teacher", "coordinator"] } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const present = records.filter((record) =>
    ["present", "partial"].includes(record.status),
  ).length;
  const attendancePercent = records.length > 0 ? (present / records.length) * 100 : 0;
  const exportHref = `/admin/relatorios/presenca/exportar?${new URLSearchParams(
    Object.entries(query).filter(([, value]) => value) as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Relatório de presença"
        description="Frequência por turma, atleta, período e status."
        exportHref={exportHref}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Total" value={String(records.length)} />
        <SummaryCard label="Presenças" value={String(present)} />
        <SummaryCard
          label="Faltas"
          value={String(records.filter((record) => record.status === "absent").length)}
        />
        <SummaryCard
          label="Justificadas"
          value={String(
            records.filter((record) => record.status === "justified_absence").length,
          )}
        />
        <SummaryCard
          label="Atrasos"
          value={String(records.filter((record) => record.status === "late").length)}
        />
        <SummaryCard label="% Presença" value={formatPercent(attendancePercent)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <TextFilter label="Data inicial" name="inicio" value={dateFrom} type="date" />
            <TextFilter label="Data final" name="fim" value={dateTo} type="date" />
            <SelectFilter
              label="Atleta"
              name="atleta"
              value={athleteId}
              options={[
                { value: "", label: "Todos" },
                ...athletes.map((athlete) => ({
                  value: athlete.id,
                  label: athlete.preferredName
                    ? `${athlete.fullName} (${athlete.preferredName})`
                    : athlete.fullName,
                })),
              ]}
            />
            <SelectFilter
              label="Status"
              name="status"
              value={status}
              options={[
                { value: "", label: "Todos" },
                ...attendanceStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
            <SelectFilter
              label="Modalidade"
              name="modalidade"
              value={modalityId}
              options={[
                { value: "", label: "Todas" },
                ...modalities.map((modality) => ({ value: modality.id, label: modality.name })),
              ]}
            />
            <SelectFilter
              label="Turma"
              name="turma"
              value={trainingClassId}
              options={[
                { value: "", label: "Todas" },
                ...classes.map((item) => ({
                  value: item.id,
                  label: `${item.name} - ${item.modality.name}`,
                })),
              ]}
            />
            <SelectFilter
              label="Professor"
              name="professor"
              value={teacherId}
              options={[
                { value: "", label: "Todos" },
                ...teachers.map((teacher) => ({ value: teacher.id, label: teacher.fullName })),
              ]}
            />
            <FilterActions clearHref="/admin/relatorios/presenca" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">{formatDate(record.attendanceDate)}</td>
                  <td className="px-4 py-3 font-bold text-zinc-950">{record.athlete.fullName}</td>
                  <td className="px-4 py-3">{record.trainingClass.name}</td>
                  <td className="px-4 py-3">{record.trainingClass.modality.name}</td>
                  <td className="px-4 py-3">{record.trainingClass.teacher.fullName}</td>
                  <td className="px-4 py-3">{attendanceStatusLabel(record.status)}</td>
                  <td className="px-4 py-3">{record.notes ?? "-"}</td>
                  <td className="px-4 py-3">{record.recordedByUser?.name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
