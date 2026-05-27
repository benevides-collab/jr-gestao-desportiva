import { redirect } from "next/navigation";
import type {
  CompetitionAthleteStatus,
  CompetitionMedal,
  CompetitionStatus,
} from "@prisma/client";

import {
  FilterActions,
  ReportPageHeader,
  SelectFilter,
  SummaryCard,
  TextFilter,
} from "@/components/app/report-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/athletes";
import { findStaffMemberForUser } from "@/lib/attendance";
import { getCurrentUser } from "@/lib/auth";
import {
  competitionAthleteStatusLabel,
  competitionAthleteStatusOptions,
  competitionStatusOptions,
  medalLabel,
  medalOptions,
} from "@/lib/competitions";
import { canViewCompetitionReports } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CompetitionReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewCompetitionReports(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const startsFrom = query.inicio ?? "";
  const startsTo = query.fim ?? "";
  const modalityId = query.modalidade ?? "";
  const competitionId = query.competicao ?? "";
  const teacherId = query.professor ?? "";
  const athleteId = query.atleta ?? "";
  const competitionStatus = query.statusCompeticao ?? "";
  const callStatus = query.statusConvocacao ?? "";
  const medal = query.medalha ?? "";
  const staff = user.role === "PROFESSOR" || user.role === "ASSISTENTE"
    ? await findStaffMemberForUser(user)
    : null;

  const competitionScope =
    user.role === "PROFESSOR" || user.role === "ASSISTENTE"
      ? {
          OR: [
            { responsibleTeacherId: staff?.id ?? "__none__" },
            { assistants: { some: { staffMemberId: staff?.id ?? "__none__" } } },
          ],
        }
      : {};

  const where = {
    ...(athleteId ? { athleteId } : {}),
    ...(callStatus ? { status: callStatus as CompetitionAthleteStatus } : {}),
    ...(medal ? { medal: medal as CompetitionMedal } : {}),
    competition: {
      ...competitionScope,
      ...(competitionId ? { id: competitionId } : {}),
      ...(modalityId ? { modalityId } : {}),
      ...(teacherId ? { responsibleTeacherId: teacherId } : {}),
      ...(competitionStatus ? { status: competitionStatus as CompetitionStatus } : {}),
      ...(startsFrom || startsTo
        ? {
            startsAt: {
              ...(startsFrom ? { gte: new Date(`${startsFrom}T00:00:00.000Z`) } : {}),
              ...(startsTo ? { lte: new Date(`${startsTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
  };

  const [records, competitions, modalities, teachers, athletes] = await Promise.all([
    getPrisma().competitionAthlete.findMany({
      where,
      include: {
        athlete: true,
        competition: { include: { modality: true, responsibleTeacher: true } },
      },
      orderBy: [{ competition: { startsAt: "desc" } }, { createdAt: "desc" }],
    }),
    getPrisma().competition.findMany({
      where: competitionScope,
      orderBy: { startsAt: "desc" },
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["teacher", "coordinator"] } },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().athlete.findMany({
      select: { id: true, fullName: true, preferredName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const exportHref = `/admin/relatorios/competicoes/exportar?${new URLSearchParams(
    Object.entries(query).filter(([, value]) => value) as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Relatório de competições"
        description="Convocações, participação, resultados e medalhas."
        exportHref={exportHref}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Competições"
          value={String(new Set(records.map((item) => item.competitionId)).size)}
        />
        <SummaryCard label="Convocados" value={String(records.length)} />
        <SummaryCard
          label="Participantes"
          value={String(records.filter((item) => item.participated).length)}
        />
        <SummaryCard
          label="Ausências"
          value={String(records.filter((item) => item.status === "absent").length)}
        />
        <SummaryCard
          label="Ouro"
          value={String(records.filter((item) => item.medal === "gold").length)}
        />
        <SummaryCard
          label="Participações"
          value={String(records.filter((item) => item.medal === "participation").length)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <TextFilter label="Data inicial" name="inicio" value={startsFrom} type="date" />
            <TextFilter label="Data final" name="fim" value={startsTo} type="date" />
            <SelectFilter
              label="Modalidade"
              name="modalidade"
              value={modalityId}
              options={[
                { value: "", label: "Todas" },
                ...modalities.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <SelectFilter
              label="Competição"
              name="competicao"
              value={competitionId}
              options={[
                { value: "", label: "Todas" },
                ...competitions.map((item) => ({ value: item.id, label: item.name })),
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
              label="Status da competição"
              name="statusCompeticao"
              value={competitionStatus}
              options={[
                { value: "", label: "Todos" },
                ...competitionStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
            <SelectFilter
              label="Status da convocação"
              name="statusConvocacao"
              value={callStatus}
              options={[
                { value: "", label: "Todos" },
                ...competitionAthleteStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
            <SelectFilter
              label="Medalha"
              name="medalha"
              value={medal}
              options={[
                { value: "", label: "Todas" },
                ...medalOptions.map((option) => ({ value: option.value, label: option.label })),
              ]}
            />
            <FilterActions clearHref="/admin/relatorios/competicoes" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Competição</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Convocação</th>
                <th className="px-4 py-3">Participou</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">Colocação</th>
                <th className="px-4 py-3">Medalha</th>
                <th className="px-4 py-3">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    {record.competition.name}
                  </td>
                  <td className="px-4 py-3">{formatDate(record.competition.startsAt)}</td>
                  <td className="px-4 py-3">{record.competition.modality?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    {record.competition.responsibleTeacher?.fullName ?? "-"}
                  </td>
                  <td className="px-4 py-3">{record.athlete.fullName}</td>
                  <td className="px-4 py-3">{competitionAthleteStatusLabel(record.status)}</td>
                  <td className="px-4 py-3">{record.participated ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">{record.result ?? "-"}</td>
                  <td className="px-4 py-3">{record.placement ?? "-"}</td>
                  <td className="px-4 py-3">{medalLabel(record.medal)}</td>
                  <td className="px-4 py-3">{record.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
