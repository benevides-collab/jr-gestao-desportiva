import type { Profile } from "@/lib/roles";

export type DashboardCardCategory =
  | "athletes"
  | "documents"
  | "attendance"
  | "training"
  | "competitions"
  | "finance";

export type DashboardCardId =
  | "activeAthletes"
  | "minorAthletes"
  | "minorAthletesWithoutLegalGuardian"
  | "athletesWithoutSchool"
  | "athletesWithoutClass"
  | "incompleteAthleteRecords"
  | "birthdaysThisMonth"
  | "pendingDocuments"
  | "expiredDocuments"
  | "documentsExpiringSoon"
  | "documentsUnderReview"
  | "athletesWithoutValidMedicalCertificate"
  | "expiredMedicalCertificates"
  | "pendingCallsToday"
  | "attendanceToday"
  | "recentAbsences"
  | "classesWithLowAttendance"
  | "classesToday"
  | "upcomingTrainingSessions"
  | "classesWithoutTeacher"
  | "classesOverCapacity"
  | "upcomingCompetitions"
  | "calledAthletesWithPendingIssues"
  | "competitionsWithoutTeacher"
  | "recentResults"
  | "openMonthlyFees"
  | "overdueMonthlyFees"
  | "receivedThisMonth"
  | "expectedThisMonth"
  | "exemptAthletes";

export type DashboardCardDefinition = {
  id: DashboardCardId;
  category: DashboardCardCategory;
  label: string;
  description: string;
  allowedProfiles: Profile[];
  defaultEnabledProfiles: Profile[];
  sensitive?: boolean;
};

const secretaryProfiles: Profile[] = ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"];
const trainingProfiles: Profile[] = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "PROFESSOR",
  "ASSISTENTE",
];
const viewProfiles: Profile[] = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "CONSULTA",
];
const financeProfiles: Profile[] = ["SUPER_ADMIN", "DIRETORIA", "FINANCEIRO"];

export const dashboardCategories: Array<{
  id: DashboardCardCategory;
  label: string;
}> = [
  { id: "athletes", label: "Atletas" },
  { id: "documents", label: "Documentos" },
  { id: "attendance", label: "Presença" },
  { id: "training", label: "Turmas e treinos" },
  { id: "competitions", label: "Competições" },
  { id: "finance", label: "Financeiro" },
];

export const dashboardCardDefinitions: DashboardCardDefinition[] = [
  card("activeAthletes", "athletes", "Total de atletas", "Atletas com status ativo.", viewProfiles, viewProfiles),
  card("minorAthletes", "athletes", "Atletas menores de idade", "Atletas ativos menores de 18 anos.", viewProfiles, secretaryProfiles),
  card("minorAthletesWithoutLegalGuardian", "athletes", "Atletas sem responsável legal", "Menores de idade sem responsável legal vinculado.", viewProfiles, secretaryProfiles),
  card("athletesWithoutSchool", "athletes", "Atletas sem escola cadastrada", "Atletas ativos sem escola atual.", viewProfiles, secretaryProfiles),
  card("athletesWithoutClass", "athletes", "Atletas sem turma", "Atletas ativos sem vínculo de turma.", secretaryProfiles, secretaryProfiles),
  card("incompleteAthleteRecords", "athletes", "Atletas com cadastro incompleto", "Cadastros sem contato ou endereço.", secretaryProfiles, secretaryProfiles),
  card("birthdaysThisMonth", "athletes", "Aniversariantes do mês", "Atletas ativos que fazem aniversário no mês.", viewProfiles, viewProfiles),
  card("pendingDocuments", "documents", "Documentos pendentes", "Documentos pendentes, enviados ou em análise.", viewProfiles, secretaryProfiles),
  card("expiredDocuments", "documents", "Documentos vencidos", "Documentos aprovados com validade vencida.", viewProfiles, secretaryProfiles),
  card("documentsExpiringSoon", "documents", "Documentos vencendo em 30 dias", "Documentos com vencimento próximo.", viewProfiles, secretaryProfiles),
  card("documentsUnderReview", "documents", "Documentos aguardando análise", "Documentos enviados ou em análise.", viewProfiles, secretaryProfiles),
  card("athletesWithoutValidMedicalCertificate", "documents", "Atletas sem atestado válido", "Atletas sem atestado aprovado e dentro da validade.", secretaryProfiles, secretaryProfiles, true),
  card("expiredMedicalCertificates", "documents", "Atestados vencidos", "Atestados médicos vencidos.", secretaryProfiles, secretaryProfiles, true),
  card("pendingCallsToday", "attendance", "Chamadas pendentes do dia", "Turmas do dia sem chamada registrada.", trainingProfiles, trainingProfiles),
  card("attendanceToday", "attendance", "Presenças registradas hoje", "Registros de presença criados hoje.", trainingProfiles, trainingProfiles),
  card("recentAbsences", "attendance", "Faltas recentes", "Faltas registradas nos últimos 7 dias.", trainingProfiles, trainingProfiles),
  card("classesWithLowAttendance", "attendance", "Turmas com baixa frequência", "Indicador preparado para análise de frequência.", secretaryProfiles, secretaryProfiles),
  card("classesToday", "training", "Turmas do dia", "Turmas com treino previsto hoje.", trainingProfiles, trainingProfiles),
  card("upcomingTrainingSessions", "training", "Próximos treinos", "Horários ativos de treino cadastrados.", trainingProfiles, trainingProfiles),
  card("classesWithoutTeacher", "training", "Turmas sem professor", "Turmas sem professor responsável.", secretaryProfiles, secretaryProfiles),
  card("classesOverCapacity", "training", "Turmas acima da capacidade", "Turmas com atletas acima da capacidade informada.", secretaryProfiles, secretaryProfiles),
  card("upcomingCompetitions", "competitions", "Competições próximas", "Competições planejadas ou confirmadas.", trainingProfiles.concat(["CONSULTA"]), trainingProfiles),
  card("calledAthletesWithPendingIssues", "competitions", "Atletas convocados com pendência", "Convocações com documentação, médico ou responsável pendente.", secretaryProfiles, secretaryProfiles),
  card("competitionsWithoutTeacher", "competitions", "Competições sem professor responsável", "Competições sem responsável técnico.", secretaryProfiles, secretaryProfiles),
  card("recentResults", "competitions", "Resultados recentes", "Participações e resultados recentes.", trainingProfiles.concat(["CONSULTA"]), trainingProfiles),
  card("openMonthlyFees", "finance", "Mensalidades em aberto", "Mensalidades com status em aberto.", financeProfiles, financeProfiles, true),
  card("overdueMonthlyFees", "finance", "Mensalidades atrasadas", "Mensalidades vencidas em aberto ou parcial.", financeProfiles, financeProfiles, true),
  card("receivedThisMonth", "finance", "Total recebido no mês", "Pagamentos registrados no mês.", financeProfiles, financeProfiles, true),
  card("expectedThisMonth", "finance", "Total previsto no mês", "Valor líquido previsto para o mês.", financeProfiles, financeProfiles, true),
  card("exemptAthletes", "finance", "Atletas isentos", "Mensalidades marcadas como isentas.", financeProfiles, financeProfiles, true),
];

export function dashboardCardsForProfile(profile: Profile) {
  return dashboardCardDefinitions.filter(
    (item) =>
      (profile === "SUPER_ADMIN" || item.allowedProfiles.includes(profile)) &&
      item.defaultEnabledProfiles.includes(profile),
  );
}

export function dashboardCardIsAllowed(profile: Profile, cardId: DashboardCardId) {
  const definition = dashboardCardDefinitions.find((item) => item.id === cardId);

  if (!definition) {
    return false;
  }

  return profile === "SUPER_ADMIN" || definition.allowedProfiles.includes(profile);
}

function card(
  id: DashboardCardId,
  category: DashboardCardCategory,
  label: string,
  description: string,
  allowedProfiles: Profile[],
  defaultEnabledProfiles: Profile[],
  sensitive = false,
): DashboardCardDefinition {
  return {
    id,
    category,
    label,
    description,
    allowedProfiles: Array.from(new Set(allowedProfiles)),
    defaultEnabledProfiles: Array.from(new Set(defaultEnabledProfiles)),
    sensitive,
  };
}
