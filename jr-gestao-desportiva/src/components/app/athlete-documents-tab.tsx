import Link from "next/link";
import type { AthleteDocumentStatus, DocumentPeriodicity } from "@prisma/client";
import {
  approveAthleteDocument,
  rejectAthleteDocument,
  uploadAthleteDocumentAction,
  waiveAthleteDocument,
} from "@/app/(admin)/admin/documentos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/athletes";
import {
  appliesToAthlete,
  currentReferenceYear,
  documentPeriodicityLabel,
  documentStatusClass,
  documentStatusLabel,
  documentStatusOptions,
  effectiveDocumentStatus,
  isDocumentExpired,
  isDocumentExpiringSoon,
  isMedicalCertificateName,
} from "@/lib/documents";

type AthleteForDocuments = {
  id: string;
  birthDate: Date;
};

type DocumentTypeRow = {
  id: string;
  name: string;
  isRequired: boolean;
  periodicity: string | null;
  appliesToMinors: boolean;
  appliesToAdults: boolean;
};

type AthleteDocumentRow = {
  id: string;
  documentTypeId: string;
  referenceYear: number | null;
  filePath: string | null;
  fileName: string | null;
  originalFileName: string | null;
  status: AthleteDocumentStatus;
  expirationDate: Date | null;
  expiresAt: Date | null;
  uploadedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  documentType: DocumentTypeRow;
  uploadedByUser: { name: string | null } | null;
  reviewedByUser: { name: string | null } | null;
};

type AthleteDocumentsTabProps = {
  athlete: AthleteForDocuments;
  documentTypes: DocumentTypeRow[];
  documents: AthleteDocumentRow[];
  filters: {
    referenceYear: number;
    status: string | null | undefined;
    documentTypeId: string | null;
    ano: string;
    documentoStatus: string;
    tipoDocumento: string;
    erro: string;
  };
  canManage: boolean;
  canView: boolean;
  canViewFull: boolean;
};

const uploadErrors: Record<string, string> = {
  "arquivo-obrigatorio": "Selecione um arquivo antes de enviar.",
  "arquivo-invalido": "Arquivo inválido. Envie PDF, JPG, PNG ou WEBP.",
  "arquivo-grande": "Arquivo muito grande. O limite é 10 MB.",
  "storage-config":
    "Storage do Supabase não configurado. Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.",
  storage:
    "Não foi possível salvar o arquivo. Verifique se o bucket privado athlete-documents existe e permite upload pelo servidor.",
  "motivo-obrigatorio": "Informe o motivo para reprovar o documento.",
  "usuario-invalido": "Usuário não autenticado ou inválido.",
};

export function AthleteDocumentsTab({
  athlete,
  documentTypes,
  documents,
  filters,
  canManage,
  canView,
  canViewFull,
}: AthleteDocumentsTabProps) {
  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-zinc-600">
            Seu perfil não possui permissão para visualizar documentos deste atleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  const applicableTypes = documentTypes.filter((type) =>
    appliesToAthlete(type, athlete.birthDate)
  );
  const requiredTypes = applicableTypes.filter((type) => type.isRequired);
  const latestByType = new Map<string, AthleteDocumentRow>();

  for (const document of documents) {
    if (!latestByType.has(document.documentTypeId)) {
      latestByType.set(document.documentTypeId, document);
    }
  }

  const pendingRequired = requiredTypes.filter((type) => !latestByType.get(type.id));
  const expiredDocuments = documents.filter((document) =>
    isDocumentExpired(document.expirationDate ?? document.expiresAt)
  );
  const expiringDocuments = documents.filter((document) =>
    isDocumentExpiringSoon(document.expirationDate ?? document.expiresAt)
  );
  const underReview = documents.filter(
    (document) => document.status === "under_review" || document.status === "uploaded"
  );
  const medicalCertificate = documents.find(
    (document) =>
      isMedicalCertificateName(document.documentType.name) &&
      effectiveDocumentStatus(document) === "approved"
  );
  const hasValidMedicalCertificate = Boolean(medicalCertificate);
  const complete = pendingRequired.length === 0 && expiredDocuments.length === 0;

  if (!canViewFull) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Documentação"
          value={complete ? "Regular" : "Pendente"}
        />
        <SummaryCard
          label="Pendências"
          value={String(pendingRequired.length)}
        />
        <SummaryCard
          label="Vencidos"
          value={String(expiredDocuments.length)}
        />
        <SummaryCard
          label="Atestado"
          value={hasValidMedicalCertificate ? "Válido" : "Sem atestado válido"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filters.erro ? (
        <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red">
          {uploadErrors[filters.erro] ?? "Não foi possível concluir a operação."}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Pendentes" value={String(pendingRequired.length)} />
        <SummaryCard label="Vencidos" value={String(expiredDocuments.length)} />
        <SummaryCard label="Vencendo em 30 dias" value={String(expiringDocuments.length)} />
        <SummaryCard label="Aguardando análise" value={String(underReview.length)} />
        <SummaryCard
          label="Atestado"
          value={hasValidMedicalCertificate ? "Válido" : "Sem atestado válido"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4">
            <input type="hidden" name="aba" value="documentos" />
            <div className="space-y-2">
              <Label htmlFor="ano">Ano de referência</Label>
              <Input id="ano" name="ano" defaultValue={filters.ano} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoDocumento">Tipo de documento</Label>
              <select
                id="tipoDocumento"
                name="tipoDocumento"
                defaultValue={filters.tipoDocumento}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="">Todos</option>
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentoStatus">Status</Label>
              <select
                id="documentoStatus"
                name="documentoStatus"
                defaultValue={filters.documentoStatus}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="all">Todos</option>
                {documentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button asChild variant="secondary">
                <Link href={`/admin/atletas/${athlete.id}?aba=documentos`}>
                  Limpar
                </Link>
              </Button>
              <Button type="submit">Filtrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist documental de {filters.referenceYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {applicableTypes.map((type) => {
              const document = latestByType.get(type.id);
              const status = document ? effectiveDocumentStatus(document) : "pending";

              return (
                <div key={type.id} className="rounded-md border border-zinc-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-zinc-950">
                        {type.name}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {type.periodicity
                          ? documentPeriodicityLabel(type.periodicity as DocumentPeriodicity)
                          : "Não informado"}
                      </p>
                    </div>
                    <Badge className={documentStatusClass(status)}>
                      {documentStatusLabel(status)}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-600">
                    <div>
                      <dt className="font-bold uppercase text-zinc-500">Obrigatório</dt>
                      <dd>{type.isRequired ? "Sim" : "Não"}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase text-zinc-500">Validade</dt>
                      <dd>{formatDate(document?.expirationDate ?? document?.expiresAt)}</dd>
                    </div>
                  </dl>
                  {document?.filePath ? (
                    <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                      <Link href={`/admin/documentos/arquivo/${document.id}`} target="_blank">
                        Visualizar
                      </Link>
                    </Button>
                  ) : null}
                  {canManage ? (
                    <div className="mt-3">
                      <DocumentActions
                        athleteId={athlete.id}
                        documentTypeId={type.id}
                        referenceYear={filters.referenceYear}
                        document={document}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Obrigatório</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {applicableTypes.map((type) => {
                const document = latestByType.get(type.id);
                const status = document
                  ? effectiveDocumentStatus(document)
                  : "pending";

                return (
                  <tr key={type.id}>
                    <td className="px-4 py-3 font-bold text-zinc-950">
                      {type.name}
                      <p className="mt-1 font-normal text-zinc-600">
                        {type.periodicity
  ? documentPeriodicityLabel(type.periodicity as DocumentPeriodicity)
  : "Não informado"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{type.isRequired ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3">
                      <Badge className={documentStatusClass(status)}>
                        {documentStatusLabel(status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(document?.expirationDate ?? document?.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      {document?.filePath ? (
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
                    <td className="px-4 py-3">
                      {canManage ? (
                        <DocumentActions
                          athleteId={athlete.id}
                          documentTypeId={type.id}
                          referenceYear={filters.referenceYear}
                          document={document}
                        />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de documentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {documents.map((document) => {
              const status = effectiveDocumentStatus(document);

              return (
                <div key={document.id} className="rounded-md border border-zinc-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-zinc-950">
                        {document.documentType.name}
                      </p>
                      <p className="break-words text-xs text-zinc-600">
                        {document.originalFileName ?? document.fileName ?? "-"}
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
                      <dt className="font-bold uppercase text-zinc-500">Enviado</dt>
                      <dd>{formatDate(document.uploadedAt)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="font-bold uppercase text-zinc-500">Análise</dt>
                      <dd>{document.reviewedByUser?.name ?? "-"} • {formatDate(document.reviewedAt)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Enviado por</th>
                <th className="px-4 py-3">Analisado por</th>
                <th className="px-4 py-3">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {documents.map((document) => {
                const status = effectiveDocumentStatus(document);

                return (
                  <tr key={document.id}>
                    <td className="px-4 py-3">{document.referenceYear ?? "-"}</td>
                    <td className="px-4 py-3 font-bold text-zinc-950">
                      {document.documentType.name}
                      <p className="mt-1 font-normal text-zinc-600">
                        {document.originalFileName ?? document.fileName ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={documentStatusClass(status)}>
                        {documentStatusLabel(status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {document.uploadedByUser?.name ?? "-"}
                      <p>{formatDate(document.uploadedAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {document.reviewedByUser?.name ?? "-"}
                      <p>{formatDate(document.reviewedAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {document.rejectionReason ?? document.notes ?? "-"}
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

function DocumentActions({
  athleteId,
  documentTypeId,
  referenceYear,
  document,
}: {
  athleteId: string;
  documentTypeId: string;
  referenceYear: number;
  document?: AthleteDocumentRow;
}) {
  return (
    <div className="space-y-3">
      <form action={uploadAthleteDocumentAction} className="grid gap-2">
        <input type="hidden" name="athleteId" value={athleteId} />
        <input type="hidden" name="documentTypeId" value={documentTypeId} />
        <input type="hidden" name="referenceYear" value={referenceYear} />
        {document ? (
          <input type="hidden" name="previousDocumentId" value={document.id} />
        ) : null}
        <input type="hidden" name="status" value="uploaded" />
        <input
          type="file"
          name="documentFile"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="w-full text-xs font-semibold text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="issueDate" type="date" aria-label="Data de emissão" />
          <Input name="expirationDate" type="date" aria-label="Data de validade" />
        </div>
        <Input name="notes" placeholder="Observações" />
        <Button type="submit" size="sm">
          {document ? "Substituir" : "Enviar"}
        </Button>
      </form>

      {document ? (
        <div className="grid gap-2">
          <form action={approveAthleteDocument}>
            <input type="hidden" name="athleteId" value={athleteId} />
            <input type="hidden" name="documentId" value={document.id} />
            <Button type="submit" variant="secondary" size="sm">
              Aprovar
            </Button>
          </form>
          <form action={rejectAthleteDocument} className="grid gap-2">
            <input type="hidden" name="athleteId" value={athleteId} />
            <input type="hidden" name="documentId" value={document.id} />
            <Input
              name="rejectionReason"
              placeholder="Motivo da reprovação"
              aria-label="Motivo da reprovação"
            />
            <Button type="submit" variant="ghost" size="sm">
              Reprovar
            </Button>
          </form>
        </div>
      ) : (
        <form action={waiveAthleteDocument} className="grid gap-2">
          <input type="hidden" name="athleteId" value={athleteId} />
          <input type="hidden" name="documentTypeId" value={documentTypeId} />
          <input type="hidden" name="referenceYear" value={referenceYear} />
          <Input name="notes" placeholder="Motivo da dispensa" />
          <Button type="submit" variant="ghost" size="sm">
            Dispensar
          </Button>
        </form>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
        <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
      </CardContent>
    </Card>
  );
}

export function defaultDocumentYear() {
  return currentReferenceYear();
}
