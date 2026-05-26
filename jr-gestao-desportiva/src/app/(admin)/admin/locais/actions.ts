"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function addressData(formData: FormData) {
  const data = {
    postalCode: text(formData, "postalCode"),
    street: text(formData, "street"),
    number: text(formData, "number"),
    complement: text(formData, "complement"),
    neighborhood: text(formData, "neighborhood"),
    city: text(formData, "city"),
    state: text(formData, "state"),
  };

  return Object.values(data).some(Boolean) ? data : null;
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }
}

export async function createTrainingLocation(formData: FormData) {
  await requireManager();
  const address = addressData(formData);

  await getPrisma().trainingLocation.create({
    data: {
      name: text(formData, "name") ?? "",
      mapUrl: text(formData, "mapUrl"),
      accessibility: text(formData, "accessibility"),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
      address: address ? { create: address } : undefined,
    },
  });

  redirect("/admin/locais");
}

export async function updateTrainingLocation(formData: FormData) {
  await requireManager();
  const id = text(formData, "id");
  if (!id) {
    redirect("/admin/locais");
  }

  const current = await getPrisma().trainingLocation.findUnique({
    where: { id },
    include: { address: true },
  });
  if (!current) {
    redirect("/admin/locais");
  }

  const address = addressData(formData);
  await getPrisma().trainingLocation.update({
    where: { id },
    data: {
      name: text(formData, "name") ?? "",
      mapUrl: text(formData, "mapUrl"),
      accessibility: text(formData, "accessibility"),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
      address: address
        ? current.addressId
          ? { update: address }
          : { create: address }
        : undefined,
    },
  });

  redirect("/admin/locais");
}
