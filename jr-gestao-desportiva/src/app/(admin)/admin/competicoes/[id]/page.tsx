import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AthleteDocumentStatus } from "@prisma/client";

import {
  removeAthleteFromCompetition,
  updateCompetitionAthlete,
} from "@/app/(admin)/admin/competicoes/actions";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAge, formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  competitionAthleteStatusClass,
  competitionAthleteStatusLabel,
  competitionAthleteStatusOptions,
  competitionStatusLabel,
  medalLabel,
  medalOptions,
} from "@/lib/competitions";
import {
  effectiveDocumentStatus,
  isMedicalCertificateName,
} from "@/lib/documents";
import {
  canManageCompetitions,
  canUpdateCompetitionParticipation,
  canViewCompetitions,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type CompetitionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailPageProps) {
  const user = await getCurrentUser();
  if (!user || !canViewCompetitions(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const competition = await getPrisma().competition.findUnique({
    where: { id },
    include: {
      modality: true,
      responsibleTeacher: true,
      assistants: { include: { staffMember: true } },
      athletes: {
        include: {
          athlete: {
            include: {
              guardians: { include: { guardian: true } },
              medicalInfo: true,
              documents: { include: { documentType: true } },
              classes: { include: { trainingClass: { include: { modality: true } } } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!competition) {
    notFound();
  }

  const isLinkedStaff =
    competition.responsibleTeacher?.email === user.email ||
    competition.assistants.some(
      (assistant) => assistant.staffMember.email === user.email
    );

  if (
    (user.role === "PROFESSOR" || user.role === "ASSISTENTE") &&
    !isLinkedStaff
  ) {
    redirect("/acesso-negado");
  }

  const canManage = canManageCompetitions(user.role);
  const canUpdateParticipation = canUpdateCompetitionParticipation(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            {competition.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {competition.modality?.name ?? "Modalidade não informada"} ·{" "}
            {formatDate(competition.startsAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <Button asChild>
                <Link href={`/admin/competicoes/${competition.id}/convocacao`}>
                  Convocar atletas
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/admin/competicoes/${competition.id}/editar`}>
                  Editar
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da competição</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Status" value={competitionStatusLabel(competition.status)} />
          <Info label="Local" value={competition.location ?? "-"} />
          <Info label="Cidade/UF" value={[competition.city, competition.state].filter(Boolean).join(" / ") || "-"} />
          <Info label="Organizador" value={competition.organizer ?? "-"} />
          <Info label="Treinador" value={competition.responsibleTeacher?.fullName ?? "-"} />
          <Info
            label="Assistentes"
            value={
              competition.assistants
                .map((assistant) => assistant.staffMember.fullName)
                .join(", ") || "-"
            }
          />
          <Info label="Concentração" value={competition.meetingTime ?? "-"} />
          <Info label="Transporte" value={competition.transportation ?? "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atletas convocados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {competition.athletes.map((link) => {
            const alerts = competitionAlerts(link.athlete);

            return (
              <div
                key={link.id}
                className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 lg:grid-cols-[80px_1fr]"
              >
                <AthleteAvatar
                  name={link.athlete.fullName}
                  photoUrl={link.athlete.photoUrl}
                  className="w-20"
                />
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <div>
                      <h2 className="font-black text-zinc-950">
                        {link.athlete.fullName}
                      </h2>
                      <p className="text-sm font-semibold text-zinc-600">
                        {calculateAge(link.athlete.birthDate)} anos ·{" "}
                        {link.athlete.classes
                          .map((item) => item.trainingClass.name)
                          .join(", ") || "Sem turma"}
                      </p>
                    </div>
                    <Badge className={competitionAthleteStatusClass(link.status)}>
                      {competitionAthleteStatusLabel(link.status)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <Badge
                          key={alert}
                          className="border-jr-red/25 bg-jr-red/10 text-jr-red"
                        >
                          {alert}
                        </Badge>
                      ))
                    ) : (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                        Sem pendências críticas
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="Contato de emergência"
                      value={
                        link.athlete.guardians.find((item) => item.isEmergencyContact)
                          ?.guardian.phone ?? "-"
                      }
                    />
                    <Info label="Documentos OK" value={link.documentsOk ? "Sim" : "Não"} />
                    <Info
                      label="Liberação médica OK"
                      value={link.medicalClearanceOk ? "Sim" : "Não"}
                    />
                    <Info label="Medalha" value={medalLabel(link.medal)} />
                  </div>

                  {canUpdateParticipation ? (
                    <CompetitionAthleteForm
                      competitionId={competition.id}
                      canRemove={canManage}
                      link={link}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}

          {competition.athletes.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">
              Nenhum atleta convocado ainda.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitionAthleteForm({
  competitionId,
  canRemove,
  link,
}: {
  competitionId: string;
  canRemove: boolean;
  link: {
    id: string;
    athleteId: string;
    status: string;
    documentsOk: boolean;
    medicalClearanceOk: boolean;
    guardianOk: boolean;
    presenceConfirmed: boolean;
    participated: boolean;
    result: string | null;
    placement: string | null;
    medal: string;
    notes: string | null;
  };
}) {
  return (
    <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <form action={updateCompetitionAthlete} className="grid gap-3 lg:grid-cols-4">
        <input type="hidden" name="competitionAthleteId" value={link.id} />
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="space-y-2">
          <Label htmlFor={`status-${link.id}`}>Status</Label>
          <select
            id={`status-${link.id}`}
            name="status"
            defaultValue={link.status}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold"
          >
            {competitionAthleteStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <TextInput label="Resultado" name="result" value={link.result} />
        <TextInput label="Colocação" name="placement" value={link.placement} />
        <div className="space-y-2">
          <Label htmlFor={`medal-${link.id}`}>Medalha</Label>
          <select
            id={`medal-${link.id}`}
            name="medal"
            defaultValue={link.medal}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold"
          >
            {medalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Check name="documentsOk" label="Documentos OK" checked={link.documentsOk} />
        <Check
          name="medicalClearanceOk"
          label="Liberação médica OK"
          checked={link.medicalClearanceOk}
        />
        <Check name="guardianOk" label="Responsável OK" checked={link.guardianOk} />
        <Check
          name="presenceConfirmed"
          label="Presença confirmada"
          checked={link.presenceConfirmed}
        />
        <Check name="participated" label="Participou" checked={link.participated} />
        <div className="space-y-2 lg:col-span-4">
          <Label htmlFor={`notes-${link.id}`}>Observações</Label>
          <textarea
            id={`notes-${link.id}`}
            name="notes"
            defaultValue={link.notes ?? ""}
            rows={2}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end lg:col-span-4">
          <Button type="submit" size="sm">Salvar participação</Button>
        </div>
      </form>
      {canRemove ? (
        <form action={removeAthleteFromCompetition} className="flex justify-end">
          <input type="hidden" name="competitionId" value={competitionId} />
          <input type="hidden" name="athleteId" value={link.athleteId} />
          <Button type="submit" variant="ghost" size="sm">
            Remover convocação
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function competitionAlerts(athlete: {
  birthDate: Date;
  guardians: Array<{ isLegalGuardian: boolean; isEmergencyContact: boolean }>;
  medicalInfo: { restrictions: string | null; physicalRestrictions: string | null } | null;
  documents: Array<{
    status: AthleteDocumentStatus;
    expirationDate: Date | null;
    expiresAt: Date | null;
    documentType: { name: string; isRequired: boolean };
  }>;
}) {
  const alerts: string[] = [];
  const hasLegalGuardian = athlete.guardians.some((item) => item.isLegalGuardian);
  const hasEmergencyContact = athlete.guardians.some((item) => item.isEmergencyContact);
  const requiredPending = athlete.documents.some(
    (document) =>
      document.documentType.isRequired && effectiveDocumentStatus(document) !== "approved"
  );
  const authorizationPending = !athlete.documents.some(
    (document) =>
      document.documentType.name.toLowerCase().includes("autorização de participação") &&
      effectiveDocumentStatus(document) === "approved"
  );
  const medicalDocument = athlete.documents.find((document) =>
    isMedicalCertificateName(document.documentType.name)
  );
  const medicalStatus = medicalDocument ? effectiveDocumentStatus(medicalDocument) : null;

  if (!medicalDocument) alerts.push("sem atestado válido");
  if (medicalStatus === "expired") alerts.push("atestado vencido");
  if (requiredPending) alerts.push("documento obrigatório pendente");
  if (authorizationPending) alerts.push("autorização de participação pendente");
  if (calculateAge(athlete.birthDate) < 18 && !hasLegalGuardian) {
    alerts.push("responsável legal ausente");
  }
  if (!hasEmergencyContact) alerts.push("contato de emergência ausente");
  if (athlete.medicalInfo?.restrictions || athlete.medicalInfo?.physicalRestrictions) {
    alerts.push("restrição médica cadastrada");
  }

  return alerts;
}

function TextInput({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value ?? ""} />
    </div>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="size-4 rounded border-zinc-300 accent-jr-red"
      />
      {label}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
