import type {
  AthleteDocument,
  AthleteDocumentStatus,
  DocumentPeriodicity,
  DocumentType,
} from "@prisma/client";

import type { Profile } from "@/lib/roles";
import { calculateAge } from "@/lib/athletes";

export const documentStatusOptions: Array<{
  value: AthleteDocumentStatus;
  label: string;
}> = [
  { value: "pending", label: "Pendente" },
  { value: "uploaded", label: "Enviado" },
  { value: "under_review", label: "Em análise" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Reprovado" },
  { value: "expiring", label: "Vencendo" },
  { value: "expired", label: "Vencido" },
  { value: "waived", label: "Dispensado" },
];

export const periodicityOptions: Array<{
  value: DocumentPeriodicity;
  label: string;
}> = [
  { value: "annual", label: "Anual" },
  { value: "semiannual", label: "Semestral" },
  { value: "once", label: "Única" },
  { value: "on_change", label: "Quando alterar" },
  { value: "other", label: "Outra" },
];

export function documentStatusLabel(status: AthleteDocumentStatus) {
  return (
    documentStatusOptions.find((option) => option.value === status)?.label ??
    "Pendente"
  );
}

export function documentPeriodicityLabel(periodicity: DocumentPeriodicity) {
  return (
    periodicityOptions.find((option) => option.value === periodicity)?.label ??
    "Anual"
  );
}

export function documentStatusClass(status: AthleteDocumentStatus) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "rejected" || status === "expired") {
    return "border-jr-red/25 bg-jr-red/10 text-jr-red";
  }

  if (status === "expiring" || status === "under_review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "waived") {
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export function isDocumentExpired(expirationDate: Date | null | undefined) {
  if (!expirationDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expirationDate < today;
}

export function isDocumentExpiringSoon(expirationDate: Date | null | undefined) {
  if (!expirationDate || isDocumentExpired(expirationDate)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  return expirationDate <= thirtyDays;
}

export function effectiveDocumentStatus(
  document: Pick<AthleteDocument, "status" | "expirationDate" | "expiresAt">
) {
  if (document.status === "approved") {
    const expirationDate = document.expirationDate ?? document.expiresAt;

    if (isDocumentExpired(expirationDate)) {
      return "expired";
    }

    if (isDocumentExpiringSoon(expirationDate)) {
      return "expiring";
    }
  }

  return document.status;
}

export function appliesToAthlete(
  documentType: Pick<DocumentType, "appliesToAdults" | "appliesToMinors">,
  birthDate: Date
) {
  return calculateAge(birthDate) < 18
    ? documentType.appliesToMinors
    : documentType.appliesToAdults;
}

export function isMedicalCertificateName(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return normalized.includes("atestado") && normalized.includes("medico");
}

export function canManageDocuments(profile: Profile) {
  return ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA"].includes(profile);
}

export function canViewFullDocuments(profile: Profile) {
  return ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"].includes(
    profile
  );
}

export function canViewDocumentSummary(profile: Profile) {
  return [
    "SUPER_ADMIN",
    "DIRETORIA",
    "SECRETARIA",
    "PROFESSOR",
    "ASSISTENTE",
    "CONSULTA",
  ].includes(profile);
}

export function currentReferenceYear() {
  return new Date().getFullYear();
}
