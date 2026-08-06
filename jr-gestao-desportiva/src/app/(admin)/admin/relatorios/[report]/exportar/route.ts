import { NextRequest } from "next/server";
import type { MonthlyFeeStatus } from "@prisma/client";

import { attendanceStatusLabel, scopedTrainingClassWhere } from "@/lib/attendance";
import { calculateAge, formatDate, isMinor } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  competitionAthleteStatusLabel,
  medalLabel,
} from "@/lib/competitions";
import { documentStatusLabel, effectiveDocumentStatus } from "@/lib/documents";
import {
  effectiveMonthlyFeeStatus,
  formatCurrency,
  monthlyFeeStatusLabel,
  outstandingAmount,
  paidAmount,
  paymentMethodLabel,
} from "@/lib/finance";
import {
  canViewAthleteReports,
  canViewAttendanceReports,
  canViewCompetitionReports,
  canViewCriticalPendingReports,
  canViewDocumentReports,
  canViewFinancialReports,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/reports";

type RouteContext = {
  params: Promise<{ report: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  const { report } = await context.params;

  if (!user) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const params = request.nextUrl.searchParams;

  if (report === "atletas") {
    if (!canViewAthleteReports(user.role)) {
      return new Response("Acesso negado.", { status: 403 });
    }

    const rows = await exportAthletes(params);
    return csvResponse("relatorio-atletas", rows);
  }

  if (report === "documentos") {
    if (!canViewDocumentReports(user.role)) {
      return new Response("Acesso negado.", { status: 403 });
    }

    const rows = await exportDocuments(params);
    return csvResponse("relatorio-documentos", rows);
  }

  if (report === "presenca") {
    if (!canViewAttendanceReports(user.role)) {
      return new Response("Acesso negado.", { status: 403 });
    }

    const rows = await exportAttendance(params, user);
    return csvResponse("relatorio-presenca", rows);
  }

  if (report === "mensalidades") {
    if (!canViewFinancialReports(user.role)) {
      return new Response("Acesso negado.", { status: 403 });
    }

    const rows = await exportMonthlyFees(params);
    return csvResponse("relatorio-mensalidades", rows);
  }

  if (report === "competicoes") {
    if (!canViewCompetitionReports(user.role)) {
      return new Response("Acesso negado.", { status: 403 });
    }

    const rows = await exportCompetitions(params);
    return csvResponse("relatorio-competicoes", rows);
  }

  if (report === "pendencias") {
    if (!canViewCriticalPendingReports(user.role)) {
      return new Response("Acesso negado.", { status: 403 });
    }

    const rows = await exportCriticalPendings(params);
    return csvResponse("relatorio-pendencias", rows);
  }

  return new Response("Relatório não encontrado.", { status: 404 });
}

async function exportAthletes(params: URLSearchParams) {
  const status = params.get("status") || "";
  const athleteId = params.get("atleta") || "";
  const gender = params.get("sexo") || "";
  const search = params.get("busca") || "";
  const modalityId = params.get("modalidade") || "";
  const trainingClassId = params.get("turma") || "";
  const teacherId = params.get("professor") || "";
  const minor = params.get("menor") || "";
  const legalGuardian = params.get("responsavelLegal") || "";
  const school = params.get("escola") || "";
  const medical = params.get("medico") || "";
  const joinedFrom = params.get("entradaInicial") || "";
  const joinedTo = params.get("entradaFinal") || "";

  const athletesRaw = await getPrisma().athlete.findMany({
    where: {
      ...(athleteId ? { id: athleteId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(gender ? { gender: gender as never } : {}),
      ...(search ? { fullName: { contains: search, mode: "insensitive" } } : {}),
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
                  ...(teacherId
                    ? {
                        OR: [
                          { teacherId },
                          { teachers: { some: { staffMemberId: teacherId } } },
                        ],
                      }
                    : {}),
                },
              },
            },
          }
        : {}),
    },
    include: {
      guardians: { include: { guardian: true } },
      schools: { include: { school: true } },
      classes: { include: { trainingClass: { include: { modality: true, teacher: true } } } },
      medicalInfo: true,
    },
    orderBy: { fullName: "asc" },
  });
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

  return [
    [
      "Atleta",
      "Idade",
      "Status",
      "Modalidade/Turma",
      "Responsável legal",
      "Contato",
      "Escola",
      "Professor",
      "Entrada",
      "Pendências",
    ],
    ...athletes.map((athlete) => {
      const legal = athlete.guardians.find((link) => link.isLegalGuardian);
      const school = athlete.schools.find((link) => link.isCurrent);
      const pendings = [
        isMinor(athlete.birthDate) && !legal ? "Sem responsável legal" : "",
        !school ? "Sem escola" : "",
        !athlete.medicalInfo ? "Sem médico/saúde" : "",
        athlete.classes.length === 0 ? "Sem turma" : "",
      ].filter(Boolean);

      return [
        athlete.fullName,
        String(calculateAge(athlete.birthDate)),
        athlete.status,
        athlete.classes
          .map((link) => `${link.trainingClass.modality.name}/${link.trainingClass.name}`)
          .join(", "),
        legal?.guardian.fullName ?? "",
        legal?.guardian.whatsapp ?? legal?.guardian.phone ?? "",
        school?.school.name ?? "",
        [...new Set(athlete.classes.map((link) => link.trainingClass.teacher.fullName))].join(", "),
        formatDate(athlete.joinedAt),
        pendings.join(", "),
      ];
    }),
  ];
}

async function exportDocuments(params: URLSearchParams) {
  const athleteId = params.get("atleta") || "";
  const documentTypeId = params.get("tipo") || "";
  const status = params.get("status") || "";
  const modalityId = params.get("modalidade") || "";
  const trainingClassId = params.get("turma") || "";
  const required = params.get("obrigatorio") || "";
  const medicalCertificate = params.get("atestado") || "";
  const alert = params.get("alerta") || "";
  const year = params.get("ano") ? Number.parseInt(params.get("ano") ?? "", 10) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const documents = await getPrisma().athleteDocument.findMany({
    where: {
      ...(athleteId ? { athleteId } : {}),
      ...(documentTypeId ? { documentTypeId } : {}),
      ...(year ? { referenceYear: year } : {}),
      ...(status ? { status: status as never } : {}),
      ...(required ? { documentType: { isRequired: required === "sim" } } : {}),
      ...(medicalCertificate === "sim"
        ? { documentType: { name: { contains: "Atestado", mode: "insensitive" } } }
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
            ? { status: { in: ["uploaded", "under_review"] } }
            : {}),
    },
    include: {
      athlete: true,
      documentType: true,
      reviewedByUser: true,
    },
    orderBy: [{ referenceYear: "desc" }, { createdAt: "desc" }],
  });

  return [
    [
      "Atleta",
      "Tipo de documento",
      "Ano",
      "Obrigatório",
      "Status",
      "Data de envio",
      "Validade",
      "Analisado por",
      "Data de análise",
      "Motivo de reprovação",
    ],
    ...documents.map((document) => [
      document.athlete.fullName,
      document.documentType.name,
      String(document.referenceYear ?? ""),
      document.documentType.isRequired ? "Sim" : "Não",
      documentStatusLabel(effectiveDocumentStatus(document)),
      formatDate(document.uploadedAt),
      formatDate(document.expirationDate ?? document.expiresAt),
      document.reviewedByUser?.name ?? "",
      formatDate(document.reviewedAt),
      document.rejectionReason ?? "",
    ]),
  ];
}

async function exportAttendance(
  params: URLSearchParams,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
) {
  const classScope = await scopedTrainingClassWhere(user);
  const athleteId = params.get("atleta") || "";
  const status = params.get("status") || "";
  const dateFrom = params.get("inicio") || "";
  const dateTo = params.get("fim") || "";
  const modalityId = params.get("modalidade") || "";
  const trainingClassId = params.get("turma") || "";
  const teacherId = params.get("professor") || "";

  const records = await getPrisma().attendance.findMany({
    where: {
      ...(athleteId ? { athleteId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(dateFrom || dateTo
        ? {
            attendanceDate: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
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
    },
    include: {
      athlete: true,
      recordedByUser: true,
      trainingClass: { include: { modality: true, teacher: true } },
    },
    orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
  });

  return [
    ["Data", "Atleta", "Turma", "Modalidade", "Professor", "Status", "Observação", "Registrado por"],
    ...records.map((record) => [
      formatDate(record.attendanceDate),
      record.athlete.fullName,
      record.trainingClass.name,
      record.trainingClass.modality.name,
      record.trainingClass.teacher.fullName,
      attendanceStatusLabel(record.status),
      record.notes ?? "",
      record.recordedByUser?.name ?? "",
    ]),
  ];
}

async function exportMonthlyFees(params: URLSearchParams) {
  const athleteId = params.get("atleta") || "";
  const status = params.get("status") || "";
  const guardianId = params.get("responsavel") || "";
  const month = params.get("mes") || "";
  const year = params.get("ano") || "";
  const dueFrom = params.get("inicio") || "";
  const dueTo = params.get("fim") || "";
  const modalityId = params.get("modalidade") || "";
  const trainingClassId = params.get("turma") || "";

  const feesRaw = await getPrisma().monthlyFee.findMany({
    where: {
      ...(athleteId ? { athleteId } : {}),
      ...(guardianId ? { financialGuardianId: guardianId } : {}),
      ...(month ? { referenceMonth: Number.parseInt(month, 10) } : {}),
      ...(year ? { referenceYear: Number.parseInt(year, 10) } : {}),
      ...(status && status !== "overdue" ? { status: status as MonthlyFeeStatus } : {}),
      ...(dueFrom || dueTo
        ? {
            dueDate: {
              ...(dueFrom ? { gte: new Date(`${dueFrom}T00:00:00.000Z`) } : {}),
              ...(dueTo ? { lte: new Date(`${dueTo}T23:59:59.999Z`) } : {}),
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
    },
    include: {
      athlete: true,
      financialGuardian: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
  });
  const fees =
    status === "overdue"
      ? feesRaw.filter((fee) => effectiveMonthlyFeeStatus(fee) === "overdue")
      : feesRaw;

  return [
    [
      "Atleta",
      "Responsável financeiro",
      "Competência",
      "Vencimento",
      "Valor",
      "Desconto",
      "Valor pago",
      "Saldo",
      "Status",
      "Forma de pagamento",
      "Data de pagamento",
      "Observações",
    ],
    ...fees.map((fee) => {
      const payment = fee.payments[0];
      return [
        fee.athlete.fullName,
        fee.financialGuardian?.fullName ?? "",
        `${String(fee.referenceMonth).padStart(2, "0")}/${fee.referenceYear}`,
        formatDate(fee.dueDate),
        formatCurrency(fee.amount),
        formatCurrency(fee.discountAmount),
        formatCurrency(paidAmount(fee.payments)),
        formatCurrency(outstandingAmount(fee)),
        monthlyFeeStatusLabel(effectiveMonthlyFeeStatus(fee)),
        paymentMethodLabel(payment?.method),
        formatDate(payment?.paidAt),
        fee.notes ?? payment?.notes ?? "",
      ];
    }),
  ];
}

async function exportCompetitions(params: URLSearchParams) {
  const athleteId = params.get("atleta") || "";
  const startsFrom = params.get("inicio") || "";
  const startsTo = params.get("fim") || "";
  const modalityId = params.get("modalidade") || "";
  const competitionId = params.get("competicao") || "";
  const teacherId = params.get("professor") || "";
  const competitionStatus = params.get("statusCompeticao") || "";
  const callStatus = params.get("statusConvocacao") || "";
  const medal = params.get("medalha") || "";

  const records = await getPrisma().competitionAthlete.findMany({
    where: {
      ...(athleteId ? { athleteId } : {}),
      ...(callStatus ? { status: callStatus as never } : {}),
      ...(medal ? { medal: medal as never } : {}),
      competition: {
        ...(competitionId ? { id: competitionId } : {}),
        ...(modalityId ? { modalityId } : {}),
        ...(teacherId ? { responsibleTeacherId: teacherId } : {}),
        ...(competitionStatus ? { status: competitionStatus as never } : {}),
        ...(startsFrom || startsTo
          ? {
              startsAt: {
                ...(startsFrom ? { gte: new Date(`${startsFrom}T00:00:00.000Z`) } : {}),
                ...(startsTo ? { lte: new Date(`${startsTo}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      athlete: true,
      competition: { include: { modality: true, responsibleTeacher: true } },
    },
    orderBy: [{ competition: { startsAt: "desc" } }, { createdAt: "desc" }],
  });

  return [
    [
      "Competição",
      "Data",
      "Modalidade",
      "Professor responsável",
      "Atleta",
      "Status da convocação",
      "Participou",
      "Resultado",
      "Colocação",
      "Medalha",
      "Observações",
    ],
    ...records.map((record) => [
      record.competition.name,
      formatDate(record.competition.startsAt),
      record.competition.modality?.name ?? "",
      record.competition.responsibleTeacher?.fullName ?? "",
      record.athlete.fullName,
      competitionAthleteStatusLabel(record.status),
      record.participated ? "Sim" : "Não",
      record.result ?? "",
      record.placement ?? "",
      medalLabel(record.medal),
      record.notes ?? "",
    ]),
  ];
}

async function exportCriticalPendings(params: URLSearchParams) {
  const athleteId = params.get("atleta") || "";
  const modalityId = params.get("modalidade") || "";
  const trainingClassId = params.get("turma") || "";
  const minor = params.get("menor") || "";
  const status = params.get("status") || "";
  const type = params.get("tipo") || "";
  const severity = params.get("severidade") || "";
  const athletes = await getPrisma().athlete.findMany({
    where: {
      ...(athleteId ? { id: athleteId } : {}),
      ...(status ? { status: status as never } : {}),
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
    },
    include: {
      guardians: true,
      schools: true,
      classes: { include: { trainingClass: { include: { modality: true } } } },
      medicalInfo: true,
    },
    orderBy: { fullName: "asc" },
  });

  const rows = athletes
    .filter((athlete) => (minor === "sim" ? isMinor(athlete.birthDate) : true))
    .filter((athlete) => (minor === "nao" ? !isMinor(athlete.birthDate) : true))
    .flatMap((athlete) => {
    const base = [
      athlete.fullName,
      String(calculateAge(athlete.birthDate)),
      athlete.classes
        .map((link) => `${link.trainingClass.modality.name}/${link.trainingClass.name}`)
        .join(", "),
    ];
    const pendings: string[][] = [];

    if (isMinor(athlete.birthDate) && !athlete.guardians.some((link) => link.isLegalGuardian)) {
      pendings.push([...base, "Atleta menor sem responsável legal", "critical", "Responsáveis", "Cadastrar ou vincular responsável legal."]);
    }

    if (!athlete.guardians.some((link) => link.isEmergencyContact)) {
      pendings.push([...base, "Sem contato de emergência", "critical", "Responsáveis", "Marcar contato de emergência."]);
    }

    if (!athlete.medicalInfo) {
      pendings.push([...base, "Sem cadastro médico/saúde", "warning", "Médico/Saúde", "Cadastrar informações essenciais de saúde."]);
    }

    if (athlete.status === "active" && athlete.classes.length === 0) {
      pendings.push([...base, "Atleta ativo sem turma", "warning", "Turmas", "Vincular atleta a uma turma ativa."]);
    }

    return pendings;
  })
    .filter((row) => (type ? row[3] === type : true))
    .filter((row) => (severity ? row[4] === severity : true))
    .map((row) => [
      row[0],
      row[1],
      row[2],
      row[3],
      row[4] === "critical" ? "Crítica" : row[4] === "warning" ? "Atenção" : "Informativa",
      row[5],
      row[6],
    ]);

  return [
    ["Atleta", "Idade", "Modalidade/Turma", "Tipo de pendência", "Severidade", "Relacionado", "Ação sugerida"],
    ...rows,
  ];
}
