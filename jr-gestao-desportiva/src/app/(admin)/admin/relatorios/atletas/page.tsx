import Link from "next/link";
import { redirect } from "next/navigation";
import type { AthleteStatus, Gender } from "@prisma/client";

import {
  FilterActions,
  ReportPageHeader,
  SelectFilter,
  SummaryCard,
  TextFilter,
} from "@/components/app/report-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  athleteStatusLabels,
  calculateAge,
  formatDate,
  genderLabels,
  isMinor,
} from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import { canViewAthleteReports } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AthleteReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewAthleteReports(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const status = query.status ?? "";
  const gender = query.sexo ?? "";
  const minor = query.menor ?? "";
  const modalityId = query.modalidade ?? "";
  const trainingClassId = query.turma ?? "";
  const teacherId = query.professor ?? "";
  const legalGuardian = query.responsavelLegal ?? "";
  const school = query.escola ?? "";
  const medical = query.medico ?? "";
  const joinedFrom = query.entradaInicial ?? "";
  const joinedTo = query.entradaFinal ?? "";
  const search = query.busca ?? "";

  const athleteWhere = {
    ...(status ? { status: status as AthleteStatus } : {}),
    ...(gender ? { gender: gender as Gender } : {}),
    ...(search
      ? { fullName: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(joinedFrom || joinedTo
      ? {
          joinedAt: {
            ...(joinedFrom ? { gte: new Date(`${joinedFrom}T00:00:00.000Z`) } : {}),
            ...(joinedTo ? { lte: new Date(`${joinedTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(modalityId || trainingClassId || teacherId
      ? {
          classes: {
            some: {
              ...(trainingClassId ? { trainingClassId } : {}),
              trainingClass: {
                ...(modalityId ? { modalityId } : {}),
                ...(teacherId ? { teacherId } : {}),
              },
            },
          },
        }
      : {}),
  };

  const [athletesRaw, modalities, classes, teachers] = await Promise.all([
    getPrisma().athlete.findMany({
      where: athleteWhere,
      include: {
        guardians: { include: { guardian: true } },
        schools: {
          include: { school: true },
          orderBy: { createdAt: "desc" },
        },
        medicalInfo: true,
        classes: {
          include: {
            trainingClass: {
              include: { modality: true, teacher: true },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().staffMember.findMany({
      where: { isActive: true, type: { in: ["teacher", "coordinator"] } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const athletes = athletesRaw.filter((athlete) => {
    const hasLegalGuardian = athlete.guardians.some((link) => link.isLegalGuardian);
    const hasSchool = athlete.schools.some((link) => link.isCurrent);
    const hasMedical = Boolean(athlete.medicalInfo);

    return (
      (minor === "sim" ? isMinor(athlete.birthDate) : true) &&
      (minor === "nao" ? !isMinor(athlete.birthDate) : true) &&
      (legalGuardian === "com" ? hasLegalGuardian : true) &&
      (legalGuardian === "sem" ? !hasLegalGuardian : true) &&
      (school === "com" ? hasSchool : true) &&
      (school === "sem" ? !hasSchool : true) &&
      (medical === "com" ? hasMedical : true) &&
      (medical === "sem" ? !hasMedical : true)
    );
  });

  const minorsWithoutGuardian = athletes.filter(
    (athlete) =>
      isMinor(athlete.birthDate) &&
      !athlete.guardians.some((link) => link.isLegalGuardian),
  ).length;
  const withoutSchool = athletes.filter(
    (athlete) => !athlete.schools.some((link) => link.isCurrent),
  ).length;
  const withoutMedical = athletes.filter((athlete) => !athlete.medicalInfo).length;

  const exportHref = `/admin/relatorios/atletas/exportar?${new URLSearchParams(
    Object.entries(query).filter(([, value]) => value) as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Relatório de atletas"
        description="Consulta operacional de cadastro, vínculos e pendências gerais."
        exportHref={exportHref}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total" value={String(athletes.length)} />
        <SummaryCard
          label="Ativos"
          value={String(athletes.filter((athlete) => athlete.status === "active").length)}
        />
        <SummaryCard
          label="Menores"
          value={String(athletes.filter((athlete) => isMinor(athlete.birthDate)).length)}
        />
        <SummaryCard label="Sem responsável legal" value={String(minorsWithoutGuardian)} />
        <SummaryCard label="Sem escola" value={String(withoutSchool)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <TextFilter label="Buscar por nome" name="busca" value={search} />
            <SelectFilter
              label="Status"
              name="status"
              value={status}
              options={[
                { value: "", label: "Todos" },
                ...Object.entries(athleteStatusLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <SelectFilter
              label="Menor de idade"
              name="menor"
              value={minor}
              options={[
                { value: "", label: "Todos" },
                { value: "sim", label: "Sim" },
                { value: "nao", label: "Não" },
              ]}
            />
            <SelectFilter
              label="Sexo"
              name="sexo"
              value={gender}
              options={[
                { value: "", label: "Todos" },
                ...Object.entries(genderLabels).map(([value, label]) => ({ value, label })),
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
            <SelectFilter
              label="Responsável legal"
              name="responsavelLegal"
              value={legalGuardian}
              options={[
                { value: "", label: "Todos" },
                { value: "com", label: "Com responsável legal" },
                { value: "sem", label: "Sem responsável legal" },
              ]}
            />
            <SelectFilter
              label="Escola"
              name="escola"
              value={school}
              options={[
                { value: "", label: "Todos" },
                { value: "com", label: "Com escola" },
                { value: "sem", label: "Sem escola" },
              ]}
            />
            <SelectFilter
              label="Médico/Saúde"
              name="medico"
              value={medical}
              options={[
                { value: "", label: "Todos" },
                { value: "com", label: "Com cadastro" },
                { value: "sem", label: "Sem cadastro" },
              ]}
            />
            <TextFilter
              label="Entrada inicial"
              name="entradaInicial"
              value={joinedFrom}
              type="date"
            />
            <TextFilter
              label="Entrada final"
              name="entradaFinal"
              value={joinedTo}
              type="date"
            />
            <FilterActions clearHref="/admin/relatorios/atletas" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Idade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Modalidade/Turma</th>
                <th className="px-4 py-3">Responsável legal</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Escola</th>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Pendências</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {athletes.map((athlete) => {
                const legal = athlete.guardians.find((link) => link.isLegalGuardian);
                const currentSchool = athlete.schools.find((link) => link.isCurrent);
                const pending = [
                  isMinor(athlete.birthDate) && !legal ? "Sem responsável legal" : null,
                  !currentSchool ? "Sem escola" : null,
                  !athlete.medicalInfo ? "Sem médico/saúde" : null,
                  athlete.classes.length === 0 ? "Sem turma" : null,
                ].filter(Boolean);

                return (
                  <tr key={athlete.id}>
                    <td className="px-4 py-3 font-bold text-zinc-950">
                      <Link href={`/admin/atletas/${athlete.id}`}>{athlete.fullName}</Link>
                    </td>
                    <td className="px-4 py-3">{calculateAge(athlete.birthDate)}</td>
                    <td className="px-4 py-3">{athleteStatusLabels[athlete.status]}</td>
                    <td className="px-4 py-3">
                      {athlete.classes
                        .map(
                          (link) =>
                            `${link.trainingClass.modality.name}/${link.trainingClass.name}`,
                        )
                        .join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">{legal?.guardian.fullName ?? "-"}</td>
                    <td className="px-4 py-3">
                      {legal?.guardian.whatsapp ?? legal?.guardian.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3">{currentSchool?.school.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      {[
                        ...new Set(
                          athlete.classes.map((link) => link.trainingClass.teacher.fullName),
                        ),
                      ].join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">{formatDate(athlete.joinedAt)}</td>
                    <td className="px-4 py-3">{pending.join(", ") || "Sem pendências"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {withoutMedical >= 0 && athletes.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-zinc-600">
              Nenhum atleta encontrado para os filtros selecionados.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

