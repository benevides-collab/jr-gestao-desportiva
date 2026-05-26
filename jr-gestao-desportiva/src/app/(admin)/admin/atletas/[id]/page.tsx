import Link from "next/link";
import { redirect } from "next/navigation";
import { Edit, ShieldAlert } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { inactivateAthlete } from "@/app/(admin)/admin/atletas/actions";
import { saveAthleteSchool } from "@/app/(admin)/admin/atletas/[id]/escola/actions";
import { saveAthleteMedicalInfo } from "@/app/(admin)/admin/atletas/[id]/medico/actions";
import {
  linkAthleteToClass,
  unlinkAthleteFromClass,
} from "@/app/(admin)/admin/turmas/actions";
import {
  removeAthleteGuardian,
  updateAthleteGuardian,
} from "@/app/(admin)/admin/responsaveis/actions";
import {
  cancelMonthlyFee,
  createMonthlyFee,
  markMonthlyFeeExempt,
  registerPayment,
  updateAthleteMonthlyFeeAmount,
} from "@/app/(admin)/admin/mensalidades/actions";
import { AthleteTabs } from "@/components/app/athlete-tabs";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { AthleteDocumentsTab } from "@/components/app/athlete-documents-tab";
import { PersonAvatar } from "@/components/app/person-avatar";
import { SurgeryFields } from "@/components/app/surgery-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import type { AttendanceStatus } from "@prisma/client";
import {
  athleteStatusLabels,
  calculateAge,
  formatDate,
  genderLabels,
  isMinor,
} from "@/lib/athletes";
import { relationshipLabel, relationshipOptions } from "@/lib/guardians";
import {
  canManageAthletes,
  canManageGuardians,
  canManageMedicalInfo,
  canViewAthletes,
  canViewFullGuardianData,
  canViewFullMedicalInfo,
  canViewMedicalSummary,
  canManageTrainingStructure,
  canViewTrainingStructure,
  canViewAttendance,
  canViewCompetitions,
  canManageMonthlyFees,
  canViewMonthlyFees,
} from "@/lib/permissions";
import {
  canManageDocuments,
  canViewDocumentSummary,
  canViewFullDocuments,
  currentReferenceYear,
  documentStatusOptions,
} from "@/lib/documents";
import { getPrisma } from "@/lib/prisma";
import { attendanceStatusLabel, attendanceStatusOptions } from "@/lib/attendance";
import { athleteClassStatusLabel, athleteClassStatusOptions, weekdayLabel } from "@/lib/training";
import {
  competitionAthleteStatusClass,
  competitionAthleteStatusLabel,
  medalLabel,
} from "@/lib/competitions";
import {
  effectiveMonthlyFeeStatus,
  formatCurrency,
  monthlyFeeStatusClass,
  monthlyFeeStatusLabel,
  monthlyFeeStatusOptions,
  outstandingAmount,
  paidAmount,
  paymentMethodLabel,
  paymentMethodOptions,
} from "@/lib/finance";

type AthleteDetails = Prisma.AthleteGetPayload<{
  include: {
    address: true;
    guardians: {
      include: { guardian: true };
    };
    schools: {
      include: { school: { include: { address: true } } };
    };
    medicalInfo: {
      include: {
        doctor: { include: { address: true } };
        surgeries: true;
      };
    };
    classes: {
      include: {
        trainingClass: {
          include: {
            modality: true;
            trainingLocation: true;
            teacher: true;
            assistants: { include: { staffMember: true } };
            schedules: true;
          };
        };
      };
    };
    competitions: {
      include: {
        competition: { include: { modality: true } };
      };
    };
    monthlyFees: {
      include: {
        financialGuardian: true;
        payments: true;
      };
    };
  };
}>;

type AthleteAttendanceRow = Prisma.AttendanceGetPayload<{
  include: {
    trainingClass: { include: { modality: true } };
    recordedByUser: true;
  };
}>;

type AttendanceClassOption = {
  id: string;
  name: string;
};

type GuardianLink = AthleteDetails["guardians"][number];

const schoolGradeOptions = [
  "Ensino Infantil",
  "1Âº ano do Ensino Fundamental I",
  "2Âº ano do Ensino Fundamental I",
  "3Âº ano do Ensino Fundamental I",
  "4Âº ano do Ensino Fundamental I",
  "5Âº ano do Ensino Fundamental I",
  "6Âº ano do Ensino Fundamental II",
  "7Âº ano do Ensino Fundamental II",
  "8Âº ano do Ensino Fundamental II",
  "9Âº ano do Ensino Fundamental II",
  "1Âº ano do Ensino Médio",
  "2Âº ano do Ensino Médio",
  "3Âº ano do Ensino Médio",
  "Ensino Especial",
];

const schoolShiftOptions = [
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "rarde" },
  { value: "full_time", label: "Integral" },
  { value: "night", label: "Noite" },
  { value: "not_informed", label: "Não informado" },
];

const schoolTypeOptions = [
  { value: "not_informed", label: "Não informado" },
  { value: "public", label: "rública" },
  { value: "private", label: "rrivada" },
  { value: "special", label: "Especial" },
  { value: "other", label: "Outra" },
];

type AtletaDetalhesPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    aba?: string;
    turma?: string;
    dataInicial?: string;
    dataFinal?: string;
    status?: string;
    ano?: string;
    documentoStatus?: string;
    tipoDocumento?: string;
    erro?: string;
  }>;
};

export default async function AtletaDetalhesrage({
  params,
  searchParams,
}: AtletaDetalhesPageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewAthletes(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const athlete = await getPrisma().athlete.findUnique({
    where: { id },
    include: {
      address: true,
      guardians: {
        include: { guardian: true },
        orderBy: { createdAt: "asc" },
      },
      schools: {
        include: { school: { include: { address: true } } },
        orderBy: [{ isCurrent: "desc" }, { startedAt: "desc" }],
      },
      medicalInfo: {
        include: {
          doctor: { include: { address: true } },
          surgeries: { orderBy: { surgeryDate: "desc" } },
        },
      },
      classes: {
        include: {
          trainingClass: {
            include: {
              modality: true,
              trainingLocation: true,
              teacher: true,
              assistants: { include: { staffMember: true } },
              schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      competitions: {
        include: { competition: { include: { modality: true } } },
        orderBy: { createdAt: "desc" },
      },
      monthlyFees: {
        include: {
          financialGuardian: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
        orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
      },
    },
  });

  if (!athlete) {
    redirect("/admin/atletas");
  }

  const age = calculateAge(athlete.birthDate);
  const minor = isMinor(athlete.birthDate);
  const canManage = canManageAthletes(user.role);
  const canManageResponsible = canManageGuardians(user.role);
  const canViewFullGuardian = canViewFullGuardianData(user.role);
  const canManageMedical = canManageMedicalInfo(user.role);
  const canViewMedical = canViewMedicalSummary(user.role);
  const canViewFullMedical = canViewFullMedicalInfo(user.role);
  const canManageClasses = canManageTrainingStructure(user.role);
  const canViewClasses = canViewTrainingStructure(user.role);
  const canViewPresence = canViewAttendance(user.role);
  const canViewAthleteCompetitions = canViewCompetitions(user.role);
  const canManageFinance = canManageMonthlyFees(user.role);
  const canViewFinance = canViewMonthlyFees(user.role);
  const canManageDocumentos = canManageDocuments(user.role);
  const canViewDocumentos = canViewDocumentSummary(user.role);
  const canViewFullDocumentos = canViewFullDocuments(user.role);
  const availableClasses = canManageClasses
    ? await getPrisma().trainingClass.findMany({
        where: { isActive: true },
        include: { modality: true, trainingLocation: true },
        orderBy: { name: "asc" },
      })
    : [];
  const attendanceFilters = buildAttendanceFilters(query);
  const attendanceWhere: Prisma.AttendanceWhereInput = {
    athleteId: athlete.id,
    ...(attendanceFilters.trainingClassId
      ? { trainingClassId: attendanceFilters.trainingClassId }
      : {}),
    ...(attendanceFilters.status
      ? { status: attendanceFilters.status as AttendanceStatus }
      : {}),
    ...(attendanceFilters.dateFrom || attendanceFilters.dateTo
      ? {
          attendanceDate: {
            ...(attendanceFilters.dateFrom ? { gte: attendanceFilters.dateFrom } : {}),
            ...(attendanceFilters.dateTo ? { lte: attendanceFilters.dateTo } : {}),
          },
        }
      : {}),
  };
  const [attendanceRows, attendanceClassRows] = canViewPresence
    ? await Promise.all([
        getPrisma().attendance.findMany({
          where: attendanceWhere,
          include: {
            trainingClass: { include: { modality: true } },
            recordedByUser: true,
          },
          orderBy: { attendanceDate: "desc" },
        }),
        getPrisma().attendance.findMany({
          where: { athleteId: athlete.id },
          include: { trainingClass: true },
          distinct: ["trainingClassId"],
          orderBy: { trainingClass: { name: "asc" } },
        }),
      ])
    : [[], []];
  const attendanceClassOptions = Array.from(
    new Map(
      [
        ...athlete.classes.map((link) => [
          link.trainingClassId,
          { id: link.trainingClassId, name: link.trainingClass.name },
        ]),
        ...attendanceClassRows.map((row) => [
          row.trainingClassId,
          { id: row.trainingClassId, name: row.trainingClass.name },
        ]),
      ].map(([id, value]) => [id, value as AttendanceClassOption])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const documentFilters = buildDocumentFilters(query);
  const documentWhere: Prisma.AthleteDocumentWhereInput = {
    athleteId: athlete.id,
    ...(documentFilters.referenceYear
      ? { referenceYear: documentFilters.referenceYear }
      : {}),
    ...(documentFilters.status ? { status: documentFilters.status } : {}),
    ...(documentFilters.documentTypeId
      ? { documentTypeId: documentFilters.documentTypeId }
      : {}),
  };
  const [documentTypes, athleteDocuments] = canViewDocumentos
    ? await Promise.all([
        getPrisma().documentType.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
        getPrisma().athleteDocument.findMany({
          where: documentWhere,
          include: {
            documentType: true,
            uploadedByUser: true,
            reviewedByUser: true,
          },
          orderBy: [{ referenceYear: "desc" }, { createdAt: "desc" }],
        }),
      ])
    : [[], []];
  const activeTab = query.aba ?? "dados";
  const visibleGuardianLinks = athlete.guardians.filter((link) => {
    if (user.role === "PROFESSOR" || user.role === "ASSISTENTE") {
      return link.isEmergencyContact;
    }

    if (user.role === "FINANCEIRO") {
      return link.isFinancialGuardian;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            {athlete.fullName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Detalhes básicos do atleta no sistema interno da JR.
          </p>
          {minor ? (
            <span className="mt-3 inline-flex items-center gap-2 rounded-md bg-jr-red/10 px-3 py-2 text-sm font-bold text-jr-red">
              <ShieldAlert className="size-4" aria-hidden="true" />
              Atleta menor de idade
            </span>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/admin/atletas/${athlete.id}/editar`}>
                <Edit className="size-4" aria-hidden="true" />
                Editar
              </Link>
            </Button>
            {athlete.status !== "inactive" ? (
              <form action={inactivateAthlete}>
                <input type="hidden" name="athleteId" value={athlete.id} />
                <Button type="submit" variant="ghost">
                  Inativar
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      <AthleteTabs athleteId={athlete.id} activeTab={activeTab} />

      {activeTab === "responsaveis" ? (
        <Responsiblerab
          athlete={athlete}
          links={visibleGuardianLinks}
          canManage={canManageResponsible}
          canViewFull={canViewFullGuardian}
        />
      ) : activeTab === "dados" ? (
        <GeneralDatarab athlete={athlete} age={age} />
      ) : activeTab === "escola" ? (
        <Schoolrab athlete={athlete} canManage={canManage} />
      ) : activeTab === "medico" ? (
        <Medicalrab
          athlete={athlete}
          canManage={canManageMedical}
          canViewMedical={canViewMedical}
          canViewFull={canViewFullMedical}
        />
      ) : activeTab === "turmas" ? (
        <Classesrab
          athlete={athlete}
          availableClasses={availableClasses}
          canManage={canManageClasses}
          canView={canViewClasses}
        />
      ) : activeTab === "presenca" ? (
        <AttendanceTab
          athlete={athlete}
          canView={canViewPresence}
          attendances={attendanceRows}
          classOptions={attendanceClassOptions}
          filters={attendanceFilters}
        />
      ) : activeTab === "documentos" ? (
        <AthleteDocumentsTab
          athlete={athlete}
          documentTypes={documentTypes}
          documents={athleteDocuments}
          filters={documentFilters}
          canManage={canManageDocumentos}
          canView={canViewDocumentos}
          canViewFull={canViewFullDocumentos}
        />
      ) : activeTab === "competicoes" ? (
        <AthleteCompetitionsTab
          athlete={athlete}
          canView={canViewAthleteCompetitions}
        />
      ) : activeTab === "financeiro" ? (
        <AthleteFinanceTab
          athlete={athlete}
          canView={canViewFinance}
          canManage={canManageFinance}
        />
      ) : (
        <PlaceholderTab />
      )}
    </div>
  );
}

function GeneralDatarab({
  athlete,
  age,
}: {
  athlete: AthleteDetails;
  age: number;
}) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Foto 3x4</CardTitle>
          </CardHeader>
          <CardContent>
            <AthleteAvatar
              name={athlete.fullName}
              photoUrl={athlete.photoUrl}
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Status" value={athleteStatusLabels[athlete.status]} />
            <Info label="Nome social / apelido" value={athlete.preferredName ?? "-"} />
            <Info label="Idade" value={`${age} anos`} />
            <Info label="Nascimento" value={formatDate(athlete.birthDate)} />
            <Info label="Entrada na JR" value={formatDate(athlete.joinedAt)} />
            <Info label="CrF" value={athlete.cpf ?? "-"} />
            <Info label="RG" value={athlete.rg ?? "-"} />
            <Info label="Telefone" value={athlete.phone ?? "-"} />
            <Info label="E-mail" value={athlete.email ?? "-"} />
            <Info
              label="Sexo"
              value={athlete.gender ? genderLabels[athlete.gender] : "-"}
            />
            <Info label="ObservaçÃµes" value={athlete.notes ?? "-"} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="CEr" value={athlete.address?.postalCode ?? "-"} />
          <Info label="Rua" value={athlete.address?.street ?? "-"} />
          <Info label="Número" value={athlete.address?.number ?? "-"} />
          <Info label="Complemento" value={athlete.address?.complement ?? "-"} />
          <Info label="Bairro" value={athlete.address?.neighborhood ?? "-"} />
          <Info label="Cidade" value={athlete.address?.city ?? "-"} />
          <Info label="Estado" value={athlete.address?.state ?? "-"} />
        </CardContent>
      </Card>
    </>
  );
}

function Schoolrab({
  athlete,
  canManage,
}: {
  athlete: AthleteDetails;
  canManage: boolean;
}) {
  const currentSchool = athlete.schools.find((link) => link.isCurrent);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumo escolar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Escola" value={currentSchool?.school.name ?? "-"} />
          <Info
            label="ripo da escola"
            value={schoolTypeLabel(currentSchool?.school.schoolType)}
          />
          <Info label="Série/Ano" value={currentSchool?.grade ?? "-"} />
          <Info label="rurno" value={schoolShiftLabel(currentSchool?.shift)} />
          <Info
            label="MatrÃ­cula escolar"
            value={currentSchool?.enrollmentNumber ?? "-"}
          />
          <Info label="Telefone da escola" value={currentSchool?.school.phone ?? "-"} />
          <Info label="E-mail da escola" value={currentSchool?.school.email ?? "-"} />
          <Info label="InÃ­cio" value={formatDate(currentSchool?.startedAt)} />
          <Info label="Fim" value={formatDate(currentSchool?.endedAt)} />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>{currentSchool ? "Editar escola" : "Cadastrar escola"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveAthleteSchool} className="space-y-6">
              <input type="hidden" name="athleteId" value={athlete.id} />
              {currentSchool ? (
                <input
                  type="hidden"
                  name="athleteSchoolId"
                  value={currentSchool.id}
                />
              ) : null}

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                  Dados da escola
                </h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="schoolName">Nome da escola</Label>
                    <Input
                      id="schoolName"
                      name="schoolName"
                      defaultValue={currentSchool?.school.name ?? ""}
                      required
                    />
                  </div>
                  <SelectInput
                    label="ripo da escola"
                    name="schoolType"
                    value={currentSchool?.school.schoolType}
                    options={schoolTypeOptions}
                  />
                  <TextInput
                    label="Telefone da escola"
                    name="schoolPhone"
                    value={currentSchool?.school.phone}
                  />
                  <TextInput
                    label="E-mail da escola"
                    name="schoolEmail"
                    value={currentSchool?.school.email}
                  />
                  <TextareaInput
                    label="ObservaçÃµes da escola"
                    name="schoolGeneralNotes"
                    value={currentSchool?.school.notes}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                  Endereço da escola
                </h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="CEr"
                    name="schoolrostalCode"
                    value={currentSchool?.school.address?.postalCode}
                  />
                  <TextInput
                    label="Rua"
                    name="schoolStreet"
                    value={currentSchool?.school.address?.street}
                  />
                  <TextInput
                    label="Número"
                    name="schoolNumber"
                    value={currentSchool?.school.address?.number}
                  />
                  <TextInput
                    label="Complemento"
                    name="schoolComplement"
                    value={currentSchool?.school.address?.complement}
                  />
                  <TextInput
                    label="Bairro"
                    name="schoolNeighborhood"
                    value={currentSchool?.school.address?.neighborhood}
                  />
                  <TextInput
                    label="Cidade"
                    name="schoolCity"
                    value={currentSchool?.school.address?.city}
                  />
                  <TextInput
                    label="Estado"
                    name="schoolState"
                    value={currentSchool?.school.address?.state}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                  Dados do atleta na escola
                </h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="Número da matrÃ­cula escolar"
                    name="enrollmentNumber"
                    value={currentSchool?.enrollmentNumber}
                  />
                  <SelectInput
                    label="Série/Ano"
                    name="grade"
                    value={currentSchool?.grade}
                    options={schoolGradeOptions}
                  />
                  <SelectInput
                    label="rurno"
                    name="shift"
                    value={currentSchool?.shift}
                    options={schoolShiftOptions}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="startedAt">Data de inÃ­cio</Label>
                    <Input
                      id="startedAt"
                      name="startedAt"
                      type="date"
                      defaultValue={toDateInputValue(currentSchool?.startedAt)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endedAt">Data de fim</Label>
                    <Input
                      id="endedAt"
                      name="endedAt"
                      type="date"
                      defaultValue={toDateInputValue(currentSchool?.endedAt)}
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 md:col-span-2">
                    <input
                      type="checkbox"
                      name="isCurrent"
                      defaultChecked={currentSchool?.isCurrent ?? true}
                      className="size-4 rounded border-zinc-300 accent-jr-red"
                    />
                    Escola atual do atleta
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                  Contatos da escola
                </h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="Nome da coordenadora"
                    name="coordinatorName"
                    value={currentSchool?.school.coordinatorName}
                  />
                  <TextInput
                    label="Telefone da coordenadora"
                    name="coordinatorPhone"
                    value={currentSchool?.school.coordinatorPhone}
                  />
                  <TextInput
                    label="E-mail da coordenadora"
                    name="coordinatorEmail"
                    value={currentSchool?.school.coordinatorEmail}
                  />
                  <TextInput
                    label="Nome do professor/contato pedagógico"
                    name="pedagogicalContactName"
                    value={currentSchool?.school.pedagogicalContactName}
                  />
                  <TextInput
                    label="Telefone do professor/contato pedagógico"
                    name="pedagogicalContactPhone"
                    value={currentSchool?.school.pedagogicalContactPhone}
                  />
                  <TextInput
                    label="E-mail do professor/contato pedagógico"
                    name="pedagogicalContactEmail"
                    value={currentSchool?.school.pedagogicalContactEmail}
                  />
                  <TextInput
                    label="Cargo/função do contato"
                    name="pedagogicalContactRole"
                    value={currentSchool?.school.pedagogicalContactRole}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                  Apoio / Ar
                </h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="Nome do Ar"
                    name="therapeuticCompanionName"
                    value={currentSchool?.therapeuticCompanionName}
                  />
                  <TextInput
                    label="Telefone do Ar"
                    name="therapeuticCompanionPhone"
                    value={currentSchool?.therapeuticCompanionPhone}
                  />
                  <TextInput
                    label="E-mail do Ar"
                    name="therapeuticCompanionEmail"
                    value={currentSchool?.therapeuticCompanionEmail}
                  />
                  <TextareaInput
                    label="ObservaçÃµes do Ar"
                    name="therapeuticCompanionNotes"
                    value={currentSchool?.therapeuticCompanionNotes}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                  ObservaçÃµes
                </h3>
                <TextareaInput
                  label="ObservaçÃµes escolares do atleta"
                  name="schoolNotes"
                  value={currentSchool?.schoolNotes}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  {currentSchool ? "Salvar escola" : "Cadastrar escola"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function schoolTypeLabel(value: string | null | undefined) {
  return schoolTypeOptions.find((option) => option.value === value)?.label ?? "-";
}

function schoolShiftLabel(value: string | null | undefined) {
  return schoolShiftOptions.find((option) => option.value === value)?.label ?? "-";
}

function Medicalrab({
  athlete,
  canManage,
  canViewMedical,
  canViewFull,
}: {
  athlete: AthleteDetails;
  canManage: boolean;
  canViewMedical: boolean;
  canViewFull: boolean;
}) {
  const medicalInfo = athlete.medicalInfo;
  const missingEmergencyContact =
    !medicalInfo?.emergencyMedicalContact || !medicalInfo?.emergencyMedicalPhone;

  if (!canViewMedical) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-zinc-600">
            Seu perfil não possui permissão para visualizar dados médicos deste
            atleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {missingEmergencyContact ? (
          <Badge className="border-zinc-300 bg-zinc-100 text-zinc-800">
            Sem contato médico/emergÃªncia
          </Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo para treino</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info
            label="Apto para atividade fÃ­sica"
            value={fitLabel(medicalInfo?.isFitForPhysicalActivity)}
          />
          <Info
            label="RestriçÃµes para treino"
            value={medicalInfo?.physicalRestrictions ?? "-"}
          />
          <Info label="Alergias relevantes" value={medicalInfo?.allergies ?? "-"} />
          <Info
            label="Contato de emergÃªncia"
            value={medicalInfo?.emergencyMedicalContact ?? "-"}
          />
          <Info
            label="Telefone de emergÃªncia"
            value={medicalInfo?.emergencyMedicalPhone ?? "-"}
          />
        </CardContent>
      </Card>

      {canViewFull ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Médico principal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Nome" value={medicalInfo?.doctor?.fullName ?? "-"} />
              <Info
                label="Especialidade"
                value={medicalInfo?.doctor?.specialty ?? "-"}
              />
              <Info label="CRM" value={medicalInfo?.doctor?.crm ?? "-"} />
              <Info label="Telefone" value={medicalInfo?.doctor?.phone ?? "-"} />
              <Info label="E-mail" value={medicalInfo?.doctor?.email ?? "-"} />
              <Info
                label="ClÃ­nica/Hospital"
                value={medicalInfo?.doctor?.clinicName ?? "-"}
              />
              <Info label="Cidade" value={medicalInfo?.doctor?.address?.city ?? "-"} />
              <Info label="Estado" value={medicalInfo?.doctor?.address?.state ?? "-"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>InformaçÃµes de saúde</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info
                label="Medicamentos de uso contÃ­nuo"
                value={medicalInfo?.continuousMedication ?? "-"}
              />
              <Info
                label="Condição/observação relevante para treino"
                value={medicalInfo?.trainingNotes ?? "-"}
              />
              <Info
                label="ObservaçÃµes médicas internas"
                value={medicalInfo?.internalMedicalNotes ?? "-"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cirurgias</CardTitle>
            </CardHeader>
            <CardContent>
              {medicalInfo?.surgeries.length ? (
                <div className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
                  {medicalInfo.surgeries.map((surgery) => (
                    <div
                      key={surgery.id}
                      className="grid gap-2 p-4 sm:grid-cols-[1fr_180px]"
                    >
                      <Info label="Cirurgia" value={surgery.name} />
                      <Info
                        label="Data"
                        value={formatDate(surgery.surgeryDate)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-zinc-600">
                  Nenhuma cirurgia informada.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {canManage ? <MedicalForm athlete={athlete} /> : null}
    </div>
  );
}

function MedicalForm({ athlete }: { athlete: AthleteDetails }) {
  const medicalInfo = athlete.medicalInfo;
  const doctor = medicalInfo?.doctor;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Médico/Saúde</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={saveAthleteMedicalInfo} className="space-y-6">
          <input type="hidden" name="athleteId" value={athlete.id} />

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              Médico principal
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput label="Nome do médico" name="doctorName" value={doctor?.fullName} />
              <TextInput
                label="Especialidade"
                name="doctorSpecialty"
                value={doctor?.specialty}
              />
              <TextInput label="CRM" name="doctorCrm" value={doctor?.crm} />
              <TextInput label="Telefone" name="doctorPhone" value={doctor?.phone} />
              <TextInput label="E-mail" name="doctorEmail" value={doctor?.email} />
              <TextInput
                label="ClÃ­nica/Hospital"
                name="doctorClinicName"
                value={doctor?.clinicName}
              />
              <TextInput
                label="CEr"
                name="doctorrostalCode"
                value={doctor?.address?.postalCode}
              />
              <TextInput label="Rua" name="doctorStreet" value={doctor?.address?.street} />
              <TextInput
                label="Número"
                name="doctorNumber"
                value={doctor?.address?.number}
              />
              <TextInput
                label="Complemento"
                name="doctorComplement"
                value={doctor?.address?.complement}
              />
              <TextInput
                label="Bairro"
                name="doctorNeighborhood"
                value={doctor?.address?.neighborhood}
              />
              <TextInput label="Cidade" name="doctorCity" value={doctor?.address?.city} />
              <TextInput label="Estado" name="doctorState" value={doctor?.address?.state} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              InformaçÃµes de saúde
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <TextareaInput
                label="RestriçÃµes para atividade fÃ­sica"
                name="physicalRestrictions"
                value={medicalInfo?.physicalRestrictions}
              />
              <TextareaInput
                label="Alergias relevantes"
                name="allergies"
                value={medicalInfo?.allergies}
              />
              <TextareaInput
                label="Medicamentos de uso contÃ­nuo"
                name="continuousMedication"
                value={medicalInfo?.continuousMedication}
              />
              <TextareaInput
                label="Condição/observação relevante para treino"
                name="trainingNotes"
                value={medicalInfo?.trainingNotes}
              />
              <TextInput
                label="Contato de emergÃªncia médica"
                name="emergencyMedicalContact"
                value={medicalInfo?.emergencyMedicalContact}
              />
              <TextInput
                label="Telefone de emergÃªncia médica"
                name="emergencyMedicalPhone"
                value={medicalInfo?.emergencyMedicalPhone}
              />
            </div>
          </div>

          <SurgeryFields surgeries={medicalInfo?.surgeries ?? []} />

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              Resumo para treino
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <SelectInput
                label="Atleta apto para atividade fÃ­sica"
                name="isFitForPhysicalActivity"
                value={booleanSelectValue(medicalInfo?.isFitForPhysicalActivity)}
                options={[
                  { value: "not_informed", label: "Não informado" },
                  { value: "true", label: "Sim" },
                  { value: "false", label: "Não" },
                ]}
              />
              <TextareaInput
                label="ObservaçÃµes médicas internas"
                name="internalMedicalNotes"
                value={medicalInfo?.internalMedicalNotes}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Salvar dados médicos</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function fitLabel(value: boolean | null | undefined) {
  if (value === true) {
    return "Sim";
  }

  if (value === false) {
    return "Não";
  }

  return "Não informado";
}

function booleanSelectValue(value: boolean | null | undefined) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "not_informed";
}

type AvailableClass = {
  id: string;
  name: string;
  modality: { name: string };
  trainingLocation: { name: string };
};

function Classesrab({
  athlete,
  availableClasses,
  canManage,
  canView,
}: {
  athlete: AthleteDetails;
  availableClasses: AvailableClass[];
  canManage: boolean;
  canView: boolean;
}) {
  const activeLinkedClassIds = new Set(
    athlete.classes
      .filter((link) => link.status !== "inactive")
      .map((link) => link.trainingClassId)
  );
  const classOptions = availableClasses.filter(
    (trainingClass) => !activeLinkedClassIds.has(trainingClass.id)
  );

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-zinc-600">
            Seu perfil não possui permissão para visualizar turmas deste atleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Turmas vinculadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {athlete.classes.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">
              Nenhuma turma vinculada.
            </p>
          ) : null}
          {athlete.classes.map((link) => (
            <div
              key={link.id}
              className="rounded-md border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h3 className="text-base font-black text-zinc-950">
                    {link.trainingClass.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-zinc-700">
                    {link.trainingClass.modality.name} •{" "}
                    {link.trainingClass.trainingLocation.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Treinador: {link.trainingClass.teacher.fullName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Assistentes:{" "}
                    {link.trainingClass.assistants
                      .map((assistant) => assistant.staffMember.fullName)
                      .join(", ") || "-"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Horários:{" "}
                    {link.trainingClass.schedules
                      .map(
                        (schedule) =>
                          `${weekdayLabel(schedule.weekday)} ${schedule.startTime}-${schedule.endTime}`
                      )
                      .join("; ") || "-"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Entrada: {formatDate(link.joinedAt)}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Badge>{athleteClassStatusLabel(link.status)}</Badge>
                  {canManage && link.status !== "inactive" ? (
                    <form action={unlinkAthleteFromClass}>
                      <input type="hidden" name="athleteId" value={athlete.id} />
                      <input type="hidden" name="athleteClassId" value={link.id} />
                      <Button type="submit" variant="ghost">
                        Inativar vínculo
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Vincular novas turmas</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={linkAthleteToClass} className="grid gap-5 md:grid-cols-2">
              <input type="hidden" name="athleteId" value={athlete.id} />
              <div className="space-y-3 md:col-span-2">
                <Label>Turmas disponíveis</Label>
                {classOptions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">
                    Todas as turmas ativas já estão vinculadas a este atleta.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {classOptions.map((trainingClass) => (
                      <label
                        key={trainingClass.id}
                        className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-800"
                      >
                        <input
                          type="checkbox"
                          name="trainingClassId"
                          value={trainingClass.id}
                          className="mt-0.5 size-4 rounded border-zinc-300 accent-jr-red"
                        />
                        <span>
                          <span className="block font-black text-zinc-950">
                            {trainingClass.name}
                          </span>
                          <span className="block text-xs text-zinc-600">
                            {trainingClass.modality.name} •{" "}
                            {trainingClass.trainingLocation.name}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="classJoinedAt">Data de entrada</Label>
                <Input id="classJoinedAt" name="joinedAt" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classStatus">Status</Label>
                <select
                  id="classStatus"
                  name="status"
                  defaultValue="active"
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
                >
                  {athleteClassStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="classNotes">Observações do vínculo</Label>
                <textarea
                  id="classNotes"
                  name="notes"
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
                />
              </div>
              <div className="flex justify-end md:col-span-2">
                <Button type="submit" disabled={classOptions.length === 0}>
                  Vincular turmas
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function parseFilterDate(value: string | undefined, endOfDay = false) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function buildAttendanceFilters(query: {
  turma?: string;
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
}) {
  const dateFrom = parseFilterDate(query.dataInicial);
  const rawDateTo = parseFilterDate(query.dataFinal, true);
  const dateTo = dateFrom && rawDateTo && rawDateTo < dateFrom ? null : rawDateTo;
  const status =
    query.status && query.status !== "all"
      ? attendanceStatusOptions.find((option) => option.value === query.status)?.value
      : null;

  return {
    trainingClassId: query.turma || null,
    dateFrom,
    dateTo,
    status,
    dataInicial: query.dataInicial ?? "",
    dataFinal: dateTo ? query.dataFinal ?? "" : "",
    rawDataFinal: query.dataFinal ?? "",
    hasInvalidDateRange: Boolean(dateFrom && rawDateTo && rawDateTo < dateFrom),
  };
}

function buildDocumentFilters(query: {
  ano?: string;
  documentoStatus?: string;
  tipoDocumento?: string;
  erro?: string;
}) {
  const parsedYear = query.ano ? Number.parseInt(query.ano, 10) : Number.NaN;
  const referenceYear = Number.isFinite(parsedYear)
    ? parsedYear
    : currentReferenceYear();
  const status =
    query.documentoStatus && query.documentoStatus !== "all"
      ? documentStatusOptions.find(
          (option) => option.value === query.documentoStatus
        )?.value
      : null;

  return {
    referenceYear,
    status,
    documentTypeId: query.tipoDocumento || null,
    ano: String(referenceYear),
    documentoStatus: query.documentoStatus ?? "all",
    tipoDocumento: query.tipoDocumento ?? "",
    erro: query.erro ?? "",
  };
}

function AttendanceTab({
  athlete,
  canView,
  attendances,
  classOptions,
  filters,
}: {
  athlete: AthleteDetails;
  canView: boolean;
  attendances: AthleteAttendanceRow[];
  classOptions: AttendanceClassOption[];
  filters: ReturnType<typeof buildAttendanceFilters>;
}) {
  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-zinc-600">
            Seu perfil não possui permissão para visualizar presença deste atleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = attendances.length;
  const present = attendances.filter((item) => item.status === "present").length;
  const partial = attendances.filter((item) => item.status === "partial").length;
  const absences = attendances.filter((item) => item.status === "absent").length;
  const justifiedAbsences = attendances.filter(
    (item) => item.status === "justified_absence"
  ).length;
  const attendancePercentage =
    total > 0 ? Math.round(((present + partial) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de presença</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5">
            <input type="hidden" name="aba" value="presenca" />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="turma">Turma</Label>
              <select
                id="turma"
                name="turma"
                defaultValue={filters.trainingClassId ?? ""}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="">Todas as turmas</option>
                {classOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataInicial">Data inicial</Label>
              <Input
                id="dataInicial"
                name="dataInicial"
                type="date"
                defaultValue={filters.dataInicial}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFinal">Data final</Label>
              <Input
                id="dataFinal"
                name="dataFinal"
                type="date"
                defaultValue={filters.rawDataFinal}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status ?? "all"}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                <option value="all">Todos</option>
                {attendanceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {filters.hasInvalidDateRange ? (
              <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red md:col-span-5">
                Data final não pode ser anterior à data inicial.
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 md:col-span-5 md:justify-end">
              <Button asChild variant="secondary">
                <Link href={`/admin/atletas/${athlete.id}?aba=presenca`}>
                  Limpar filtros
                </Link>
              </Button>
              <Button type="submit">Filtrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total de registros" value={String(total)} />
        <SummaryCard label="Presenças" value={String(present + partial)} />
        <SummaryCard label="Faltas" value={String(absences)} />
        <SummaryCard label="Faltas justificadas" value={String(justifiedAbsences)} />
        <SummaryCard label="Percentual de presença" value={`${attendancePercentage}%`} />
      </div>

    <Card>
      <CardHeader>
        <CardTitle>Histórico de presença</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Modalidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Observação</th>
              <th className="px-4 py-3">Registrado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {attendances.map((attendance) => (
              <tr key={attendance.id}>
                <td className="px-4 py-3">
                  {attendance.attendanceDate.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 font-bold text-zinc-950">
                  {attendance.trainingClass.name}
                </td>
                <td className="px-4 py-3">
                  {attendance.trainingClass.modality.name}
                </td>
                <td className="px-4 py-3">
                  <Badge>{attendanceStatusLabel(attendance.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {attendance.notes ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {attendance.recordedByUser?.name ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendances.length === 0 ? (
          <div className="p-4 text-sm font-semibold text-zinc-600">
            Nenhum registro de presença encontrado.
          </div>
        ) : null}
      </CardContent>
    </Card>
    </div>
  );
}

function AthleteCompetitionsTab({
  athlete,
  canView,
}: {
  athlete: AthleteDetails;
  canView: boolean;
}) {
  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-zinc-600">
            Seu perfil não possui permissão para visualizar competições deste atleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de competições</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3">Competição</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Modalidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Medalha</th>
              <th className="px-4 py-3">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {athlete.competitions.map((link) => (
              <tr key={link.id}>
                <td className="px-4 py-3 font-bold text-zinc-950">
                  <Link href={`/admin/competicoes/${link.competitionId}`}>
                    {link.competition.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {formatDate(link.competition.startsAt)}
                </td>
                <td className="px-4 py-3">
                  {link.competition.modality?.name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <Badge className={competitionAthleteStatusClass(link.status)}>
                    {competitionAthleteStatusLabel(link.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">{link.result ?? "-"}</td>
                <td className="px-4 py-3">{medalLabel(link.medal)}</td>
                <td className="px-4 py-3 text-zinc-600">{link.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {athlete.competitions.length === 0 ? (
          <div className="p-6 text-sm font-semibold text-zinc-600">
            Nenhuma competição registrada para este atleta.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AthleteFinanceTab({
  athlete,
  canView,
  canManage,
}: {
  athlete: AthleteDetails;
  canView: boolean;
  canManage: boolean;
}) {
  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-zinc-600">
            Seu perfil não possui permissão para visualizar financeiro deste atleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  const financialGuardians = athlete.guardians.filter(
    (link) => link.isFinancialGuardian
  );
  const defaultMonthlyFee = athlete.monthlyFeeAmount;

  return (
    <div className="space-y-4">
      {financialGuardians.length === 0 ? (
        <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red">
          Atleta sem responsável financeiro cadastrado.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Resumo financeiro</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info
            label="Responsável financeiro principal"
            value={financialGuardians[0]?.guardian.fullName ?? "-"}
          />
          <Info
            label="Valor mensal padrão"
            value={defaultMonthlyFee ? formatCurrency(defaultMonthlyFee) : "-"}
          />
          <Info
            label="Mensalidades"
            value={String(athlete.monthlyFees.length)}
          />
          <Info
            label="Saldo em aberto"
            value={formatCurrency(
              athlete.monthlyFees.reduce(
                (total, fee) => total + outstandingAmount(fee).toNumber(),
                0
              )
            )}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Valor mensal combinado</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAthleteMonthlyFeeAmount} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="athleteId" value={athlete.id} />
              <TextInput
                label="Valor da mensalidade do atleta"
                name="monthlyFeeAmount"
                value={
                  athlete.monthlyFeeAmount
                    ? athlete.monthlyFeeAmount.toString().replace(".", ",")
                    : ""
                }
              />
              <Button type="submit">Salvar valor combinado</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Lançar mensalidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMonthlyFee} className="grid gap-4 md:grid-cols-3">
              <input type="hidden" name="athleteId" value={athlete.id} />
              <SelectInput
                label="Responsável financeiro"
                name="financialGuardianId"
                options={financialGuardians.map((link) => ({
                  value: link.guardianId,
                  label: link.guardian.fullName,
                }))}
              />
              <TextInput label="Mês" name="referenceMonth" value="" />
              <TextInput label="Ano" name="referenceYear" value={String(new Date().getFullYear())} />
              <TextInput
                label="Valor"
                name="amount"
                value={
                  athlete.monthlyFeeAmount
                    ? athlete.monthlyFeeAmount.toString().replace(".", ",")
                    : ""
                }
              />
              <TextInput label="Desconto" name="discountAmount" value="0,00" />
              <div className="space-y-2">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
              <SelectInput
                label="Status"
                name="status"
                value="open"
                options={monthlyFeeStatusOptions}
              />
              <TextareaInput label="Observações" name="notes" />
              <div className="flex justify-end md:col-span-3">
                <Button type="submit">Salvar mensalidade</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Histórico financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {athlete.monthlyFees.map((fee) => {
            const status = effectiveMonthlyFeeStatus(fee);
            const lastPayment = fee.payments[0];

            return (
              <div
                key={fee.id}
                className="rounded-md border border-zinc-200 bg-white p-4"
              >
                <div className="grid gap-3 lg:grid-cols-6">
                  <Info
                    label="Competência"
                    value={`${String(fee.referenceMonth).padStart(2, "0")}/${fee.referenceYear}`}
                  />
                  <Info label="Vencimento" value={formatDate(fee.dueDate)} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Status
                    </p>
                    <Badge className={monthlyFeeStatusClass(status)}>
                      {monthlyFeeStatusLabel(status)}
                    </Badge>
                  </div>
                  <Info label="Valor" value={formatCurrency(fee.amount)} />
                  <Info label="Pago" value={formatCurrency(paidAmount(fee.payments))} />
                  <Info label="Saldo" value={formatCurrency(outstandingAmount(fee))} />
                  <Info
                    label="Forma de pagamento"
                    value={lastPayment ? paymentMethodLabel(lastPayment.method) : "-"}
                  />
                  <Info
                    label="Responsável financeiro"
                    value={fee.financialGuardian?.fullName ?? "-"}
                  />
                  <Info label="Observações" value={fee.notes ?? "-"} />
                </div>

                {canManage ? (
                  <div className="mt-4 grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <form action={registerPayment} className="grid gap-3 md:grid-cols-5">
                      <input type="hidden" name="monthlyFeeId" value={fee.id} />
                      <input type="hidden" name="athleteId" value={athlete.id} />
                      <TextInput label="Valor pago" name="amountPaid" value="" />
                      <div className="space-y-2">
                        <Label htmlFor={`paidAt-${fee.id}`}>Data de pagamento</Label>
                        <Input id={`paidAt-${fee.id}`} name="paidAt" type="date" required />
                      </div>
                      <SelectInput
                        label="Forma"
                        name="paymentMethod"
                        value="not_informed"
                        options={paymentMethodOptions}
                      />
                      <TextInput label="Observações" name="paymentNotes" value="" />
                      <div className="flex items-end">
                        <Button type="submit" size="sm">Registrar pagamento</Button>
                      </div>
                    </form>
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={markMonthlyFeeExempt}>
                        <input type="hidden" name="monthlyFeeId" value={fee.id} />
                        <input type="hidden" name="athleteId" value={athlete.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          Marcar isento
                        </Button>
                      </form>
                      <form action={cancelMonthlyFee}>
                        <input type="hidden" name="monthlyFeeId" value={fee.id} />
                        <input type="hidden" name="athleteId" value={athlete.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Cancelar mensalidade
                        </Button>
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {athlete.monthlyFees.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">
              Nenhuma mensalidade lançada para este atleta.
            </p>
          ) : null}
        </CardContent>
      </Card>
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

function Responsiblerab({
  athlete,
  links,
  canManage,
  canViewFull,
}: {
  athlete: AthleteDetails;
  links: GuardianLink[];
  canManage: boolean;
  canViewFull: boolean;
}) {
  const hasLegalGuardian = athlete.guardians.some((link) => link.isLegalGuardian);
  const hasEmergencyContact = athlete.guardians.some(
    (link) => link.isEmergencyContact
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-2">
          {isMinor(athlete.birthDate) && !hasLegalGuardian ? (
            <Badge className="border-jr-red/25 bg-jr-red/10 text-jr-red">
              rendÃªncia: atleta menor sem responsável legal
            </Badge>
          ) : null}
          {athlete.status === "active" && !hasEmergencyContact ? (
            <Badge className="border-zinc-300 bg-zinc-100 text-zinc-800">
              Recomendado: cadastrar contato de emergÃªncia
            </Badge>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/admin/responsaveis/novo?athleteId=${athlete.id}`}>
                Novo responsável
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/admin/atletas/${athlete.id}/responsaveis/vincular`}>
                Vincular existente
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {links.map((link) => (
        <Card key={link.id}>
          <CardContent className="grid gap-4 pt-5 lg:grid-cols-[96px_1fr]">
            <PersonAvatar
              name={link.guardian.fullName}
              photoUrl={link.guardian.photoUrl}
              className="w-24"
            />
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h2 className="text-lg font-black text-zinc-950">
                    {link.guardian.fullName}
                  </h2>
                  <p className="text-sm font-semibold text-zinc-600">
                    {relationshipLabel(link.relationship)}
                  </p>
                </div>
                {canManage ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/admin/responsaveis/${link.guardian.id}/editar`}>
                      Editar dados
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Telefone" value={link.guardian.phone ?? "-"} />
                <Info
                  label="WhatsApp"
                  value={canViewFull ? link.guardian.whatsapp ?? "-" : "-"}
                />
                <Info
                  label="E-mail"
                  value={canViewFull ? link.guardian.email ?? "-" : "-"}
                />
                <Info
                  label="CrF"
                  value={canViewFull ? link.guardian.cpf ?? "-" : "-"}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {link.isLegalGuardian ? <Badge>Responsável legal</Badge> : null}
                {link.isFinancialGuardian ? <Badge>Responsável financeiro</Badge> : null}
                {link.isEmergencyContact ? <Badge>Contato de emergÃªncia</Badge> : null}
                {link.canPickup ? <Badge>Autorizado a retirar</Badge> : null}
              </div>

              {canManage ? (
                <LinkEditorForm athleteId={athlete.id} link={link} />
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm font-semibold text-zinc-500">
            Nenhum responsável disponÃ­vel para o seu perfil.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
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

function TextareaInput({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={value ?? ""}
        rows={3}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      />
    </div>
  );
}

function SelectInput({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string | null;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value ?? ""}
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option
            key={typeof option === "string" ? option : option.value}
            value={typeof option === "string" ? option : option.value}
          >
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function toDateInputValue(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function LinkEditorForm({
  athleteId,
  link,
}: {
  athleteId: string;
  link: GuardianLink;
}) {
  return (
    <>
      <form
        action={updateAthleteGuardian}
        className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3"
      >
        <input type="hidden" name="athleteGuardianId" value={link.id} />
        <input type="hidden" name="athleteId" value={athleteId} />
        <div className="space-y-2">
          <Label htmlFor={`relationship-${link.id}`}>Grau de parentesco</Label>
          <select
            id={`relationship-${link.id}`}
            name="relationship"
            defaultValue={link.relationship}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
          >
            {relationshipOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <LinkCheckbox
            name="isLegalGuardian"
            label="Responsável legal"
            defaultChecked={link.isLegalGuardian}
          />
          <LinkCheckbox
            name="isFinancialGuardian"
            label="Responsável financeiro"
            defaultChecked={link.isFinancialGuardian}
          />
          <LinkCheckbox
            name="isEmergencyContact"
            label="Contato de emergÃªncia"
            defaultChecked={link.isEmergencyContact}
          />
          <LinkCheckbox
            name="canPickup"
            label="Autorizado a retirar"
            defaultChecked={link.canPickup}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`linkNotes-${link.id}`}>ObservaçÃµes do vÃ­nculo</Label>
          <textarea
            id={`linkNotes-${link.id}`}
            name="linkNotes"
            defaultValue={link.notes ?? ""}
            rows={2}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" variant="secondary" size="sm">
            Salvar vÃ­nculo
          </Button>
        </div>
      </form>

      <form action={removeAthleteGuardian} className="flex justify-end">
        <input type="hidden" name="athleteGuardianId" value={link.id} />
        <input type="hidden" name="athleteId" value={athleteId} />
        <Button type="submit" variant="ghost" size="sm">
          Remover vÃ­nculo
        </Button>
      </form>
    </>
  );
}

function LinkCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-zinc-300 accent-jr-red"
      />
      {label}
    </label>
  );
}

function PlaceholderTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulo preparado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-zinc-600">
          Esta aba será implementada em card futuro. Neste card, apenas a aba
          Responsáveis está ativa.
        </p>
      </CardContent>
    </Card>
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
