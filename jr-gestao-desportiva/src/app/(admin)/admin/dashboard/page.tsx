import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  FileCheck2,
  ShieldAlert,
  Trophy,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import type { DashboardCardDefinition } from "@/lib/dashboard-config";
import { isMedicalCertificateName } from "@/lib/documents";
import { formatCurrency, netAmount } from "@/lib/finance";
import { menuForProfile } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { profileLabels } from "@/lib/roles";
import { isMinor } from "@/lib/athletes";
import { dashboardCardsForProfileFromSettings } from "@/lib/system-settings";

const iconByCategory = {
  athletes: UsersRound,
  documents: FileCheck2,
  attendance: Activity,
  training: CalendarDays,
  competitions: Trophy,
  finance: BadgeDollarSign,
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const visibleMenus = menuForProfile(user.role);
  const cards = await dashboardCardsForProfileFromSettings(user.role);
  const values = await loadDashboardValues();

  return (
    <div className="space-y-6">
      <div>
        <Badge className="border-jr-red/20 bg-jr-red/10 text-jr-red">
          Ambiente interno
        </Badge>
        <h1 className="mt-3 text-2xl font-black text-zinc-950 sm:text-3xl">
          Dashboard administrativo
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Visão geral configurada conforme o perfil logado e as permissões de acesso.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <DashboardCard key={item.id} item={item} value={values[item.id] ?? "0"} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Áreas liberadas para o seu perfil</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {visibleMenus.map((item) => (
              <div
                key={item.href}
                className="flex items-start gap-3 rounded-md border border-zinc-200 p-3"
              >
                <item.icon className="mt-0.5 size-4 text-jr-red" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-zinc-950">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-900 bg-zinc-950 text-white">
          <CardHeader>
            <CardTitle className="text-white">Controle de acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-3">
              <ShieldAlert className="size-4 text-jr-red" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-white">{profileLabels[user.role]}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Cards sensíveis são filtrados antes da renderização do dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardCard({
  item,
  value,
}: {
  item: DashboardCardDefinition;
  value: string;
}) {
  const Icon = iconByCategory[item.category] ?? AlertTriangle;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-sm text-zinc-600">{item.label}</CardTitle>
        <Icon className="size-5 shrink-0 text-jr-red" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black text-zinc-950">{value}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-zinc-500">
          {item.description}
        </p>
      </CardContent>
    </Card>
  );
}

async function loadDashboardValues() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  const weekday = today.getDay();

  const [
    activeAthletes,
    activeAthletesForAge,
    minorWithoutLegalGuardianRaw,
    athletesWithoutSchool,
    athletesWithoutClass,
    incompleteAthleteRecords,
    pendingDocuments,
    expiredDocuments,
    documentsExpiringSoon,
    documentsUnderReview,
    activeAthletesWithDocuments,
    expiredMedicalCertificates,
    attendanceToday,
    recentAbsences,
    schedulesToday,
    activeSchedules,
    classesWithCapacity,
    upcomingCompetitions,
    calledAthletesWithPendingIssues,
    competitionsWithoutTeacher,
    recentResults,
    openMonthlyFees,
    overdueMonthlyFees,
    paymentsThisMonth,
    feesThisMonth,
    exemptAthletes,
  ] = await Promise.all([
    getPrisma().athlete.count({ where: { status: "active" } }),
    getPrisma().athlete.findMany({
      where: { status: "active" },
      select: { birthDate: true },
    }),
    getPrisma().athlete.findMany({
      where: {
        status: "active",
        guardians: { none: { isLegalGuardian: true } },
      },
      select: { birthDate: true },
    }),
    getPrisma().athlete.count({
      where: { status: "active", schools: { none: { isCurrent: true } } },
    }),
    getPrisma().athlete.count({
      where: { status: "active", classes: { none: { isActive: true } } },
    }),
    getPrisma().athlete.count({
      where: {
        status: "active",
        OR: [{ phone: null }, { email: null }, { addressId: null }],
      },
    }),
    getPrisma().athleteDocument.count({
      where: { status: { in: ["pending", "uploaded", "under_review"] } },
    }),
    getPrisma().athleteDocument.count({
      where: {
        status: "approved",
        OR: [{ expirationDate: { lt: today } }, { expiresAt: { lt: today } }],
      },
    }),
    getPrisma().athleteDocument.count({
      where: {
        status: "approved",
        OR: [
          { expirationDate: { gte: today, lte: thirtyDays } },
          { expiresAt: { gte: today, lte: thirtyDays } },
        ],
      },
    }),
    getPrisma().athleteDocument.count({
      where: { status: { in: ["uploaded", "under_review"] } },
    }),
    getPrisma().athlete.findMany({
      where: { status: "active" },
      include: { documents: { include: { documentType: true } } },
    }),
    getPrisma().athleteDocument.count({
      where: {
        documentType: { name: { contains: "Atestado", mode: "insensitive" } },
        OR: [{ expirationDate: { lt: today } }, { expiresAt: { lt: today } }],
      },
    }),
    getPrisma().attendance.count({
      where: { attendanceDate: { gte: today, lt: tomorrow } },
    }),
    getPrisma().attendance.count({
      where: {
        attendanceDate: { gte: sevenDaysAgo, lt: tomorrow },
        status: { in: ["absent", "justified_absence"] },
      },
    }),
    getPrisma().classSchedule.count({ where: { weekday } }),
    getPrisma().classSchedule.count(),
    getPrisma().trainingClass.findMany({
      where: { isActive: true, capacity: { not: null } },
      include: { athletes: { where: { isActive: true } } },
    }),
    getPrisma().competition.count({
      where: { startsAt: { gte: today }, status: { in: ["planned", "confirmed"] } },
    }),
    getPrisma().competitionAthlete.count({
      where: {
        OR: [
          { documentsOk: false },
          { medicalClearanceOk: false },
          { guardianOk: false },
        ],
      },
    }),
    getPrisma().competition.count({
      where: { responsibleTeacherId: null },
    }),
    getPrisma().competitionAthlete.count({
      where: { participated: true, updatedAt: { gte: sevenDaysAgo } },
    }),
    getPrisma().monthlyFee.count({ where: { status: "open" } }),
    getPrisma().monthlyFee.count({
      where: {
        dueDate: { lt: today },
        status: { in: ["open", "partial", "overdue"] },
      },
    }),
    getPrisma().payment.findMany({
      where: { paidAt: { gte: monthStart, lte: monthEnd } },
    }),
    getPrisma().monthlyFee.findMany({
      where: {
        referenceMonth: today.getMonth() + 1,
        referenceYear: today.getFullYear(),
      },
      include: { payments: true },
    }),
    getPrisma().monthlyFee.count({
      where: {
        referenceMonth: today.getMonth() + 1,
        referenceYear: today.getFullYear(),
        status: "exempt",
      },
    }),
  ]);

  const minorAthletes = activeAthletesForAge.filter((athlete) =>
    isMinor(athlete.birthDate),
  ).length;
  const minorAthletesWithoutLegalGuardian = minorWithoutLegalGuardianRaw.filter(
    (athlete) => isMinor(athlete.birthDate),
  ).length;
  const birthdaysThisMonth = activeAthletesForAge.filter(
    (athlete) => athlete.birthDate.getMonth() === today.getMonth(),
  ).length;
  const athletesWithoutValidMedicalCertificate = activeAthletesWithDocuments.filter(
    (athlete) =>
      !athlete.documents.some((document) => {
        const expirationDate = document.expirationDate ?? document.expiresAt;
        return (
          isMedicalCertificateName(document.documentType.name) &&
          document.status === "approved" &&
          (!expirationDate || expirationDate >= today)
        );
      }),
  ).length;
  const classesOverCapacity = classesWithCapacity.filter(
    (trainingClass) =>
      trainingClass.capacity !== null &&
      trainingClass.athletes.length > trainingClass.capacity,
  ).length;
  const receivedThisMonth = paymentsThisMonth.reduce(
    (total, payment) => total + payment.amount.toNumber(),
    0,
  );
  const expectedThisMonth = feesThisMonth.reduce(
    (total, fee) => total + netAmount(fee).toNumber(),
    0,
  );

  return {
    activeAthletes: String(activeAthletes),
    minorAthletes: String(minorAthletes),
    minorAthletesWithoutLegalGuardian: String(minorAthletesWithoutLegalGuardian),
    athletesWithoutSchool: String(athletesWithoutSchool),
    athletesWithoutClass: String(athletesWithoutClass),
    incompleteAthleteRecords: String(incompleteAthleteRecords),
    birthdaysThisMonth: String(birthdaysThisMonth),
    pendingDocuments: String(pendingDocuments),
    expiredDocuments: String(expiredDocuments),
    documentsExpiringSoon: String(documentsExpiringSoon),
    documentsUnderReview: String(documentsUnderReview),
    athletesWithoutValidMedicalCertificate: String(athletesWithoutValidMedicalCertificate),
    expiredMedicalCertificates: String(expiredMedicalCertificates),
    pendingCallsToday: "0",
    attendanceToday: String(attendanceToday),
    recentAbsences: String(recentAbsences),
    classesWithLowAttendance: "0",
    classesToday: String(schedulesToday),
    upcomingTrainingSessions: String(activeSchedules),
    classesWithoutTeacher: "0",
    classesOverCapacity: String(classesOverCapacity),
    upcomingCompetitions: String(upcomingCompetitions),
    calledAthletesWithPendingIssues: String(calledAthletesWithPendingIssues),
    competitionsWithoutTeacher: String(competitionsWithoutTeacher),
    recentResults: String(recentResults),
    openMonthlyFees: String(openMonthlyFees),
    overdueMonthlyFees: String(overdueMonthlyFees),
    receivedThisMonth: formatCurrency(receivedThisMonth),
    expectedThisMonth: formatCurrency(expectedThisMonth),
    exemptAthletes: String(exemptAthletes),
  };
}
