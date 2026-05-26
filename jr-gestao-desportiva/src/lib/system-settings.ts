import "server-only";

import type { Prisma } from "@prisma/client";

import {
  dashboardCardDefinitions,
  type DashboardCardId,
} from "@/lib/dashboard-config";
import { getPrisma } from "@/lib/prisma";
import { profiles, type Profile } from "@/lib/roles";

export type SystemSettings = {
  association: {
    name: string;
    cnpj: string;
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    logoPath: string;
  };
  currentYear: {
    year: string;
    documentPeriodStart: string;
    documentPeriodEnd: string;
  };
  alerts: {
    documentExpiringDays: string;
    medicalCertificateExpiringDays: string;
    overdueMonthlyFeeRule: string;
  };
  monthlyFees: {
    defaultAmount: string;
    defaultDueDay: string;
    allowExemption: boolean;
    allowPartialPayment: boolean;
  };
  dashboard: Record<Profile, DashboardCardId[]>;
};

const settingsKey = "general";
const currentYear = new Date().getFullYear();

export const defaultSystemSettings: SystemSettings = {
  association: {
    name: "Associação Paradesportiva JR-SP",
    cnpj: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    logoPath: "/public/brand/logo-jr-sp.png",
  },
  currentYear: {
    year: String(currentYear),
    documentPeriodStart: `${currentYear}-01-01`,
    documentPeriodEnd: `${currentYear}-12-31`,
  },
  alerts: {
    documentExpiringDays: "30",
    medicalCertificateExpiringDays: "30",
    overdueMonthlyFeeRule: "Vencimento anterior a hoje e status em aberto/parcial.",
  },
  monthlyFees: {
    defaultAmount: "",
    defaultDueDay: "",
    allowExemption: true,
    allowPartialPayment: true,
  },
  dashboard: profiles.reduce(
    (settings, profile) => ({
      ...settings,
      [profile]: dashboardCardDefinitions
        .filter(
          (card) =>
            (profile === "SUPER_ADMIN" || card.allowedProfiles.includes(profile)) &&
            card.defaultEnabledProfiles.includes(profile),
        )
        .map((card) => card.id),
    }),
    {} as Record<Profile, DashboardCardId[]>,
  ),
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const row = await getPrisma().systemSetting.findUnique({
    where: { key: settingsKey },
  });

  if (!row) {
    return defaultSystemSettings;
  }

  return mergeSettings(row.value);
}

export async function saveSystemSettings(settings: SystemSettings) {
  await getPrisma().systemSetting.upsert({
    where: { key: settingsKey },
    create: {
      key: settingsKey,
      value: settings as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: settings as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function dashboardCardsForProfileFromSettings(profile: Profile) {
  const settings = await getSystemSettings();
  const enabledIds = new Set(settings.dashboard[profile] ?? []);

  return dashboardCardDefinitions.filter(
    (card) =>
      enabledIds.has(card.id) &&
      (profile === "SUPER_ADMIN" || card.allowedProfiles.includes(profile)),
  );
}

function mergeSettings(value: Prisma.JsonValue): SystemSettings {
  const raw = typeof value === "object" && value !== null ? value : {};
  const incoming = raw as Partial<SystemSettings>;

  return {
    association: {
      ...defaultSystemSettings.association,
      ...(incoming.association ?? {}),
    },
    currentYear: {
      ...defaultSystemSettings.currentYear,
      ...(incoming.currentYear ?? {}),
    },
    alerts: {
      ...defaultSystemSettings.alerts,
      ...(incoming.alerts ?? {}),
    },
    monthlyFees: {
      ...defaultSystemSettings.monthlyFees,
      ...(incoming.monthlyFees ?? {}),
    },
    dashboard: {
      ...defaultSystemSettings.dashboard,
      ...(incoming.dashboard ?? {}),
    },
  };
}

