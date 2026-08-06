import Link from "next/link";
import { redirect } from "next/navigation";
import type { AthleteDocumentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  appliesToAthlete,
  canManageDocuments,
  canViewFullDocuments,
  currentReferenceYear,
  documentStatusClass,
  documentStatusLabel,
  documentStatusOptions,
  effectiveDocumentStatus,
  isDocumentExpired,
  isDocumentExpiringSoon,
  isMedicalCertificateName,
} from "@/lib/documents";
import { getPrisma } from "@/lib/prisma";

type DocumentsPageProps = {
  searchParams: Promise<{
    atleta?: string;
    tipo?: string;
    status?: string;
    ano?: string;
    modalidade?: string;
    turma?: string;
    alerta?: string;
    erro?: string;
  }>;
};

const alertOptions = [
  { value: "", label: "Todos" },
  { value: "expired", label: "Vencidos" },
  { value: "expiring", label: "Vencendo em 30 dias" },
  { value: "review", label: "Aguardando análise" },
];

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewFullDocuments(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const filters = buildFilters(query);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const athleteWhere = {
    ...(filters.athleteId ? { id: filters.athleteId } : {}),
    ...(filters.modalityId || filters.trainingClassId
      ? {
          classes: {
            some: {
              ...(filters.trainingClassId
                ? { trainingClassId: filters.trainingClassId }
                : {}),
              ...(filters.modalityId
                ? { trainingClass: { modalityId: filters.modalityId } }
                : {}),
            },
          },
        }
      : {}),
  };

  const where = {
    ...(filters.referenceYear ? { referenceYear: filters.referenceYear } : {}),
    ...(filters.documentTypeId ? { documentTypeId: filters.documentTypeId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(Object.keys(athleteWhere).length > 0 ? { athlete: athleteWhere } : {}),
    ...(filters.alert === "expired"
      ? { expirationDate: { lt: today } }
      : filters.alert === "expiring"
        ? { expirationDate: { gte: today, lte: thirtyDays } }
        : filters.alert === "review"
          ? { status: { in: ["uploaded", "under_review"] as AthleteDocumentStatus[] } }
          : {}),
  };

  const [
    documents,
    documentTypes,
    athleteOptions,
    modalities,
    trainingClasses,
    activeAthletes,
    currentYearDocuments,
  ] = await Promise.all([
    getPrisma().athleteDocument.findMany({
      where,
      include: {
        athlete: true,
        documentType: true,
        uploadedByUser: true,
        reviewedByUser: true,
      },
      orderBy: [{ referenceYear: "desc" }, { createdAt: "desc" }],
    }),
    getPrisma().documentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().athlete.findMany({
      select: {
        id: true,
        fullName: true,
        preferredName: true,
      },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().modality.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().athlete.findMany({
      where: { status: "active" },
      select: { id: true, fullName: true, birthDate: true },
    }),
    getPrisma().athleteDocument.findMany({
      where: { referenceYear: currentReferenceYear() },
      include: { documentType: true },
    }),
  ]);
  const canManage = canManageDocuments(user.role);
  const summary = buildSummary(activeAthletes, documentTypes, currentYearDocuments);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Documentos anuais
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Controle documental dos atletas, validade, análise e pendências.
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="secondary">
            <Link href="/admin/documentos/tipos">Tipos de documentos</Link>
          </Button>
        ) : null}
      </div>

      {query.erro ? (
        <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red">
          Arquivo indisponível para visualização.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Pendentes" value={String(summary.pending)} />
        <SummaryCard label="Vencidos" value={String(summary.expired)} />
        <SummaryCard label="Vencendo em 30 dias" value={String(summary.expiring)} />
        <SummaryCard label="Aguardando análise" value={String(summary.underReview)} />
        <SummaryCard
          label="Sem atestado válido"
          value={String(summary.withoutValidMedicalCertificate)}
        />
        <SummaryCard label="Documentação completa" value={String(summary.complete)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="atleta">Atleta</Label>
              <select
                id="atleta"
                name="atleta"
                defaultValue={filters.athleteId ?? ""}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="">Todos os atletas</option>
                {athleteOptions.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.preferredName
                      ? `${athlete.fullName} (${athlete.preferredName})`
                      : athlete.fullName}
                  </option>
                ))}
              </select>
            </div>
            <SelectFilter
              label="Tipo de documento"
              name="tipo"
              value={filters.documentTypeId ?? ""}
              options={[
                { value: "", label: "Todos" },
                ...documentTypes.map((type) => ({
                  value: type.id,
                  label: type.name,
                })),
              ]}
            />
            <SelectFilter
              label="Status"
              name="status"
              value={filters.rawStatus}
              options={[
                { value: "all", label: "Todos" },
                ...documentStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Input id="ano" name="ano" defaultValue={filters.rawYear} />
            </div>
            <SelectFilter
              label="Modalidade"
              name="modalidade"
              value={filters.modalityId ?? ""}
              options={[
                { value: "", label: "Todas" },
                ...modalities.map((modality) => ({
                  value: modality.id,
                  label: modality.name,
                })),
              ]}
            />
            <SelectFilter
              label="Turma"
              name="turma"
              value={filters.trainingClassId ?? ""}
              options={[
                { value: "", label: "Todas" },
                ...trainingClasses.map((trainingClass) => ({
                  value: trainingClass.id,
                  label: `${trainingClass.name} - ${trainingClass.modality.name}`,
                })),
              ]}
            />
            <SelectFilter
              label="Alerta"
              name="alerta"
              value={filters.alert ?? ""}
              options={alertOptions}
            />
            <div className="flex items-end justify-end gap-2">
              <Button asChild variant="secondary">
                <Link href="/admin/documentos">Limpar</Link>
              </Button>
              <Button type="submit">Filtrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {documents.map((document) => {
              const status = effectiveDocumentStatus(document);

              return (
                <div
                  key={document.id}
                  className="rounded-md border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/atletas/${document.athleteId}?aba=documentos`}
                        className="break-words text-sm font-black text-zinc-950"
                      >
                        {document.athlete.fullName}
                      </Link>
                      <p className="mt-1 break-words text-sm font-semibold text-zinc-700">
                        {document.documentType.name}
                      </p>
                    </div>
                    <Badge className={documentStatusClass(status)}>
                      {documentStatusLabel(status)}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-600">
                    <div>
                      <dt className="font-bold uppercase text-zinc-500">Ano</dt>
                      <dd>{document.referenceYear ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase text-zinc-500">Validade</dt>
                      <dd>{formatDate(document.expirationDate ?? document.expiresAt)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="font-bold uppercase text-zinc-500">Arquivo</dt>
                      <dd className="break-words">
                        {document.originalFileName ?? document.fileName ?? "-"}
                      </dd>
                    </div>
                  </dl>
                  {document.filePath ? (
                    <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                      <Link href={`/admin/documentos/arquivo/${document.id}`} target="_blank">
                        Visualizar
                      </Link>
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Análise</th>
                <th className="px-4 py-3 text-right">Arquivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {documents.map((document) => {
                const status = effectiveDocumentStatus(document);

                return (
                  <tr key={document.id}>
                    <td className="px-4 py-3 font-bold text-zinc-950">
                      <Link href={`/admin/atletas/${document.athleteId}?aba=documentos`}>
                        {document.athlete.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {document.documentType.name}
                      <p className="mt-1 text-zinc-600">
                        {document.originalFileName ?? document.fileName ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{document.referenceYear ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={documentStatusClass(status)}>
                        {documentStatusLabel(status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(document.expirationDate ?? document.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {document.reviewedByUser?.name ?? "-"}
                      <p>{formatDate(document.reviewedAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {document.filePath ? (
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            href={`/admin/documentos/arquivo/${document.id}`}
                            target="_blank"
                          >
                            Visualizar
                          </Link>
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
          {documents.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-zinc-600">
              Nenhum documento encontrado para os filtros selecionados.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function buildFilters(query: Awaited<DocumentsPageProps["searchParams"]>) {
  const parsedYear = query.ano ? Number.parseInt(query.ano, 10) : Number.NaN;
  const status =
    query.status && query.status !== "all"
      ? documentStatusOptions.find((option) => option.value === query.status)
          ?.value
      : null;

  return {
    athleteId: query.atleta?.trim() || null,
    documentTypeId: query.tipo || null,
    status: status as AthleteDocumentStatus | null,
    rawStatus: query.status ?? "all",
    referenceYear: Number.isFinite(parsedYear) ? parsedYear : null,
    rawYear: query.ano ?? "",
    modalityId: query.modalidade || null,
    trainingClassId: query.turma || null,
    alert: query.alerta || null,
  };
}

function buildSummary(
  athletes: Array<{ id: string; birthDate: Date }>,
  documentTypes: Array<{
    id: string;
    isRequired: boolean;
    appliesToMinors: boolean;
    appliesToAdults: boolean;
  }>,
  documents: Array<{
    athleteId: string;
    documentTypeId: string;
    status: AthleteDocumentStatus;
    expirationDate: Date | null;
    expiresAt: Date | null;
    documentType: { name: string };
  }>
) {
  const latestByAthleteAndType = new Map<string, (typeof documents)[number]>();

  for (const document of documents) {
    const key = `${document.athleteId}:${document.documentTypeId}`;
    if (!latestByAthleteAndType.has(key)) {
      latestByAthleteAndType.set(key, document);
    }
  }

  let pending = 0;
  let complete = 0;
  let withoutValidMedicalCertificate = 0;

  for (const athlete of athletes) {
    const requiredTypes = documentTypes.filter(
      (type) => type.isRequired && appliesToAthlete(type, athlete.birthDate)
    );
    const missing = requiredTypes.filter(
      (type) => !latestByAthleteAndType.get(`${athlete.id}:${type.id}`)
    );
    const medicalDocument = documents.find(
      (document) =>
        document.athleteId === athlete.id &&
        isMedicalCertificateName(document.documentType.name) &&
        effectiveDocumentStatus(document) === "approved"
    );

    pending += missing.length;

    if (missing.length === 0) {
      complete += 1;
    }

    if (!medicalDocument) {
      withoutValidMedicalCertificate += 1;
    }
  }

  return {
    pending,
    complete,
    withoutValidMedicalCertificate,
    expired: documents.filter((document) =>
      isDocumentExpired(document.expirationDate ?? document.expiresAt)
    ).length,
    expiring: documents.filter((document) =>
      isDocumentExpiringSoon(document.expirationDate ?? document.expiresAt)
    ).length,
    underReview: documents.filter(
      (document) =>
        document.status === "uploaded" || document.status === "under_review"
    ).length,
  };
}

function SelectFilter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
      </CardContent>
    </Card>
  );
}


