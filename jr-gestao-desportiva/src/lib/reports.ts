import type { Profile } from "@/lib/roles";

export type ReportOption = {
  value: string;
  label: string;
};

export const reportLinks: Array<{
  href: string;
  title: string;
  description: string;
  profiles: Profile[];
}> = [
  {
    href: "/admin/relatorios/atletas",
    title: "Atletas",
    description: "Cadastro, vínculos, responsáveis, escola e pendências.",
    profiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"],
  },
  {
    href: "/admin/relatorios/documentos",
    title: "Documentos",
    description: "Pendências, vencimentos, análise e atestados.",
    profiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"],
  },
  {
    href: "/admin/relatorios/presenca",
    title: "Presença",
    description: "Frequência por atleta, turma, período e professor.",
    profiles: [
      "SUPER_ADMIN",
      "DIRETORIA",
      "SECRETARIA",
      "PROFESSOR",
      "ASSISTENTE",
      "CONSULTA",
    ],
  },
  {
    href: "/admin/relatorios/mensalidades",
    title: "Mensalidades",
    description: "Previsto, recebido, atrasos, parciais e isenções.",
    profiles: ["SUPER_ADMIN", "DIRETORIA", "FINANCEIRO", "SECRETARIA"],
  },
  {
    href: "/admin/relatorios/competicoes",
    title: "Competições",
    description: "Convocações, participações, resultados e medalhas.",
    profiles: [
      "SUPER_ADMIN",
      "DIRETORIA",
      "SECRETARIA",
      "PROFESSOR",
      "ASSISTENTE",
      "CONSULTA",
    ],
  },
  {
    href: "/admin/relatorios/pendencias",
    title: "Pendências críticas",
    description: "Riscos operacionais consolidados por atleta.",
    profiles: ["SUPER_ADMIN", "DIRETORIA", "SECRETARIA", "CONSULTA"],
  },
];

export function reportLinksForProfile(profile: Profile) {
  return reportLinks.filter(
    (link) => profile === "SUPER_ADMIN" || link.profiles.includes(profile),
  );
}

export function getParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || "";
}

export function parseDateParam(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function endOfDay(date: Date | null) {
  if (!date) {
    return null;
  }

  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function todayFileDate() {
  return new Date().toISOString().slice(0, 10);
}

export function csvResponse(filenamePrefix: string, rows: string[][]) {
  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenamePrefix}-${todayFileDate()}.csv"`,
    },
  });
}

export function toCsv(rows: string[][]) {
  const content = rows
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\r\n");

  return `\uFEFF${content}`;
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1).replace(".", ",") : "0,0"}%`;
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
