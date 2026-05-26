"use server";

import { redirect } from "next/navigation";
import type { AthleteDocumentStatus, DocumentPeriodicity } from "@prisma/client";

import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  canManageDocuments,
  currentReferenceYear,
  periodicityOptions,
} from "@/lib/documents";
import { getPrisma } from "@/lib/prisma";
import {
  deleteAthleteDocument,
  uploadAthleteDocument,
} from "@/lib/supabase-storage";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    throw new Error(`Campo obrigatório: ${key}`);
  }

  return value;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const value = text(formData, key);
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function periodicityValue(formData: FormData): DocumentPeriodicity {
  const value = text(formData, "periodicity");

  return periodicityOptions.some((option) => option.value === value)
    ? (value as DocumentPeriodicity)
    : "annual";
}

function statusValue(formData: FormData): AthleteDocumentStatus {
  const value = text(formData, "status");
  const allowed: AthleteDocumentStatus[] = [
    "pending",
    "uploaded",
    "under_review",
    "approved",
    "rejected",
    "expiring",
    "expired",
    "waived",
  ];

  return allowed.includes(value as AthleteDocumentStatus)
    ? (value as AthleteDocumentStatus)
    : "uploaded";
}

function documentFile(formData: FormData) {
  const file = formData.get("documentFile");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

async function requireDocumentManager() {
  const user = await getCurrentUser();

  if (!user || !canManageDocuments(user.role)) {
    redirect("/acesso-negado");
  }

  return user;
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

async function requireDatabaseDocumentManager() {
  const sessionUser = await requireDocumentManager();
  const dbUser = await resolveDatabaseUser(sessionUser);

  if (!dbUser) {
    throw new Error("INVALID_AUTHENTICATED_USER");
  }

  return dbUser;
}

function redirectWithDocumentError(path: string, error: unknown): never {
  const suffix = path.includes("?") ? "&" : "?";

  if (error instanceof Error) {
    if (error.message === "INVALID_DOCUMENT_TYPE") {
      redirect(`${path}${suffix}erro=arquivo-invalido`);
    }

    if (error.message === "DOCUMENT_TOO_LARGE") {
      redirect(`${path}${suffix}erro=arquivo-grande`);
    }

    if (error.message === "PHOTO_STORAGE_NOT_CONFIGURED") {
      redirect(`${path}${suffix}erro=storage-config`);
    }

    if (error.message === "INVALID_AUTHENTICATED_USER") {
      redirect(`${path}${suffix}erro=usuario-invalido`);
    }
  }

  redirect(`${path}${suffix}erro=storage`);
}

export async function createDocumentType(formData: FormData) {
  await requireDocumentManager();

  await getPrisma().documentType.create({
    data: {
      name: requiredText(formData, "name"),
      description: text(formData, "description"),
      isRequired: checkbox(formData, "isRequired"),
      requiresExpirationDate: checkbox(formData, "requiresExpirationDate"),
      periodicity: periodicityValue(formData),
      appliesToMinors: checkbox(formData, "appliesToMinors"),
      appliesToAdults: checkbox(formData, "appliesToAdults"),
      isAnnual: periodicityValue(formData) === "annual",
      isActive: checkbox(formData, "isActive"),
      notes: text(formData, "notes"),
    },
  });

  redirect("/admin/documentos/tipos");
}

export async function updateDocumentType(formData: FormData) {
  await requireDocumentManager();
  const id = text(formData, "id");

  if (!id) {
    redirect("/admin/documentos/tipos");
  }

  const periodicity = periodicityValue(formData);

  await getPrisma().documentType.update({
    where: { id },
    data: {
      name: requiredText(formData, "name"),
      description: text(formData, "description"),
      isRequired: checkbox(formData, "isRequired"),
      requiresExpirationDate: checkbox(formData, "requiresExpirationDate"),
      periodicity,
      appliesToMinors: checkbox(formData, "appliesToMinors"),
      appliesToAdults: checkbox(formData, "appliesToAdults"),
      isAnnual: periodicity === "annual",
      isActive: checkbox(formData, "isActive"),
      notes: text(formData, "notes"),
    },
  });

  redirect("/admin/documentos/tipos");
}

export async function uploadAthleteDocumentAction(formData: FormData) {
  const user = await requireDatabaseDocumentManager();
  const athleteId = requiredText(formData, "athleteId");
  const documentTypeId = requiredText(formData, "documentTypeId");
  const redirectPath = `/admin/atletas/${athleteId}?aba=documentos`;
  const file = documentFile(formData);

  if (!file) {
    redirect(`${redirectPath}&erro=arquivo-obrigatorio`);
  }

  let filePath: string;

  try {
    filePath = await uploadAthleteDocument(file, athleteId);
  } catch (error) {
    redirectWithDocumentError(redirectPath, error);
  }

  const referenceYear = numberValue(
    formData,
    "referenceYear",
    currentReferenceYear()
  );
  const previousDocumentId = text(formData, "previousDocumentId");
  const status = statusValue(formData);

  try {
    await getPrisma().$transaction(async (tx) => {
      const document = await tx.athleteDocument.create({
        data: {
          athleteId,
          documentTypeId,
          referenceYear,
          filePath,
          fileName: file.name,
          originalFileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          status,
          issueDate: optionalDate(formData, "issueDate"),
          expirationDate: optionalDate(formData, "expirationDate"),
          expiresAt: optionalDate(formData, "expirationDate"),
          uploadedByUserId: user.id,
          uploadedAt: new Date(),
          notes: text(formData, "notes"),
        },
      });

      if (previousDocumentId) {
        await tx.athleteDocument.update({
          where: { id: previousDocumentId },
          data: { replacedByDocumentId: document.id },
        });
      }
    });
  } catch (error) {
    try {
      await deleteAthleteDocument(filePath);
    } catch {
      // Best effort rollback: the original database error is what matters here.
    }

    redirectWithDocumentError(redirectPath, error);
  }

  redirect(redirectPath);
}

export async function approveAthleteDocument(formData: FormData) {
  const user = await requireDatabaseDocumentManager();
  const id = requiredText(formData, "documentId");
  const athleteId = requiredText(formData, "athleteId");

  await getPrisma().athleteDocument.update({
    where: { id },
    data: {
      status: "approved",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  });

  redirect(`/admin/atletas/${athleteId}?aba=documentos`);
}

export async function rejectAthleteDocument(formData: FormData) {
  const user = await requireDatabaseDocumentManager();
  const id = requiredText(formData, "documentId");
  const athleteId = requiredText(formData, "athleteId");
  const rejectionReason = text(formData, "rejectionReason");

  if (!rejectionReason) {
    redirect(`/admin/atletas/${athleteId}?aba=documentos&erro=motivo-obrigatorio`);
  }

  await getPrisma().athleteDocument.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      rejectionReason,
    },
  });

  redirect(`/admin/atletas/${athleteId}?aba=documentos`);
}

export async function waiveAthleteDocument(formData: FormData) {
  const user = await requireDatabaseDocumentManager();
  const athleteId = requiredText(formData, "athleteId");
  const documentTypeId = requiredText(formData, "documentTypeId");
  const referenceYear = numberValue(
    formData,
    "referenceYear",
    currentReferenceYear()
  );

  await getPrisma().athleteDocument.create({
    data: {
      athleteId,
      documentTypeId,
      referenceYear,
      status: "waived",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      notes: text(formData, "notes"),
    },
  });

  redirect(`/admin/atletas/${athleteId}?aba=documentos`);
}
