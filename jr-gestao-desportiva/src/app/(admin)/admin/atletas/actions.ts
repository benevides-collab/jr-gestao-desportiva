"use server";

import { AthleteStatus, Gender } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { registerAuditLog } from "@/lib/audit";
import { isFutureDate } from "@/lib/athletes";
import { canManageAthletes } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { uploadAthletePhoto } from "@/lib/supabase-storage";

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : null;
}

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);

  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function requiredDate(formData: FormData, key: string) {
  return new Date(`${requiredString(formData, key)}T00:00:00.000Z`);
}

function getAddressData(formData: FormData) {
  const data = {
    postalCode: optionalString(formData, "postalCode"),
    street: optionalString(formData, "street"),
    number: optionalString(formData, "number"),
    complement: optionalString(formData, "complement"),
    neighborhood: optionalString(formData, "neighborhood"),
    city: optionalString(formData, "city"),
    state: optionalString(formData, "state"),
  };

  return Object.values(data).some(Boolean) ? data : null;
}

function getPhotoFile(formData: FormData) {
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return null;
  }

  return photo;
}

function photoErrorRedirect(error: unknown, path: string): never {
  if (
    error instanceof Error &&
    (error.message === "INVALID_PHOTO_TYPE" || error.message === "PHOTO_TOO_LARGE")
  ) {
    redirect(`${path}?erro=foto-invalida`);
  }

  if (
    error instanceof Error &&
    error.message === "PHOTO_STORAGE_NOT_CONFIGURED"
  ) {
    redirect(`${path}?erro=storage-config`);
  }

  redirect(`${path}?erro=storage`);
}

async function requireAthleteManager() {
  const user = await getCurrentUser();

  if (!user || !canManageAthletes(user.role)) {
    redirect("/acesso-negado");
  }

  return user;
}

export async function createAthlete(formData: FormData) {
  const user = await requireAthleteManager();
  const birthDate = requiredDate(formData, "birthDate");
  const joinedAt = optionalDate(formData, "joinedAt");

  if (isFutureDate(birthDate)) {
    redirect("/admin/atletas/novo?erro=data-futura");
  }

  if (joinedAt && isFutureDate(joinedAt)) {
    redirect("/admin/atletas/novo?erro=entrada-futura");
  }

  const addressData = getAddressData(formData);
  const athlete = await getPrisma().athlete.create({
    data: {
      fullName: requiredString(formData, "fullName"),
      preferredName: optionalString(formData, "preferredName"),
      birthDate,
      cpf: optionalString(formData, "cpf"),
      rg: optionalString(formData, "rg"),
      phone: optionalString(formData, "phone"),
      email: optionalString(formData, "email"),
      gender: requiredString(formData, "gender") as Gender,
      status: requiredString(formData, "status") as AthleteStatus,
      joinedAt,
      notes: optionalString(formData, "notes"),
      address: addressData ? { create: addressData } : undefined,
    },
  });

  const photo = getPhotoFile(formData);

  if (photo) {
    try {
      const photoUrl = await uploadAthletePhoto(photo, athlete.id);
      if (photoUrl) {
        await getPrisma().athlete.update({
          where: { id: athlete.id },
          data: { photoUrl },
        });
      }
    } catch (error) {
      photoErrorRedirect(error, "/admin/atletas/novo");
    }
  }

  await registerAuditLog({
    user,
    action: "create",
    entity: "Athlete",
    entityId: athlete.id,
    newValues: {
      fullName: athlete.fullName,
      status: athlete.status,
    },
  });

  redirect(`/admin/atletas/${athlete.id}`);
}

export async function updateAthlete(formData: FormData) {
  const user = await requireAthleteManager();
  const athleteId = requiredString(formData, "athleteId");
  const birthDate = requiredDate(formData, "birthDate");
  const joinedAt = optionalDate(formData, "joinedAt");

  if (isFutureDate(birthDate)) {
    redirect(`/admin/atletas/${athleteId}/editar?erro=data-futura`);
  }

  if (joinedAt && isFutureDate(joinedAt)) {
    redirect(`/admin/atletas/${athleteId}/editar?erro=entrada-futura`);
  }

  const currentAthlete = await getPrisma().athlete.findUnique({
    where: { id: athleteId },
    include: { address: true },
  });

  if (!currentAthlete) {
    redirect("/admin/atletas");
  }

  const addressData = getAddressData(formData);
  const photo = getPhotoFile(formData);
  let photoUrl: string | null | undefined =
    formData.get("removePhoto") === "true" ? null : undefined;

  if (photo) {
    try {
      const uploadedPhotoUrl = await uploadAthletePhoto(photo, athleteId);
      if (uploadedPhotoUrl) {
        photoUrl = uploadedPhotoUrl;
      }
    } catch (error) {
      photoErrorRedirect(error, `/admin/atletas/${athleteId}/editar`);
    }
  }

  const athlete = await getPrisma().athlete.update({
    where: { id: athleteId },
    data: {
      fullName: requiredString(formData, "fullName"),
      preferredName: optionalString(formData, "preferredName"),
      ...(photoUrl !== undefined ? { photoUrl } : {}),
      birthDate,
      cpf: optionalString(formData, "cpf"),
      rg: optionalString(formData, "rg"),
      phone: optionalString(formData, "phone"),
      email: optionalString(formData, "email"),
      gender: requiredString(formData, "gender") as Gender,
      status: requiredString(formData, "status") as AthleteStatus,
      joinedAt,
      notes: optionalString(formData, "notes"),
      address: addressData
        ? currentAthlete.addressId
          ? { update: addressData }
          : { create: addressData }
        : undefined,
    },
  });

  await registerAuditLog({
    user,
    action: "update",
    entity: "Athlete",
    entityId: athlete.id,
    oldValues: {
      fullName: currentAthlete.fullName,
      status: currentAthlete.status,
    },
    newValues: {
      fullName: athlete.fullName,
      status: athlete.status,
    },
  });

  redirect(`/admin/atletas/${athlete.id}`);
}

export async function inactivateAthlete(formData: FormData) {
  const user = await requireAthleteManager();
  const athleteId = requiredString(formData, "athleteId");

  const currentAthlete = await getPrisma().athlete.findUnique({
    where: { id: athleteId },
  });

  if (!currentAthlete) {
    redirect("/admin/atletas");
  }

  const athlete = await getPrisma().athlete.update({
    where: { id: athleteId },
    data: { status: "inactive" },
  });

  await registerAuditLog({
    user,
    action: "inactivate",
    entity: "Athlete",
    entityId: athlete.id,
    oldValues: { status: currentAthlete.status },
    newValues: { status: athlete.status },
  });

  redirect(`/admin/atletas/${athlete.id}`);
}
