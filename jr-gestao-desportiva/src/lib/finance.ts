import type { MonthlyFeeStatus, PaymentMethod } from "@prisma/client";

type MoneyValue =
  | number
  | string
  | {
      toNumber: () => number;
    }
  | null
  | undefined;

function toNumber(value: MoneyValue) {
  if (value && typeof value === "object" && "toNumber" in value) {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

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
    return "0.00";
  }

  return number.toFixed(2);
}

export function formatCurrency(value: MoneyValue) {
  const number = toNumber(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(number) ? number : 0);
}

export function paidAmount(payments: Array<{ amount: MoneyValue }>) {
  return payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
}

export function netAmount(fee: {
  amount: MoneyValue;
  discountAmount: MoneyValue;
}) {
  const value = toNumber(fee.amount) - toNumber(fee.discountAmount);
  return value < 0 ? 0 : value;
}

export function outstandingAmount(fee: {
  amount: MoneyValue;
  discountAmount: MoneyValue;
  payments: Array<{ amount: MoneyValue }>;
}) {
  const balance = netAmount(fee) - paidAmount(fee.payments);
  return balance < 0 ? 0 : balance;
}

export function nextStatusAfterPayment(fee: {
  amount: MoneyValue;
  discountAmount: MoneyValue;
  payments: Array<{ amount: MoneyValue }>;
}): MonthlyFeeStatus {
  const paid = paidAmount(fee.payments);
  const total = netAmount(fee);

  if (total === 0) {
    return "exempt";
  }

  if (paid >= total) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "open";
}
