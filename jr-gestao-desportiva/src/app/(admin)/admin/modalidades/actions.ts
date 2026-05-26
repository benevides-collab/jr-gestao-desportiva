"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }
}

export async function createModality(formData: FormData) {
  await requireManager();
  await getPrisma().modality.create({
    data: {
      name: text(formData, "name") ?? "",
      description: text(formData, "description"),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
    },
  });

  redirect("/admin/modalidades");
}

export async function updateModality(formData: FormData) {
  await requireManager();
  const id = text(formData, "id");
  if (!id) {
    redirect("/admin/modalidades");
  }

  await getPrisma().modality.update({
    where: { id },
    data: {
      name: text(formData, "name") ?? "",
      description: text(formData, "description"),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
    },
  });

  redirect("/admin/modalidades");
}
