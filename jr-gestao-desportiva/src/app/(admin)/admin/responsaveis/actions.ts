"use server";

import { GuardianType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { registerAuditLog } from "@/lib/audit";
import { guardianTypeFromRelationship, relationshipOptions } from "@/lib/guardians";
import { canManageGuardians } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { uploadGuardianPhoto } from "@/lib/supabase-storage";

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : null;
}

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
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

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}erro=${error}`;
}

function photoErrorRedirect(error: unknown, path: string): never {
  if (
    error instanceof Error &&
    (error.message === "INVALID_PHOTO_TYPE" || error.message === "PHOTO_TOO_LARGE")
  ) {
    redirect(withError(path, "foto-invalida"));
  }

  if (
    error instanceof Error &&
    error.message === "PHOTO_STORAGE_NOT_CONFIGURED"
  ) {
    redirect(withError(path, "storage-config"));
  }

  redirect(withError(path, "storage"));
}

function getLinkData(formData: FormData) {
  const relationship = requiredString(formData, "relationship");
  const validRelationship = relationshipOptions.some(
    (option) => option.value === relationship
  );
  const normalizedRelationship = validRelationship ? relationship : "other";

  return {
    relationship: normalizedRelationship,
    isPrimary: checkbox(formData, "isLegalGuardian"),
    isLegalGuardian: checkbox(formData, "isLegalGuardian"),
    isFinancialGuardian: checkbox(formData, "isFinancialGuardian"),
    isEmergencyContact: checkbox(formData, "isEmergencyContact"),
    canPickup: checkbox(formData, "canPickup"),
    notes: optionalString(formData, "linkNotes"),
  };
}

async function requireGuardianManager() {
  const user = await getCurrentUser();

  if (!user || !canManageGuardians(user.role)) {
    redirect("/acesso-negado");
  }

  return user;
}

async function findDuplicateGuardian(formData: FormData, ignoredId?: string) {
  const cpf = optionalString(formData, "cpf");
  const email = optionalString(formData, "email");
  const phone = optionalString(formData, "phone");
  const or: Prisma.GuardianWhereInput[] = [];

  if (cpf) {
    or.push({ cpf });
  }

  if (email) {
    or.push({ email });
  }

  if (phone) {
    or.push({ phone });
  }

  if (or.length === 0) {
    return null;
  }

  return getPrisma().guardian.findFirst({
    where: {
      ...(ignoredId ? { id: { not: ignoredId } } : {}),
      OR: or,
    },
  });
}

export async function createGuardian(formData: FormData) {
  const user = await requireGuardianManager();
  const athleteId = optionalString(formData, "athleteId");
  const redirectPath = athleteId
    ? `/admin/responsaveis/novo?athleteId=${athleteId}`
    : "/admin/responsaveis/novo";
  const errorSeparator = redirectPath.includes("?") ? "&" : "?";
  const relationship = requiredString(formData, "relationship");

  if (await findDuplicateGuardian(formData)) {
    redirect(`${redirectPath}${errorSeparator}erro=duplicado`);
  }

  const addressData = getAddressData(formData);
  const guardian = await getPrisma().guardian.create({
    data: {
      fullName: requiredString(formData, "fullName"),
      cpf: optionalString(formData, "cpf"),
      rg: optionalString(formData, "rg"),
      phone: optionalString(formData, "phone"),
      whatsapp: optionalString(formData, "whatsapp"),
      email: optionalString(formData, "email"),
      type: guardianTypeFromRelationship(relationship) as GuardianType,
      notes: optionalString(formData, "notes"),
      address: addressData ? { create: addressData } : undefined,
      athletes: athleteId
        ? {
            create: {
              athleteId,
              ...getLinkData(formData),
            },
          }
        : undefined,
    },
  });

  const photo = getPhotoFile(formData);

  if (photo) {
    try {
      const photoUrl = await uploadGuardianPhoto(photo, guardian.id);
      await getPrisma().guardian.update({
        where: { id: guardian.id },
        data: { photoUrl },
      });
    } catch (error) {
      photoErrorRedirect(error, redirectPath);
    }
  }

  await registerAuditLog({
    user,
    action: "create",
    entity: "Guardian",
    entityId: guardian.id,
    newValues: { fullName: guardian.fullName },
  });

  redirect(athleteId ? `/admin/atletas/${athleteId}?aba=responsaveis` : "/admin/responsaveis");
}

export async function updateGuardian(formData: FormData) {
  const user = await requireGuardianManager();
  const guardianId = requiredString(formData, "guardianId");
  const redirectPath = `/admin/responsaveis/${guardianId}/editar`;
  const currentGuardian = await getPrisma().guardian.findUnique({
    where: { id: guardianId },
    include: { address: true },
  });

  if (!currentGuardian) {
    redirect("/admin/responsaveis");
  }

  if (await findDuplicateGuardian(formData, guardianId)) {
    redirect(`${redirectPath}?erro=duplicado`);
  }

  const addressData = getAddressData(formData);
  const photo = getPhotoFile(formData);
  let photoUrl: string | null | undefined =
    formData.get("removePhoto") === "true" ? null : undefined;

  if (photo) {
    try {
      photoUrl = await uploadGuardianPhoto(photo, guardianId);
    } catch (error) {
      photoErrorRedirect(error, redirectPath);
    }
  }

  const relationship = requiredString(formData, "relationship");
  const guardian = await getPrisma().guardian.update({
    where: { id: guardianId },
    data: {
      fullName: requiredString(formData, "fullName"),
      ...(photoUrl !== undefined ? { photoUrl } : {}),
      cpf: optionalString(formData, "cpf"),
      rg: optionalString(formData, "rg"),
      phone: optionalString(formData, "phone"),
      whatsapp: optionalString(formData, "whatsapp"),
      email: optionalString(formData, "email"),
      type: guardianTypeFromRelationship(relationship) as GuardianType,
      notes: optionalString(formData, "notes"),
      address: addressData
        ? currentGuardian.addressId
          ? { update: addressData }
          : { create: addressData }
        : undefined,
    },
  });

  await registerAuditLog({
    user,
    action: "update",
    entity: "Guardian",
    entityId: guardian.id,
    oldValues: { fullName: currentGuardian.fullName },
    newValues: { fullName: guardian.fullName },
  });

  redirect("/admin/responsaveis");
}

export async function linkGuardianToAthlete(formData: FormData) {
  const user = await requireGuardianManager();
  const athleteId = requiredString(formData, "athleteId");
  const guardianId = requiredString(formData, "guardianId");

  await getPrisma().athleteGuardian.upsert({
    where: {
      athleteId_guardianId: {
        athleteId,
        guardianId,
      },
    },
    create: {
      athleteId,
      guardianId,
      ...getLinkData(formData),
    },
    update: getLinkData(formData),
  });

  await registerAuditLog({
    user,
    action: "link",
    entity: "AthleteGuardian",
    entityId: `${athleteId}:${guardianId}`,
  });

  redirect(`/admin/atletas/${athleteId}?aba=responsaveis`);
}

export async function updateAthleteGuardian(formData: FormData) {
  const user = await requireGuardianManager();
  const athleteGuardianId = requiredString(formData, "athleteGuardianId");
  const athleteId = requiredString(formData, "athleteId");

  await getPrisma().athleteGuardian.update({
    where: { id: athleteGuardianId },
    data: getLinkData(formData),
  });

  await registerAuditLog({
    user,
    action: "update-link",
    entity: "AthleteGuardian",
    entityId: athleteGuardianId,
  });

  redirect(`/admin/atletas/${athleteId}?aba=responsaveis`);
}

export async function removeAthleteGuardian(formData: FormData) {
  const user = await requireGuardianManager();
  const athleteGuardianId = requiredString(formData, "athleteGuardianId");
  const athleteId = requiredString(formData, "athleteId");

  await getPrisma().athleteGuardian.delete({
    where: { id: athleteGuardianId },
  });

  await registerAuditLog({
    user,
    action: "unlink",
    entity: "AthleteGuardian",
    entityId: athleteGuardianId,
  });

  redirect(`/admin/atletas/${athleteId}?aba=responsaveis`);
}
