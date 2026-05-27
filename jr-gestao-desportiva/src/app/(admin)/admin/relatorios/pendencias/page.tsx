import { redirect } from "next/navigation";
import type { AthleteStatus } from "@prisma/client";

import {
  FilterActions,
  ReportPageHeader,
  SelectFilter,
  SummaryCard,
} from "@/components/app/report-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateAge, isMinor } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  appliesToAthlete,
  currentReferenceYear,
  effectiveDocumentStatus,
  isMedicalCertificateName,
} from "@/lib/documents";
import { effectiveMonthlyFeeStatus } from "@/lib/finance";
import { canViewCriticalPendingReports } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

type PendingRow = {
  athleteId: string;
  athleteName: string;
  age: number;
  classes: string;
  type: string;
  severity: "critical" | "warning" | "info";
  related: string;
  action: string;
};

const severityLabels = {
  critical: "Crítica",
  warning: "Atenção",
  info: "Informativa",
};

export default async function CriticalPendingReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewCriticalPendingReports(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const athleteId = query.atleta ?? "";
  const modalityId = query.modalidade ?? "";
  const trainingClassId = query.turma ?? "";
  const type = query.tipo ?? "";
  const severity = query.severidade ?? "";
  const minor = query.menor ?? "";
  const status = query.status ?? "";

  const where = {
    ...(athleteId ? { id: athleteId } : {}),
    ...(status ? { status: status as AthleteStatus } : {}),
    ...(modalityId || trainingClassId
      ? {
          classes: {
            some: {
              ...(trainingClassId ? { trainingClassId } : {}),
              ...(modalityId ? { trainingClass: { modalityId } } : {}),
            },
          },
        }
      : {}),
  };

  const [athletes, athleteOptions, modalities, classes, documentTypes] = await Promise.all([
    getPrisma().athlete.findMany({
      where,
      include: {
        guardians: { include: { guardian: true } },
        schools: true,
        medicalInfo: true,
        classes: { include: { trainingClass: { include: { modality: true } } } },
        documents: { include: { documentType: true } },
        monthlyFees: { include: { payments: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().athlete.findMany({
      select: { id: true, fullName: true, preferredName: true },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().documentType.findMany({
      where: { isActive: true, isRequired: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const currentYear = currentReferenceYear();
  const rows = athletes
    .filter((athlete) => (minor === "sim" ? isMinor(athlete.birthDate) : true))
    .filter((athlete) => (minor === "nao" ? !isMinor(athlete.birthDate) : true))
    .flatMap((athlete): PendingRow[] => {
      const age = calculateAge(athlete.birthDate);
      const classLabel =
        athlete.classes
          .map((link) => `${link.trainingClass.modality.name}/${link.trainingClass.name}`)
          .join(", ") || "-";
      const base = {
        athleteId: athlete.id,
        athleteName: athlete.fullName,
        age,
        classes: classLabel,
      };
      const rowsForAthlete: PendingRow[] = [];
      const legal = athlete.guardians.find((link) => link.isLegalGuardian);
      const emergency = athlete.guardians.find((link) => link.isEmergencyContact);

      if (age < 18 && !legal) {
        rowsForAthlete.push({
          ...base,
          type: "Atleta menor sem responsável legal",
          severity: "critical",
          related: "Responsáveis",
          action: "Cadastrar ou vincular responsável legal.",
        });
      }

      if (age < 18 && !athlete.schools.some((link) => link.isCurrent)) {
        rowsForAthlete.push({
          ...base,
          type: "Atleta menor sem escola",
          severity: "warning",
          related: "Escola",
          action: "Cadastrar escola atual.",
        });
      }

      if (!emergency) {
        rowsForAthlete.push({
          ...base,
          type: "Sem contato de emergência",
          severity: "critical",
          related: "Responsáveis",
          action: "Marcar contato de emergência.",
        });
      }

      const medicalDocs = athlete.documents.filter((document) =>
        isMedicalCertificateName(document.documentType.name),
      );
      const validMedical = medicalDocs.some((document) => {
        const status = effectiveDocumentStatus(document);
        return status === "approved";
      });

      if (!validMedical) {
        rowsForAthlete.push({
          ...base,
          type: "Sem atestado válido",
          severity: "critical",
          related: "Documentos",
          action: "Enviar e aprovar atestado médico válido.",
        });
      }

      for (const documentType of documentTypes.filter((item) =>
        appliesToAthlete(item, athlete.birthDate),
      )) {
        const document = athlete.documents.find(
          (item) =>
            item.documentTypeId === documentType.id &&
            item.referenceYear === currentYear,
        );

        if (!document) {
          rowsForAthlete.push({
            ...base,
            type: "Documento obrigatório pendente",
            severity: "warning",
            related: documentType.name,
            action: "Solicitar documento do ano vigente.",
          });
        } else if (effectiveDocumentStatus(document) === "expired") {
          rowsForAthlete.push({
            ...base,
            type: "Documento obrigatório vencido",
            severity: "critical",
            related: documentType.name,
            action: "Solicitar renovação do documento.",
          });
        }
      }

      if (
        athlete.monthlyFees.some(
          (fee) => effectiveMonthlyFeeStatus(fee) === "overdue",
        )
      ) {
        rowsForAthlete.push({
          ...base,
          type: "Mensalidade atrasada",
          severity: "warning",
          related: "Financeiro",
          action: "Verificar pagamento com responsável financeiro.",
        });
      }

      if (athlete.status === "active" && athlete.classes.length === 0) {
        rowsForAthlete.push({
          ...base,
          type: "Atleta ativo sem turma",
          severity: "warning",
          related: "Turmas",
          action: "Vincular atleta a uma turma ativa.",
        });
      }

      if (athlete.medicalInfo?.physicalRestrictions || athlete.medicalInfo?.restrictions) {
        rowsForAthlete.push({
          ...base,
          type: "Restrição médica relevante",
          severity: "info",
          related: "Médico/Saúde",
          action: "Revisar resumo para treino.",
        });
      }

      if (!athlete.phone && !athlete.email) {
        rowsForAthlete.push({
          ...base,
          type: "Cadastro incompleto",
          severity: "info",
          related: "Atleta",
          action: "Completar dados de contato.",
        });
      }

      return rowsForAthlete;
    })
    .filter((row) => (type ? row.type === type : true))
    .filter((row) => (severity ? row.severity === severity : true));

  const typeOptions = [...new Set(rows.map((row) => row.type))].sort();
  const exportHref = `/admin/relatorios/pendencias/exportar?${new URLSearchParams(
    Object.entries(query).filter(([, value]) => value) as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Relatório de pendências críticas"
        description="Pendências consolidadas para priorização administrativa."
        exportHref={exportHref}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total" value={String(rows.length)} />
        <SummaryCard
          label="Críticas"
          value={String(rows.filter((row) => row.severity === "critical").length)}
        />
        <SummaryCard
          label="Atenção"
          value={String(rows.filter((row) => row.severity === "warning").length)}
        />
        <SummaryCard
          label="Informativas"
          value={String(rows.filter((row) => row.severity === "info").length)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <SelectFilter
              label="Atleta"
              name="atleta"
              value={athleteId}
              options={[
                { value: "", label: "Todos" },
                ...athleteOptions.map((athlete) => ({
                  value: athlete.id,
                  label: athlete.preferredName
                    ? `${athlete.fullName} (${athlete.preferredName})`
                    : athlete.fullName,
                })),
              ]}
            />
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
              label="Tipo de pendência"
              name="tipo"
              value={type}
              options={[
                { value: "", label: "Todas" },
                ...typeOptions.map((item) => ({ value: item, label: item })),
              ]}
            />
            <SelectFilter
              label="Severidade"
              name="severidade"
              value={severity}
              options={[
                { value: "", label: "Todas" },
                { value: "critical", label: "Crítica" },
                { value: "warning", label: "Atenção" },
                { value: "info", label: "Informativa" },
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
              label="Status do atleta"
              name="status"
              value={status}
              options={[
                { value: "", label: "Todos" },
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
                { value: "away", label: "Afastado" },
                { value: "trial", label: "Experimental" },
              ]}
            />
            <FilterActions clearHref="/admin/relatorios/pendencias" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Idade</th>
                <th className="px-4 py-3">Modalidade/Turma</th>
                <th className="px-4 py-3">Pendência</th>
                <th className="px-4 py-3">Severidade</th>
                <th className="px-4 py-3">Relacionado</th>
                <th className="px-4 py-3">Ação sugerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rows.map((row, index) => (
                <tr key={`${row.athleteId}-${row.type}-${index}`}>
                  <td className="px-4 py-3 font-bold text-zinc-950">{row.athleteName}</td>
                  <td className="px-4 py-3">{row.age}</td>
                  <td className="px-4 py-3">{row.classes}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{severityLabels[row.severity]}</td>
                  <td className="px-4 py-3">{row.related}</td>
                  <td className="px-4 py-3">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
