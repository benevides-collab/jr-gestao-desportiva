import type { StaffMemberType } from "@prisma/client";

export const activeStatusOptions = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

export const athleteClassStatusOptions = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "away", label: "Afastado" },
];

export const staffTypeOptions: { value: StaffMemberType; label: string }[] = [
  { value: "teacher", label: "Treinador" },
  { value: "assistant", label: "Assistente" },
  { value: "coordinator", label: "Coordenador" },
  { value: "admin", label: "Administrativo" },
  { value: "finance", label: "Financeiro" },
  { value: "other", label: "Outro" },
];

export const staffRegistrationTypeOptions: { value: StaffMemberType; label: string }[] = [
  { value: "teacher", label: "Treinador" },
  { value: "assistant", label: "Assistente" },
];

export const weekdayOptions = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

export function activeStatusLabel(isActive: boolean) {
  return isActive ? "Ativo" : "Inativo";
}

export function staffTypeLabel(value: StaffMemberType | null | undefined) {
  return staffTypeOptions.find((option) => option.value === value)?.label ?? "-";
}

export function weekdayLabel(value: number | null | undefined) {
  return weekdayOptions.find((option) => Number(option.value) === value)?.label ?? "-";
}

export function athleteClassStatusLabel(value: string | null | undefined) {
  return (
    athleteClassStatusOptions.find((option) => option.value === value)?.label ?? "-"
  );
}
