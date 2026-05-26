import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AthleteDocumentStatus } from "@prisma/client";

import { callAthletesToCompetition } from "@/app/(admin)/admin/competicoes/actions";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { calculateAge } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import { effectiveDocumentStatus, isMedicalCertificateName } from "@/lib/documents";
import { canManageCompetitions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type CompetitionCallPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modalidade?: string; turma?: string }>;
};

export default async function CompetitionCallPage({
  params,
  searchParams,
}: CompetitionCallPageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageCompetitions(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const competition = await getPrisma().competition.findUnique({
    where: { id },
    include: { athletes: true, modality: true },
  });

  if (!competition) {
    notFound();
  }

  const [modalities, classes, athletes] = await Promise.all([
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().athlete.findMany({
      where: {
        status: { in: ["active", "trial"] },
        ...(query.turma
          ? { classes: { some: { trainingClassId: query.turma } } }
          : query.modalidade
            ? { classes: { some: { trainingClass: { modalityId: query.modalidade } } } }
            : competition.modalityId
              ? { classes: { some: { trainingClass: { modalityId: competition.modalityId } } } }
              : {}),
      },
      include: {
        guardians: { include: { guardian: true } },
        medicalInfo: true,
        documents: { include: { documentType: true } },
        classes: { include: { trainingClass: { include: { modality: true } } } },
      },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const called = new Set(competition.athletes.map((item) => item.athleteId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Convocar atletas
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {competition.name}. Pendências aparecem como alerta, mas não bloqueiam a convocação.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/admin/competicoes/${competition.id}`}>Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <SelectFilter
              label="Modalidade"
              name="modalidade"
              value={query.modalidade ?? competition.modalityId ?? ""}
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
              value={query.turma ?? ""}
              options={[
                { value: "", label: "Todas" },
                ...classes.map((trainingClass) => ({
                  value: trainingClass.id,
                  label: `${trainingClass.name} - ${trainingClass.modality.name}`,
                })),
              ]}
            />
            <div className="flex items-end justify-end gap-2">
              <Button asChild variant="secondary">
                <Link href={`/admin/competicoes/${competition.id}/convocacao`}>
                  Limpar
                </Link>
              </Button>
              <Button type="submit">Filtrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <form action={callAthletesToCompetition} className="space-y-4">
        <input type="hidden" name="competitionId" value={competition.id} />
        {athletes.map((athlete) => {
          const checks = callChecks(athlete);
          const alerts = checks.alerts;

          return (
            <Card key={athlete.id}>
              <CardContent className="grid gap-4 pt-5 lg:grid-cols-[80px_1fr_auto]">
                <AthleteAvatar
                  name={athlete.fullName}
                  photoUrl={athlete.photoUrl}
                  className="w-20"
                />
                <div className="space-y-3">
                  <div>
                    <h2 className="font-black text-zinc-950">{athlete.fullName}</h2>
                    <p className="text-sm font-semibold text-zinc-600">
                      {calculateAge(athlete.birthDate)} anos ·{" "}
                      {athlete.classes.map((item) => item.trainingClass.name).join(", ") || "Sem turma"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {called.has(athlete.id) ? <Badge>Já convocado</Badge> : null}
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
                  <p className="text-sm font-semibold text-zinc-600">
                    Emergência:{" "}
                    {athlete.guardians.find((item) => item.isEmergencyContact)?.guardian.phone ?? "-"}
                  </p>
                </div>
                <label className="flex items-center gap-3 text-sm font-bold text-zinc-950">
                  <input
                    type="checkbox"
                    name="athleteIds"
                    value={athlete.id}
                    disabled={called.has(athlete.id)}
                    className="size-5 rounded border-zinc-300 accent-jr-red disabled:opacity-40"
                  />
                  Convocar
                  <input type="hidden" name={`documentsOk-${athlete.id}`} value={checks.documentsOk ? "on" : ""} />
                  <input type="hidden" name={`medicalOk-${athlete.id}`} value={checks.medicalOk ? "on" : ""} />
                  <input type="hidden" name={`guardianOk-${athlete.id}`} value={checks.guardianOk ? "on" : ""} />
                </label>
              </CardContent>
            </Card>
          );
        })}
        <div className="flex justify-end">
          <Button type="submit">Adicionar selecionados</Button>
        </div>
      </form>
    </div>
  );
}

function callChecks(athlete: {
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
  const medicalDocument = athlete.documents.find((document) =>
    isMedicalCertificateName(document.documentType.name)
  );
  const medicalOk = Boolean(
    medicalDocument && effectiveDocumentStatus(medicalDocument) === "approved"
  );
  const authorizationOk = athlete.documents.some(
    (document) =>
      document.documentType.name.toLowerCase().includes("autorização de participação") &&
      effectiveDocumentStatus(document) === "approved"
  );
  const guardianOk = calculateAge(athlete.birthDate) >= 18 || hasLegalGuardian;

  if (!medicalOk) alerts.push("sem atestado válido");
  if (requiredPending) alerts.push("documento obrigatório pendente");
  if (!authorizationOk) alerts.push("autorização de participação pendente");
  if (!guardianOk) alerts.push("responsável legal ausente");
  if (!hasEmergencyContact) alerts.push("contato de emergência ausente");
  if (athlete.medicalInfo?.restrictions || athlete.medicalInfo?.physicalRestrictions) {
    alerts.push("restrição médica cadastrada");
  }

  return {
    documentsOk: !requiredPending && authorizationOk,
    medicalOk,
    guardianOk,
    alerts,
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
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
