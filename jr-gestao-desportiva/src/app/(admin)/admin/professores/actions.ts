"use server";

import type { StaffMemberType } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { uploadStaffPhoto } from "@/lib/supabase-storage";
import { staffRegistrationTypeOptions } from "@/lib/training";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function photo(formData: FormData) {
  const file = formData.get("photo");
  return file instanceof File && file.size > 0 ? file : null;
}

function typeValue(formData: FormData): StaffMemberType {
  const value = text(formData, "type");
  return staffRegistrationTypeOptions.some((option) => option.value === value)
    ? (value as StaffMemberType)
    : "teacher";
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }
}

function redirectWithPhotoError(path: string, error: unknown): never {
  if (
    error instanceof Error &&
    (error.message === "INVALID_PHOTO_TYPE" || error.message === "PHOTO_TOO_LARGE")
  ) {
    redirect(`${path}?erro=foto-invalida`);
  }
  if (error instanceof Error && error.message === "PHOTO_STORAGE_NOT_CONFIGURED") {
    redirect(`${path}?erro=storage-config`);
  }
  redirect(`${path}?erro=storage`);
}

function modalityLinks(formData: FormData) {
  return formData.getAll("modalityId").map((value) => String(value));
}

export async function createStaffMember(formData: FormData) {
  await requireManager();
  const staff = await getPrisma().staffMember.create({
    data: {
      fullName: text(formData, "fullName") ?? "",
      cpf: text(formData, "cpf"),
      rg: text(formData, "rg"),
      phone: text(formData, "phone"),
      whatsapp: text(formData, "whatsapp"),
      email: text(formData, "email"),
      type: typeValue(formData),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
      modalities: {
        create: modalityLinks(formData).map((modalityId) => ({ modalityId })),
      },
    },
  });

  const file = photo(formData);
  if (file) {
    try {
      const photoUrl = await uploadStaffPhoto(file, staff.id);
      await getPrisma().staffMember.update({
        where: { id: staff.id },
        data: { photoUrl },
      });
    } catch (error) {
      redirectWithPhotoError("/admin/professores/novo", error);
    }
  }

  redirect("/admin/professores");
}

export async function updateStaffMember(formData: FormData) {
  await requireManager();
  const id = text(formData, "id");
  if (!id) {
    redirect("/admin/professores");
  }

  const file = photo(formData);
  let photoUrl: string | null | undefined =
    formData.get("removePhoto") === "true" ? null : undefined;

  if (file) {
    try {
      photoUrl = await uploadStaffPhoto(file, id);
    } catch (error) {
      redirectWithPhotoError(`/admin/professores/${id}/editar`, error);
    }
  }

  await getPrisma().staffMember.update({
    where: { id },
    data: {
      fullName: text(formData, "fullName") ?? "",
      ...(photoUrl !== undefined ? { photoUrl } : {}),
      cpf: text(formData, "cpf"),
      rg: text(formData, "rg"),
      phone: text(formData, "phone"),
      whatsapp: text(formData, "whatsapp"),
      email: text(formData, "email"),
      type: typeValue(formData),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
      modalities: {
        deleteMany: {},
        create: modalityLinks(formData).map((modalityId) => ({ modalityId })),
      },
    },
  });

  redirect("/admin/professores");
}
