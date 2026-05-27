"use server";

import { redirect } from "next/navigation";
import type { MonthlyFeeStatus, PaymentMethod } from "@prisma/client";

import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  monthlyFeeStatusOptions,
  nextStatusAfterPayment,
  parseMoney,
  paymentMethodOptions,
} from "@/lib/finance";
import { canManageMonthlyFees } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    throw new Error(`Campo obrigatÃ³rio: ${key}`);
  }
  return value;
}

function numberValue(formData: FormData, key: string) {
  const value = requiredText(formData, key);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Campo invÃ¡lido: ${key}`);
  }
  return parsed;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function requiredDate(formData: FormData, key: string) {
  return optionalDate(formData, key) ?? new Date();
}

function statusValue(formData: FormData): MonthlyFeeStatus {
  const value = text(formData, "status");
  return monthlyFeeStatusOptions.some((option) => option.value === value)
    ? (value as MonthlyFeeStatus)
    : "open";
}

function paymentMethodValue(formData: FormData): PaymentMethod {
  const value = text(formData, "paymentMethod");
  if (value === "credit_card" || value === "debit_card") {
    return value;
  }

  return paymentMethodOptions.some((option) => option.value === value)
    ? (value as PaymentMethod)
    : "not_informed";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function resolveDatabaseUser(sessionUser: SessionUser) {
  const candidates = [
    isUuid(sessionUser.id) ? { id: sessionUser.id } : null,
    { email: sessionUser.email.toLowerCase() },
    process.env.ADMIN_EMAIL
      ? { email: process.env.ADMIN_EMAIL.toLowerCase() }
      : null,
    { email: "admin@jrdesportos.local" },
  ].filter(Boolean) as Array<{ id?: string; email?: string }>;

  for (const candidate of candidates) {
    const user = await getPrisma().user.findFirst({
      where: {
        isActive: true,
        ...(candidate.id ? { id: candidate.id } : {}),
        ...(candidate.email ? { email: candidate.email } : {}),
      },
      select: { id: true },
    });

    if (user) {
      return user;
    }
  }

  return null;
}

async function requireFinanceManager() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !canManageMonthlyFees(sessionUser.role)) {
    redirect("/acesso-negado");
  }
  return sessionUser;
}

async function requireDatabaseFinanceManager() {
  const sessionUser = await requireFinanceManager();
  const dbUser = await resolveDatabaseUser(sessionUser);
  if (!dbUser) {
    throw new Error("UsuÃ¡rio nÃ£o autenticado ou invÃ¡lido.");
  }
  return dbUser;
}

export async function createMonthlyFee(formData: FormData) {
  await requireFinanceManager();
  const athleteId = requiredText(formData, "athleteId");
  const referenceMonth = numberValue(formData, "referenceMonth");
  const referenceYear = numberValue(formData, "referenceYear");
  const status = statusValue(formData);
  const amount = parseMoney(text(formData, "amount"));
  const discountAmount = parseMoney(text(formData, "discountAmount"));

  await getPrisma().monthlyFee.upsert({
    where: {
      athleteId_referenceMonth_referenceYear: {
        athleteId,
        referenceMonth,
        referenceYear,
      },
    },
    create: {
      athleteId,
      financialGuardianId: text(formData, "financialGuardianId"),
      referenceMonth,
      referenceYear,
      amount,
      discountAmount,
      dueDate: requiredDate(formData, "dueDate"),
      status,
      notes: text(formData, "notes"),
    },
    update: {
      financialGuardianId: text(formData, "financialGuardianId"),
      amount,
      discountAmount,
      dueDate: requiredDate(formData, "dueDate"),
      status,
      notes: text(formData, "notes"),
    },
  });

  redirect(`/admin/atletas/${athleteId}?aba=financeiro`);
}

export async function updateAthleteMonthlyFeeAmount(formData: FormData) {
  await requireFinanceManager();
  const athleteId = requiredText(formData, "athleteId");
  const monthlyFeeAmount = parseMoney(text(formData, "monthlyFeeAmount"));

  await getPrisma().athlete.update({
    where: { id: athleteId },
data: {
  monthlyFeeAmount: Number(monthlyFeeAmount) > 0 ? monthlyFeeAmount : null,
},
  });

  redirect(`/admin/atletas/${athleteId}?aba=financeiro`);
}

export async function registerPayment(formData: FormData) {
  const user = await requireDatabaseFinanceManager();
  const monthlyFeeId = requiredText(formData, "monthlyFeeId");
  const athleteId = requiredText(formData, "athleteId");
  const amount = parseMoney(text(formData, "amountPaid"));

  if (Number(amount) <= 0) {
    redirect(`/admin/atletas/${athleteId}?aba=financeiro&erro=valor-pagamento`);
  }

  await getPrisma().$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        monthlyFeeId,
        amount,
        paidAt: requiredDate(formData, "paidAt"),
        method: paymentMethodValue(formData),
        notes: text(formData, "paymentNotes"),
        recordedByUserId: user.id,
      },
    });

    const fee = await tx.monthlyFee.findUniqueOrThrow({
      where: { id: monthlyFeeId },
      include: { payments: true },
    });

    if (fee.status !== "exempt" && fee.status !== "canceled") {
      await tx.monthlyFee.update({
        where: { id: monthlyFeeId },
        data: { status: nextStatusAfterPayment(fee) },
      });
    }
  });

  redirect(`/admin/atletas/${athleteId}?aba=financeiro`);
}

export async function markMonthlyFeeExempt(formData: FormData) {
  await requireFinanceManager();
  const monthlyFeeId = requiredText(formData, "monthlyFeeId");
  const athleteId = requiredText(formData, "athleteId");

  await getPrisma().monthlyFee.update({
    where: { id: monthlyFeeId },
    data: {
      status: "exempt",
      notes: text(formData, "notes"),
    },
  });

  redirect(`/admin/atletas/${athleteId}?aba=financeiro`);
}

export async function cancelMonthlyFee(formData: FormData) {
  await requireFinanceManager();
  const monthlyFeeId = requiredText(formData, "monthlyFeeId");
  const athleteId = requiredText(formData, "athleteId");

  await getPrisma().monthlyFee.update({
    where: { id: monthlyFeeId },
    data: {
      status: "canceled",
      notes: text(formData, "notes"),
    },
  });

  redirect(`/admin/atletas/${athleteId}?aba=financeiro`);
}

