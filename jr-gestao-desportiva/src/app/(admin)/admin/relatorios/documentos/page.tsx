import Link from "next/link";
import { redirect } from "next/navigation";
import type { AthleteDocumentStatus } from "@prisma/client";

import {
  FilterActions,
  ReportPageHeader,
  SelectFilter,
  SummaryCard,
  TextFilter,
} from "@/components/app/report-components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  documentStatusClass,
  documentStatusLabel,
  documentStatusOptions,
  effectiveDocumentStatus,
  isDocumentExpired,
  isMedicalCertificateName,
} from "@/lib/documents";
import { canViewDocumentReports } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function DocumentReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewDocumentReports(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const athleteId = query.atleta ?? "";
  const modalityId = query.modalidade ?? "";
  const trainingClassId = query.turma ?? "";
  const documentTypeId = query.tipo ?? "";
  const status = query.status ?? "";
  const alert = query.alerta ?? "";
  const required = query.obrigatorio ?? "";
  const medicalCertificate = query.atestado ?? "";
  const referenceYear = query.ano ? Number.parseInt(query.ano, 10) : Number.NaN;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

const documentTypeWhere = {
  ...(required ? { isRequired: required === "sim" } : {}),
  ...(medicalCertificate === "sim"
    ? {
        name: {
          contains: "Atestado",
          mode: "insensitive" as const,
        },
      }
    : {}),
};

const reviewStatuses: AthleteDocumentStatus[] = ["uploaded", "under_review"];

const where = {
  ...(athleteId ? { athleteId } : {}),
  ...(Number.isFinite(referenceYear) ? { referenceYear } : {}),
  ...(documentTypeId ? { documentTypeId } : {}),
  ...(status ? { status: status as AthleteDocumentStatus } : {}),
  ...(Object.keys(documentTypeWhere).length > 0
    ? {
        documentType: {
          is: documentTypeWhere,
        },
      }
    : {}),
  ...(modalityId || trainingClassId
    ? {
        athlete: {
          classes: {
            some: {
              ...(trainingClassId ? { trainingClassId } : {}),
              ...(modalityId ? { trainingClass: { modalityId } } : {}),
            },
          },
        },
      }
    : {}),
  ...(alert === "vencidos"
    ? { OR: [{ expirationDate: { lt: today } }, { expiresAt: { lt: today } }] }
    : alert === "vencendo"
      ? {
          OR: [
            { expirationDate: { gte: today, lte: thirtyDays } },
            { expiresAt: { gte: today, lte: thirtyDays } },
          ],
        }
      : alert === "analise"
        ? { status: { in: reviewStatuses } }
        : {}),
};

  const [documents, athletes, documentTypes, modalities, classes] = await Promise.all([
    getPrisma().athleteDocument.findMany({
      where,
      include: {
        athlete: {
          include: {
            classes: { include: { trainingClass: { include: { modality: true } } } },
          },
        },
        documentType: true,
        reviewedByUser: true,
      },
      orderBy: [{ referenceYear: "desc" }, { createdAt: "desc" }],
    }),
    getPrisma().athlete.findMany({
      select: { id: true, fullName: true, preferredName: true },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().documentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const effective = documents.map((document) => ({
    ...document,
    effectiveStatus: effectiveDocumentStatus(document),
  }));
  const exportHref = `/admin/relatorios/documentos/exportar?${new URLSearchParams(
    Object.entries(query).filter(([, value]) => value) as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Relatório de documentos"
        description="Controle anual de documentos, validade e análise."
        exportHref={exportHref}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Pendentes"
          value={String(effective.filter((item) => item.effectiveStatus === "pending").length)}
        />
        <SummaryCard
          label="Vencidos"
          value={String(effective.filter((item) => item.effectiveStatus === "expired").length)}
        />
        <SummaryCard
          label="Vencendo"
          value={String(effective.filter((item) => item.effectiveStatus === "expiring").length)}
        />
        <SummaryCard
          label="Aguardando análise"
          value={String(
            effective.filter((item) => ["uploaded", "under_review"].includes(item.status)).length,
          )}
        />
        <SummaryCard
          label="Aprovados"
          value={String(effective.filter((item) => item.status === "approved").length)}
        />
        <SummaryCard
          label="Sem atestado válido"
          value={String(
            documents.filter(
              (item) =>
                isMedicalCertificateName(item.documentType.name) &&
                (isDocumentExpired(item.expirationDate ?? item.expiresAt) ||
                  item.status !== "approved"),
            ).length,
          )}
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
                ...athletes.map((athlete) => ({
                  value: athlete.id,
                  label: athlete.preferredName
                    ? `${athlete.fullName} (${athlete.preferredName})`
                    : athlete.fullName,
                })),
              ]}
            />
            <TextFilter label="Ano" name="ano" value={query.ano ?? ""} type="number" />
            <SelectFilter
              label="Tipo de documento"
              name="tipo"
              value={documentTypeId}
              options={[
                { value: "", label: "Todos" },
                ...documentTypes.map((type) => ({ value: type.id, label: type.name })),
              ]}
            />
            <SelectFilter
              label="Status"
              name="status"
              value={status}
              options={[
                { value: "", label: "Todos" },
                ...documentStatusOptions.map((option) => ({
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
              label="Alerta"
              name="alerta"
              value={alert}
              options={[
                { value: "", label: "Todos" },
                { value: "vencidos", label: "Vencidos" },
                { value: "vencendo", label: "Vencendo em 30 dias" },
                { value: "analise", label: "Aguardando análise" },
              ]}
            />
            <SelectFilter
              label="Obrigatório"
              name="obrigatorio"
              value={required}
              options={[
                { value: "", label: "Todos" },
                { value: "sim", label: "Sim" },
                { value: "nao", label: "Não" },
              ]}
            />
            <SelectFilter
              label="Atestado médico"
              name="atestado"
              value={medicalCertificate}
              options={[
                { value: "", label: "Todos" },
                { value: "sim", label: "Somente atestado" },
              ]}
            />
            <FilterActions clearHref="/admin/relatorios/documentos" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Modalidade/Turma</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Obrigatório</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Envio</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Análise</th>
                <th className="px-4 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {effective.map((document) => (
                <tr key={document.id}>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    <Link href={`/admin/atletas/${document.athleteId}?aba=documentos`}>
                      {document.athlete.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {document.athlete.classes
                      .map(
                        (link) =>
                          `${link.trainingClass.modality.name}/${link.trainingClass.name}`,
                      )
                      .join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">{document.documentType.name}</td>
                  <td className="px-4 py-3">{document.referenceYear ?? "-"}</td>
                  <td className="px-4 py-3">{document.documentType.isRequired ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">
                    <Badge className={documentStatusClass(document.effectiveStatus)}>
                      {documentStatusLabel(document.effectiveStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(document.uploadedAt)}</td>
                  <td className="px-4 py-3">
                    {formatDate(document.expirationDate ?? document.expiresAt)}
                  </td>
                  <td className="px-4 py-3">
                    {document.reviewedByUser?.name ?? "-"} {formatDate(document.reviewedAt)}
                  </td>
                  <td className="px-4 py-3">{document.rejectionReason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
