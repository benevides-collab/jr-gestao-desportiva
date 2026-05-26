import {
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Medal,
  Receipt,
  Settings,
  Stethoscope,
  Trophy,
  Users,
  UserRoundCog,
  Volleyball,
  CalendarDays,
  ChartNoAxesColumn,
  MapPin,
} from "lucide-react";

import type { Profile } from "@/lib/roles";

export type MenuItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  allowedProfiles: Profile[];
  description: string;
};

const allProfiles: Profile[] = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "PROFESSOR",
  "ASSISTENTE",
  "FINANCEIRO",
  "CONSULTA",
];

const adminProfiles: Profile[] = ["SUPER_ADMIN", "DIRETORIA"];
const athleteProfiles: Profile[] = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "PROFESSOR",
  "ASSISTENTE",
  "CONSULTA",
];
const guardianProfiles: Profile[] = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "PROFESSOR",
  "ASSISTENTE",
  "FINANCEIRO",
  "CONSULTA",
];
const classProfiles: Profile[] = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "PROFESSOR",
  "ASSISTENTE",
];
const financeProfiles: Profile[] = ["SUPER_ADMIN", "DIRETORIA", "FINANCEIRO"];

export const menuItems: MenuItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedProfiles: allProfiles,
    description: "Visão geral administrativa do sistema interno.",
  },
  {
    href: "/admin/atletas",
    label: "Atletas",
    icon: Users,
    allowedProfiles: athleteProfiles,
    description: "Cadastro base e consulta de atletas.",
  },
  {
    href: "/admin/responsaveis",
    label: "Responsáveis",
    icon: UserRoundCog,
    allowedProfiles: guardianProfiles,
    description: "Cadastro e vínculos de responsáveis dos atletas.",
  },
  {
    href: "/admin/documentos",
    label: "Documentos",
    icon: FileText,
    allowedProfiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"],
    description: "Acompanhamento futuro de documentos anuais.",
  },
  {
    href: "/admin/modalidades",
    label: "Modalidades",
    icon: Volleyball,
    allowedProfiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"],
    description: "Gestão futura das modalidades atendidas pela JR.",
  },
  {
    href: "/admin/locais",
    label: "Locais",
    icon: MapPin,
    allowedProfiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"],
    description: "Locais de treino e dados de acessibilidade.",
  },
  {
    href: "/admin/turmas",
    label: "Turmas",
    icon: Medal,
    allowedProfiles: classProfiles,
    description: "Turmas e vínculos de treinadores e assistentes.",
  },
  {
    href: "/professor/minhas-turmas",
    label: "Minhas Turmas",
    icon: Medal,
    allowedProfiles: ["PROFESSOR", "ASSISTENTE"],
    description: "Turmas vinculadas ao treinador ou assistente.",
  },
  {
    href: "/professor/chamada",
    label: "Chamada do Dia",
    icon: ClipboardCheck,
    allowedProfiles: ["PROFESSOR", "ASSISTENTE"],
    description: "Registro diário de presença das turmas.",
  },
  {
    href: "/admin/professores",
    label: "Treinadores",
    icon: Stethoscope,
    allowedProfiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"],
    description: "Treinadores e assistentes vinculados às turmas.",
  },
  {
    href: "/admin/agenda",
    label: "Agenda",
    icon: CalendarDays,
    allowedProfiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "PROFESSOR", "ASSISTENTE"],
    description: "Agenda futura de treinos, turmas e eventos.",
  },
  {
    href: "/admin/presenca",
    label: "Presença",
    icon: ClipboardCheck,
    allowedProfiles: classProfiles,
    description: "Chamadas e presença por turma.",
  },
  {
    href: "/admin/competicoes",
    label: "Competições",
    icon: Trophy,
    allowedProfiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "PROFESSOR", "ASSISTENTE", "CONSULTA"],
    description: "Convocações e acompanhamento futuro de competições.",
  },
  {
    href: "/admin/mensalidades",
    label: "Mensalidades",
    icon: Receipt,
    allowedProfiles: financeProfiles,
    description: "Mensalidades, pagamentos e pendências financeiras.",
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
    icon: ChartNoAxesColumn,
    allowedProfiles: [
      "SUPER_ADMIN",
      "DIRETORIA",
      "SECRETARIA",
      "PROFESSOR",
      "ASSISTENTE",
      "FINANCEIRO",
      "CONSULTA",
    ],
    description: "Relatórios administrativos e financeiros.",
  },
  {
    href: "/admin/usuarios",
    label: "Usuários",
    icon: UserRoundCog,
    allowedProfiles: adminProfiles,
    description: "Usuários e perfis de acesso ao sistema.",
  },
  {
    href: "/admin/configuracoes",
    label: "Configurações",
    icon: Settings,
    allowedProfiles: ["SUPER_ADMIN"],
    description: "Configurações administrativas do painel.",
  },
];

export function canAccess(profile: Profile, allowedProfiles: Profile[]) {
  return profile === "SUPER_ADMIN" || allowedProfiles.includes(profile);
}

export function menuForProfile(profile: Profile) {
  return menuItems.filter((item) => canAccess(profile, item.allowedProfiles));
}

export function menuItemBySegment(segment: string) {
  return menuItems.find((item) => item.href === `/admin/${segment}`);
}

export function canManageAthletes(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"]);
}

export function canViewAthletes(profile: Profile) {
  return canAccess(profile, athleteProfiles);
}

export function canManageGuardians(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"]);
}

export function canViewGuardians(profile: Profile) {
  return canAccess(profile, guardianProfiles);
}

export function canViewFullGuardianData(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "CONSULTA",
  ]);
}

export function canManageMedicalInfo(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"]);
}

export function canViewMedicalSummary(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
  ]);
}

export function canViewFullMedicalInfo(profile: Profile) {
  return canManageMedicalInfo(profile);
}

export function canManageTrainingStructure(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"]);
}

export function canViewTrainingStructure(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "CONSULTA",
  ]);
}

export function canManageAttendance(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
  ]);
}

export function canManageRetroactiveAttendance(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"]);
}

export function canViewAttendance(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "CONSULTA",
  ]);
}

export function canManageCompetitions(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"]);
}

export function canUpdateCompetitionParticipation(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "PROFESSOR"]);
}

export function canViewCompetitions(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "CONSULTA",
  ]);
}

export function canManageMonthlyFees(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "FINANCEIRO"]);
}

export function canViewMonthlyFees(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "FINANCEIRO", "SECRETARIA"]);
}

export function canViewReports(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "FINANCEIRO",
    "CONSULTA",
  ]);
}

export function canViewAthleteReports(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"]);
}

export function canViewDocumentReports(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"]);
}

export function canViewAttendanceReports(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "CONSULTA",
  ]);
}

export function canViewFinancialReports(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "FINANCEIRO", "SECRETARIA"]);
}

export function canViewCompetitionReports(profile: Profile) {
  return canAccess(profile, [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "CONSULTA",
  ]);
}

export function canViewCriticalPendingReports(profile: Profile) {
  return canAccess(profile, ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"]);
}
