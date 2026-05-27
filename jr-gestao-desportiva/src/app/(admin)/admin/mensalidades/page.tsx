import Link from "next/link";
import { redirect } from "next/navigation";
import type { AthleteStatus, MonthlyFeeStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { athleteStatusLabels, formatDate } from "@/lib/athletes";
import { getCurrentUser } from "@/lib/auth";
import {
  effectiveMonthlyFeeStatus,
  formatCurrency,
  monthlyFeeStatusClass,
  monthlyFeeStatusLabel,
  monthlyFeeStatusOptions,
  netAmount,
  outstandingAmount,
  paidAmount,
  paymentMethodLabel,
} from "@/lib/finance";
import { canViewMonthlyFees } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type MonthlyFeesPageProps = {
  searchParams: Promise<{
    mes?: string;
    ano?: string;
    dataInicial?: string;
    dataFinal?: string;
    status?: string;
    atleta?: string;
    statusAtleta?: string;
    responsavel?: string;
    modalidade?: string;
    turma?: string;
  }>;
};

export default async function MonthlyFeesPage({
  searchParams,
}: MonthlyFeesPageProps) {
  const user = await getCurrentUser();
  if (!user || !canViewMonthlyFees(user.role)) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const filters = buildFilters(query);
  const athleteWhere = {
    ...(filters.athleteId ? { id: filters.athleteId } : {}),
    ...(filters.athleteStatus ? { status: filters.athleteStatus } : {}),
    ...(filters.modalityId || filters.trainingClassId
      ? {
          classes: {
            some: {
              ...(filters.trainingClassId
                ? { trainingClassId: filters.trainingClassId }
                : {}),
              ...(filters.modalityId
                ? { trainingClass: { modalityId: filters.modalityId } }
                : {}),
            },
          },
        }
      : {}),
  };
  const where = {
    ...(filters.month ? { referenceMonth: filters.month } : {}),
    ...(filters.year ? { referenceYear: filters.year } : {}),
    ...(filters.status && filters.status !== "overdue"
      ? { status: filters.status }
      : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          dueDate: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        }
      : {}),
    ...(Object.keys(athleteWhere).length > 0 ? { athlete: athleteWhere } : {}),
       ...(filters.guardian
      ? {
          financialGuardian: {
            is: {
              fullName: {
                contains: filters.guardian,
                mode: "insensitive" as const,
              },
            },
          },
        }
      : {}),
  };

  const [feesRaw, modalities, classes, athletes] = await Promise.all([
    getPrisma().monthlyFee.findMany({
      where,
      include: {
        athlete: true,
        financialGuardian: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }, { dueDate: "asc" }],
    }),
    getPrisma().modality.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getPrisma().trainingClass.findMany({
      where: { isActive: true },
      include: { modality: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().athlete.findMany({
      select: { id: true, fullName: true, status: true },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const fees =
    filters.status === "overdue"
      ? feesRaw.filter((fee) => effectiveMonthlyFeeStatus(fee) === "overdue")
      : feesRaw;
  const summary = buildSummary(fees);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Mensalidades
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Controle simples de mensalidades, pagamentos, isenções e atrasos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Previsto no mês" value={formatCurrency(summary.expected)} />
        <SummaryCard label="Recebido no mês" value={formatCurrency(summary.received)} />
        <SummaryCard label="Em aberto" value={formatCurrency(summary.open)} />
        <SummaryCard label="Atrasado" value={formatCurrency(summary.overdue)} />
        <SummaryCard label="Inadimplentes" value={String(summary.defaultingAthletes)} />
        <SummaryCard label="Isentos" value={String(summary.exempt)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4">
            <SelectFilter
              label="Atleta"
              name="atleta"
              value={filters.athleteId ?? ""}
              options={[
                { value: "", label: "Todos os atletas" },
                ...athletes.map((athlete) => ({
                  value: athlete.id,
                  label: `${athlete.fullName} - ${athleteStatusLabels[athlete.status]}`,
                })),
              ]}
            />
            <SelectFilter
              label="Status do atleta"
              name="statusAtleta"
              value={filters.athleteStatus ?? ""}
              options={[
                { value: "", label: "Todos" },
                ...Object.entries(athleteStatusLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <TextFilter label="Responsável financeiro" name="responsavel" value={filters.guardian ?? ""} />
            <TextFilter label="Mês" name="mes" value={query.mes ?? ""} />
            <TextFilter label="Ano" name="ano" value={query.ano ?? ""} />
            <SelectFilter
              label="Status"
              name="status"
              value={query.status ?? "all"}
              options={[
                { value: "all", label: "Todos" },
                ...monthlyFeeStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
            <TextFilter label="Data inicial" name="dataInicial" value={query.dataInicial ?? ""} type="date" />
            <TextFilter label="Data final" name="dataFinal" value={query.dataFinal ?? ""} type="date" />
            <SelectFilter
              label="Modalidade"
              name="modalidade"
              value={filters.modalityId ?? ""}
              options={[
                { value: "", label: "Todas" },
                ...modalities.map((modality) => ({ value: modality.id, label: modality.name })),
              ]}
            />
            <SelectFilter
              label="Turma"
              name="turma"
              value={filters.trainingClassId ?? ""}
              options={[
                { value: "", label: "Todas" },
                ...classes.map((item) => ({
                  value: item.id,
                  label: `${item.name} - ${item.modality.name}`,
                })),
              ]}
            />
            <div className="flex items-end justify-end gap-2 lg:col-span-3">
              <Button asChild variant="secondary">
                <Link href="/admin/mensalidades">Limpar</Link>
              </Button>
              <Button type="submit">Filtrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {fees.map((fee) => {
                const status = effectiveMonthlyFeeStatus(fee);
                const lastPayment = fee.payments[0];

                return (
                  <tr key={fee.id}>
                    <td className="px-4 py-3 font-bold text-zinc-950">
                      <Link href={`/admin/atletas/${fee.athleteId}?aba=financeiro`}>
                        {fee.athlete.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {fee.financialGuardian?.fullName ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {fee.referenceMonth.toString().padStart(2, "0")}/{fee.referenceYear}
                    </td>
                    <td className="px-4 py-3">{formatDate(fee.dueDate)}</td>
                    <td className="px-4 py-3">
                      <Badge className={monthlyFeeStatusClass(status)}>
                        {monthlyFeeStatusLabel(status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(fee.amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(paidAmount(fee.payments))}</td>
                    <td className="px-4 py-3">{formatCurrency(outstandingAmount(fee))}</td>
                    <td className="px-4 py-3">
                      {lastPayment ? paymentMethodLabel(lastPayment.method) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {fees.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-zinc-600">
              Nenhuma mensalidade encontrada.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function buildFilters(query: Awaited<MonthlyFeesPageProps["searchParams"]>) {
  const month = query.mes ? Number.parseInt(query.mes, 10) : Number.NaN;
  const year = query.ano ? Number.parseInt(query.ano, 10) : Number.NaN;
  const dateFrom = query.dataInicial ? new Date(`${query.dataInicial}T00:00:00.000Z`) : null;
  const dateTo = query.dataFinal ? new Date(`${query.dataFinal}T23:59:59.999Z`) : null;
  const status =
    query.status && query.status !== "all"
      ? monthlyFeeStatusOptions.find((option) => option.value === query.status)?.value
      : null;
  const athleteStatus = Object.keys(athleteStatusLabels).includes(
    query.statusAtleta ?? ""
  )
    ? (query.statusAtleta as AthleteStatus)
    : null;

  return {
    month: Number.isFinite(month) ? month : null,
    year: Number.isFinite(year) ? year : null,
    status: status as MonthlyFeeStatus | null,
    dateFrom,
    dateTo,
    athleteId: query.atleta || null,
    athleteStatus,
    guardian: query.responsavel?.trim() || null,
    modalityId: query.modalidade || null,
    trainingClassId: query.turma || null,
  };
}

function buildSummary(fees: Array<{
  id: string;
  athleteId: string;
  status: MonthlyFeeStatus;
  dueDate: Date;
  amount: { toNumber: () => number } | number | string;
  discountAmount: { toNumber: () => number } | number | string;
  payments: Array<{ amount: { toNumber: () => number } | number | string }>;
}>) {
  const expected = fees
    .filter((fee) => !["exempt", "canceled"].includes(fee.status))
    .reduce((total, fee) => total + netAmount(fee), 0);
  const received = fees.reduce((total, fee) => total + paidAmount(fee.payments), 0);
  const open = fees.reduce((total, fee) => total + outstandingAmount(fee), 0);
  const overdue = fees
    .filter((fee) => effectiveMonthlyFeeStatus(fee) === "overdue")
    .reduce((total, fee) => total + outstandingAmount(fee), 0);
  const defaultingAthletes = new Set(
    fees
      .filter((fee) => effectiveMonthlyFeeStatus(fee) === "overdue")
      .map((fee) => fee.athleteId)
  ).size;

  return {
    expected,
    received,
    open,
    overdue,
    defaultingAthletes,
    exempt: fees.filter((fee) => fee.status === "exempt").length,
  };
}

function TextFilter({
  label,
  name,
  value,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={value} />
    </div>
  );
}

function SelectFilter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
        <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
      </CardContent>
    </Card>
  );
}
