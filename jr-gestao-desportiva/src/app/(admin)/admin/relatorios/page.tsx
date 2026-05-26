import Link from "next/link";
import { redirect } from "next/navigation";

import { SummaryCard } from "@/components/app/report-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  canViewReports,
  canViewAttendanceReports,
  canViewCriticalPendingReports,
  canViewDocumentReports,
  canViewFinancialReports,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { reportLinksForProfile } from "@/lib/reports";

export default async function ReportsIndexPage() {
  const user = await getCurrentUser();

  if (!user || !canViewReports(user.role)) {
    redirect("/acesso-negado");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const [
    activeAthletes,
    pendingDocuments,
    expiredDocuments,
    monthlyAttendance,
    overdueMonthlyFees,
    upcomingCompetitions,
    minorAthletesWithoutLegalGuardian,
  ] = await Promise.all([
    getPrisma().athlete.count({ where: { status: "active" } }),
    canViewDocumentReports(user.role)
      ? getPrisma().athleteDocument.count({
          where: { status: { in: ["pending", "uploaded", "under_review"] } },
        })
      : Promise.resolve(0),
    canViewDocumentReports(user.role)
      ? getPrisma().athleteDocument.count({
          where: {
            status: "approved",
            OR: [{ expirationDate: { lt: today } }, { expiresAt: { lt: today } }],
          },
        })
      : Promise.resolve(0),
    canViewAttendanceReports(user.role)
      ? getPrisma().attendance.count({
          where: { attendanceDate: { gte: monthStart, lte: monthEnd } },
        })
      : Promise.resolve(0),
    canViewFinancialReports(user.role)
      ? getPrisma().monthlyFee.count({
          where: {
            dueDate: { lt: today },
            status: { in: ["open", "partial", "overdue"] },
          },
        })
      : Promise.resolve(0),
    getPrisma().competition.count({
      where: { startsAt: { gte: today }, status: { in: ["planned", "confirmed"] } },
    }),
    canViewCriticalPendingReports(user.role)
      ? getPrisma().athlete.count({
          where: {
            status: "active",
            guardians: { none: { isLegalGuardian: true } },
          },
        })
      : Promise.resolve(0),
  ]);

  const links = reportLinksForProfile(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Relatórios
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Painéis operacionais e exportações internas da Associação JR Desportos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Atletas ativos" value={String(activeAthletes)} />
        <SummaryCard label="Documentos pendentes" value={String(pendingDocuments)} />
        <SummaryCard label="Documentos vencidos" value={String(expiredDocuments)} />
        <SummaryCard label="Presenças no mês" value={String(monthlyAttendance)} />
        <SummaryCard label="Mensalidades atrasadas" value={String(overdueMonthlyFees)} />
        <SummaryCard
          label="Pendências críticas"
          value={String(minorAthletesWithoutLegalGuardian)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Áreas de relatório</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-zinc-200 bg-white p-4 transition hover:border-jr-red/40 hover:bg-jr-red/5"
            >
              <h2 className="text-lg font-black text-zinc-950">{link.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {link.description}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-zinc-950">
              Competições próximas
            </p>
            <p className="text-sm text-zinc-600">
              {upcomingCompetitions} evento(s) planejado(s) ou confirmado(s).
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/admin/relatorios/competicoes">Ver competições</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

