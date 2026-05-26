import type { AthleteStatus, Gender } from "@prisma/client";

export const athleteStatusLabels: Record<AthleteStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  away: "Afastado",
  trial: "Experimental",
};

export const genderLabels: Record<Gender, string> = {
  female: "Feminino",
  male: "Masculino",
  non_binary: "Não binário",
  not_informed: "Não informado",
};

export function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function isMinor(birthDate: Date) {
  return calculateAge(birthDate) < 18;
}

export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(date);
}

export function toDateInputValue(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function isFutureDate(date: Date) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return date > today;
}
