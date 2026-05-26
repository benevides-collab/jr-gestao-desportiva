"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  dashboardCardDefinitions,
  dashboardCardIsAllowed,
  type DashboardCardId,
} from "@/lib/dashboard-config";
import { canAccess } from "@/lib/permissions";
import { profiles, type Profile } from "@/lib/roles";
import {
  getSystemSettings,
  saveSystemSettings,
  type SystemSettings,
} from "@/lib/system-settings";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function updateSystemSettings(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || !canAccess(user.role, ["SUPER_ADMIN"])) {
    redirect("/acesso-negado");
  }

  const current = await getSystemSettings();
  const dashboard = profiles.reduce(
    (settings, profile) => {
      settings[profile] = dashboardCardDefinitions
        .filter((card) => dashboardCardIsAllowed(profile, card.id))
        .filter((card) => checkbox(formData, `dashboard.${profile}.${card.id}`))
        .map((card) => card.id);

      return settings;
    },
    {} as Record<Profile, DashboardCardId[]>,
  );

  const nextSettings: SystemSettings = {
    association: {
      name: value(formData, "association.name") || current.association.name,
      cnpj: value(formData, "association.cnpj"),
      email: value(formData, "association.email"),
      phone: value(formData, "association.phone"),
      whatsapp: value(formData, "association.whatsapp"),
      address: value(formData, "association.address"),
      logoPath: current.association.logoPath,
    },
    currentYear: {
      year: value(formData, "currentYear.year"),
      documentPeriodStart: value(formData, "currentYear.documentPeriodStart"),
      documentPeriodEnd: value(formData, "currentYear.documentPeriodEnd"),
    },
    alerts: {
      documentExpiringDays: value(formData, "alerts.documentExpiringDays"),
      medicalCertificateExpiringDays: value(
        formData,
        "alerts.medicalCertificateExpiringDays",
      ),
      overdueMonthlyFeeRule: value(formData, "alerts.overdueMonthlyFeeRule"),
    },
    monthlyFees: {
      defaultAmount: value(formData, "monthlyFees.defaultAmount"),
      defaultDueDay: value(formData, "monthlyFees.defaultDueDay"),
      allowExemption: checkbox(formData, "monthlyFees.allowExemption"),
      allowPartialPayment: checkbox(formData, "monthlyFees.allowPartialPayment"),
    },
    dashboard,
  };

  await saveSystemSettings(nextSettings);
  redirect("/admin/configuracoes?salvo=1");
}

