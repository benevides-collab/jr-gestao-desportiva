import type { GuardianType } from "@prisma/client";

export const guardianTypeLabels: Record<GuardianType, string> = {
  mother: "Mãe",
  father: "Pai",
  legal_guardian: "Responsável legal",
  relative: "Familiar",
  other: "Outro",
};

export const relationshipOptions = [
  { value: "father", label: "Pai", guardianType: "father" },
  { value: "mother", label: "Mãe", guardianType: "mother" },
  { value: "grandfather", label: "Avô", guardianType: "relative" },
  { value: "grandmother", label: "Avó", guardianType: "relative" },
  { value: "sibling", label: "Irmão/Irmã", guardianType: "relative" },
  { value: "uncle_aunt", label: "Tio/Tia", guardianType: "relative" },
  { value: "step_parent", label: "Padrasto/Madrasta", guardianType: "relative" },
  {
    value: "legal_guardian",
    label: "Tutor/Guardião legal",
    guardianType: "legal_guardian",
  },
  { value: "caregiver", label: "Cuidador", guardianType: "other" },
  { value: "other", label: "Outro", guardianType: "other" },
] as const;

export type RelationshipValue = (typeof relationshipOptions)[number]["value"];

export function guardianTypeFromRelationship(value: string): GuardianType {
  return (
    relationshipOptions.find((option) => option.value === value)?.guardianType ??
    "other"
  );
}

export function relationshipLabel(value: string) {
  return (
    relationshipOptions.find((option) => option.value === value)?.label ?? value
  );
}

export function relationshipFromGuardianType(type: GuardianType): RelationshipValue {
  if (type === "father") {
    return "father";
  }

  if (type === "mother") {
    return "mother";
  }

  if (type === "legal_guardian") {
    return "legal_guardian";
  }

  return "other";
}
