import type {
  CompetitionAthleteStatus,
  CompetitionMedal,
  CompetitionStatus,
} from "@prisma/client";

export const competitionStatusOptions: Array<{
  value: CompetitionStatus;
  label: string;
}> = [
  { value: "planned", label: "Planejada" },
  { value: "confirmed", label: "Confirmada" },
  { value: "completed", label: "Realizada" },
  { value: "canceled", label: "Cancelada" },
];

export const competitionAthleteStatusOptions: Array<{
  value: CompetitionAthleteStatus;
  label: string;
}> = [
  { value: "called", label: "Convocado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "pending", label: "Pendente" },
  { value: "canceled", label: "Cancelado" },
  { value: "participated", label: "Participou" },
  { value: "absent", label: "Ausente" },
];

export const medalOptions: Array<{ value: CompetitionMedal; label: string }> = [
  { value: "none", label: "Nenhuma" },
  { value: "gold", label: "Ouro" },
  { value: "silver", label: "Prata" },
  { value: "bronze", label: "Bronze" },
  { value: "participation", label: "Participação" },
];

export function competitionStatusLabel(value: CompetitionStatus) {
  return (
    competitionStatusOptions.find((option) => option.value === value)?.label ??
    "Planejada"
  );
}

export function competitionAthleteStatusLabel(
  value: CompetitionAthleteStatus
) {
  return (
    competitionAthleteStatusOptions.find((option) => option.value === value)
      ?.label ?? "Convocado"
  );
}

export function medalLabel(value: CompetitionMedal | null | undefined) {
  return medalOptions.find((option) => option.value === value)?.label ?? "-";
}

export function competitionStatusClass(value: CompetitionStatus) {
  if (value === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (value === "completed") {
    return "border-zinc-300 bg-zinc-100 text-zinc-800";
  }

  if (value === "canceled") {
    return "border-jr-red/25 bg-jr-red/10 text-jr-red";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function competitionAthleteStatusClass(
  value: CompetitionAthleteStatus
) {
  if (value === "confirmed" || value === "participated") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (value === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (value === "canceled" || value === "absent") {
    return "border-jr-red/25 bg-jr-red/10 text-jr-red";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}
