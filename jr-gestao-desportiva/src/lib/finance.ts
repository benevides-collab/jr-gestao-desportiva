import type { MonthlyFeeStatus, PaymentMethod } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const monthlyFeeStatusOptions: Array<{
  value: MonthlyFeeStatus;
  label: string;
}> = [
  { value: "open", label: "Em aberto" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Atrasado" },
  { value: "exempt", label: "Isento" },
  { value: "partial", label: "Parcial" },
  { value: "canceled", label: "Cancelado" },
];

export const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "not_informed", label: "Não informado" },
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "bank_transfer", label: "Transferência" },
  { value: "card", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "other", label: "Outro" },
];

export function monthlyFeeStatusLabel(status: MonthlyFeeStatus) {
  return monthlyFeeStatusOptions.find((item) => item.value === status)?.label ?? "Em aberto";
}

export function paymentMethodLabel(method: PaymentMethod | null | undefined) {
  if (method === "credit_card" || method === "debit_card") {
    return "Cartão";
  }

  return paymentMethodOptions.find((item) => item.value === method)?.label ?? "-";
}

export function effectiveMonthlyFeeStatus<T extends {
  status: MonthlyFeeStatus;
  dueDate: Date;
}>(fee: T): MonthlyFeeStatus {
  if (fee.status !== "open") {
    return fee.status;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return fee.dueDate < today ? "overdue" : "open";
}

export function monthlyFeeStatusClass(status: MonthlyFeeStatus) {
  if (status === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "overdue" || status === "canceled") {
    return "border-jr-red/25 bg-jr-red/10 text-jr-red";
  }

  if (status === "partial") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "exempt") {
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export function parseMoney(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const number = Number.parseFloat(normalized);

  if (!Number.isFinite(number) || number < 0) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(number.toFixed(2));
}

export function formatCurrency(value: Prisma.Decimal | number | string | null | undefined) {
  const number = value instanceof Prisma.Decimal ? value.toNumber() : Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(number) ? number : 0);
}

export function paidAmount(payments: Array<{ amount: Prisma.Decimal }>) {
  return payments.reduce(
    (total, payment) => total.plus(payment.amount),
    new Prisma.Decimal(0)
  );
}

export function netAmount(fee: {
  amount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
}) {
  const value = fee.amount.minus(fee.discountAmount);
  return value.lessThan(0) ? new Prisma.Decimal(0) : value;
}

export function outstandingAmount(fee: {
  amount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  payments: Array<{ amount: Prisma.Decimal }>;
}) {
  const balance = netAmount(fee).minus(paidAmount(fee.payments));
  return balance.lessThan(0) ? new Prisma.Decimal(0) : balance;
}

export function nextStatusAfterPayment(fee: {
  amount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  payments: Array<{ amount: Prisma.Decimal }>;
}): MonthlyFeeStatus {
  const paid = paidAmount(fee.payments);
  const total = netAmount(fee);

  if (total.equals(0)) {
    return "exempt";
  }

  if (paid.greaterThanOrEqualTo(total)) {
    return "paid";
  }

  if (paid.greaterThan(0)) {
    return "partial";
  }

  return "open";
}
