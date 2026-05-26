import { redirect } from "next/navigation";
import type { MonthlyFeeStatus, Prisma } from "@prisma/client";

import {
  FilterActions,
  ReportPageHeader,
  SelectFilter,
  SummaryCard,
  TextFilter,
} from "@/components/app/report-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  effectiveMonthlyFeeStatus,
  formatCurrency,
  monthlyFeeStatusLabel,
  monthlyFeeStatusOptions,
  netAmount,
  outstandingAmount,
  paidAmount,
  paymentMethodLabel,
} from "@/lib/finance";
import { canViewFinancialReports } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MonthlyFeesReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewFinancialReports(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const month = query.mes ?? "";
  const year = query.ano ?? "";
  const dueFrom = query.inicio ?? "";
  const dueTo = query.fim ?? "";
  const status = query.status ?? "";
  const athleteId = query.atleta ?? "";
  const guardianId = query.responsavel ?? "";
  const modalityId = query.modalidade ?? "";
  const trainingClassId = query.turma ?? "";

  const where: Prisma.MonthlyFeeWhereInput = {
    ...(month ? { referenceMonth: Number.parseInt(month, 10) } : {}),
    ...(year ? { referenceYear: Number.parseInt(year, 10) } : {}),
    ...(athleteId ? { athleteId } : {}),
    ...(guardianId ? { financialGuardianId: guardianId } : {}),
    ...(status && status !== "overdue" ? { status: status as MonthlyFeeStatus } : {}),
    ...(dueFrom || dueTo
      ? {
          dueDate: {
            ...(dueFrom ? { gte: new Date(`${dueFrom}T00:00:00.000Z`) } : {}),
            ...(dueTo ? { lte: new Date(`${dueTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(modalityId || trainingClassId
      ? {
          athlete: {
            classes: {
              some: {
                ...(trainingClassId ? { trainingClassId } : {}),
                ...(modalityId ? { trainingClass: { modalityId } } : {}),
              },
            },
          },
        }
      : {}),
  };

  const [feesRaw, athletes, guardians, modalities, classes] = await Promise.all([
    getPrisma().monthlyFee.findMany({
      where,
      include: {
        athlete: true,
        financialGuardian: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }, { dueDate: "asc" }],
    }),
    getPrisma().athlete.findMany({
      select: { id: true, fullName: true, preferredName: true },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().guardian.findMany({
      where: { athletes: { some: { isFinancialGuardian: true } } },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const fees =
    status === "overdue"
      ? feesRaw.filter((fee) => effectiveMonthlyFeeStatus(fee) === "overdue")
      : feesRaw;
  const totalExpected = fees.reduce((total, fee) => total + netAmount(fee).toNumber(), 0);
  const totalPaid = fees.reduce((total, fee) => total + paidAmount(fee.payments).toNumber(), 0);
  const totalOpen = fees.reduce((total, fee) => total + outstandingAmount(fee).toNumber(), 0);
  const overdue = fees.filter((fee) => effectiveMonthlyFeeStatus(fee) === "overdue");
  const exportHref = `/admin/relatorios/mensalidades/exportar?${new URLSearchParams(
    Object.entries(query).filter(([, value]) => value) as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-6">
      <ReportPageHeader
        title="Relatório de mensalidades"
        description="Acompanhamento financeiro simples por competência, status e responsável."
        exportHref={exportHref}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Previsto" value={formatCurrency(totalExpected)} />
        <SummaryCard label="Recebido" value={formatCurrency(totalPaid)} />
        <SummaryCard label="Em aberto" value={formatCurrency(totalOpen)} />
        <SummaryCard
          label="Atrasado"
          value={formatCurrency(
            overdue.reduce((total, fee) => total + outstandingAmount(fee).toNumber(), 0),
          )}
        />
        <SummaryCard
          label="Isentos"
          value={String(fees.filter((fee) => fee.status === "exempt").length)}
        />
        <SummaryCard
          label="Parciais"
          value={String(fees.filter((fee) => fee.status === "partial").length)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <TextFilter label="Mês" name="mes" value={month} type="number" />
            <TextFilter label="Ano" name="ano" value={year} type="number" />
            <TextFilter label="Vencimento inicial" name="inicio" value={dueFrom} type="date" />
            <TextFilter label="Vencimento final" name="fim" value={dueTo} type="date" />
            <SelectFilter
              label="Status"
              name="status"
              value={status}
              options={[
                { value: "", label: "Todos" },
                ...monthlyFeeStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
            <SelectFilter
              label="Atleta"
              name="atleta"
              value={athleteId}
              options={[
                { value: "", label: "Todos" },
                ...athletes.map((athlete) => ({
                  value: athlete.id,
                  label: athlete.preferredName
                    ? `${athlete.fullName} (${athlete.preferredName})`
                    : athlete.fullName,
                })),
              ]}
            />
            <SelectFilter
              label="Responsável financeiro"
              name="responsavel"
              value={guardianId}
              options={[
                { value: "", label: "Todos" },
                ...guardians.map((guardian) => ({ value: guardian.id, label: guardian.fullName })),
              ]}
            />
            <SelectFilter
              label="Modalidade"
              name="modalidade"
              value={modalityId}
              options={[
                { value: "", label: "Todas" },
                ...modalities.map((modality) => ({ value: modality.id, label: modality.name })),
              ]}
            />
            <SelectFilter
              label="Turma"
              name="turma"
              value={trainingClassId}
              options={[
                { value: "", label: "Todas" },
                ...classes.map((item) => ({
                  value: item.id,
                  label: `${item.name} - ${item.modality.name}`,
                })),
              ]}
            />
            <FilterActions clearHref="/admin/relatorios/mensalidades" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Forma</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {fees.map((fee) => {
                const lastPayment = fee.payments[0];
                return (
                  <tr key={fee.id}>
                    <td className="px-4 py-3 font-bold text-zinc-950">{fee.athlete.fullName}</td>
                    <td className="px-4 py-3">{fee.financialGuardian?.fullName ?? "-"}</td>
                    <td className="px-4 py-3">
                      {String(fee.referenceMonth).padStart(2, "0")}/{fee.referenceYear}
                    </td>
                    <td className="px-4 py-3">{formatDate(fee.dueDate)}</td>
                    <td className="px-4 py-3">{formatCurrency(fee.amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(fee.discountAmount)}</td>
                    <td className="px-4 py-3">{formatCurrency(paidAmount(fee.payments))}</td>
                    <td className="px-4 py-3">{formatCurrency(outstandingAmount(fee))}</td>
                    <td className="px-4 py-3">
                      {monthlyFeeStatusLabel(effectiveMonthlyFeeStatus(fee))}
                    </td>
                    <td className="px-4 py-3">{paymentMethodLabel(lastPayment?.method)}</td>
                    <td className="px-4 py-3">{formatDate(lastPayment?.paidAt)}</td>
                    <td className="px-4 py-3">{fee.notes ?? lastPayment?.notes ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

