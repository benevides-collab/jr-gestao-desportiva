export const profiles = [
  "SUPER_ADMIN",
  "DIRETORIA",
  "SECRETARIA",
  "PROFESSOR",
  "ASSISTENTE",
  "FINANCEIRO",
  "CONSULTA",
] as const;

export type Profile = (typeof profiles)[number];

export type RoleSlug =
  | "admin"
  | "diretoria"
  | "secretaria"
  | "professor"
  | "assistente"
  | "financeiro"
  | "consulta";

export const profileLabels: Record<Profile, string> = {
  SUPER_ADMIN: "Super admin",
  DIRETORIA: "Diretoria",
  SECRETARIA: "Secretaria",
  PROFESSOR: "Professor",
  ASSISTENTE: "Assistente",
  FINANCEIRO: "Financeiro",
  CONSULTA: "Consulta",
};

export const profileToRoleSlug: Record<Profile, RoleSlug> = {
  SUPER_ADMIN: "admin",
  DIRETORIA: "diretoria",
  SECRETARIA: "secretaria",
  PROFESSOR: "professor",
  ASSISTENTE: "assistente",
  FINANCEIRO: "financeiro",
  CONSULTA: "consulta",
};

export const roleSlugToProfile: Record<RoleSlug, Profile> = {
  admin: "SUPER_ADMIN",
  diretoria: "DIRETORIA",
  secretaria: "SECRETARIA",
  professor: "PROFESSOR",
  assistente: "ASSISTENTE",
  financeiro: "FINANCEIRO",
  consulta: "CONSULTA",
};

export function profileFromRoleSlug(slug: string): Profile {
  return roleSlugToProfile[slug as RoleSlug] ?? "CONSULTA";
}
