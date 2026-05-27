"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canManageAthletes } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type SchoolTypeValue = "public" | "private" | "special" | "other" | "not_informed";

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : null;
}

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function schoolTypeValue(formData: FormData) {
  const value = requiredString(formData, "schoolType");
  const validValues: SchoolTypeValue[] = [
    "public",
    "private",
    "special",
    "other",
    "not_informed",
  ];

  return validValues.includes(value as SchoolTypeValue)
    ? (value as SchoolTypeValue)
    : "not_informed";
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);

  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function getAddressData(formData: FormData) {
  const data = {
    postalCode: optionalString(formData, "schoolPostalCode"),
    street: optionalString(formData, "schoolStreet"),
    number: optionalString(formData, "schoolNumber"),
    complement: optionalString(formData, "schoolComplement"),
    neighborhood: optionalString(formData, "schoolNeighborhood"),
    city: optionalString(formData, "schoolCity"),
    state: optionalString(formData, "schoolState"),
  };

  return Object.values(data).some(Boolean) ? data : null;
}

async function requireSchoolManager() {
  const user = await getCurrentUser();

  if (!user || !canManageAthletes(user.role)) {
    redirect("/acesso-negado");
  }
}

export async function saveAthleteSchool(formData: FormData) {
  await requireSchoolManager();

  const athleteId = requiredString(formData, "athleteId");
  const athleteSchoolId = optionalString(formData, "athleteSchoolId");
  const schoolName = requiredString(formData, "schoolName");
  const schoolAddressData = getAddressData(formData);
  const schoolData = {
    name: schoolName,
    schoolType: schoolTypeValue(formData),
    phone: optionalString(formData, "schoolPhone"),
    email: optionalString(formData, "schoolEmail"),
    notes: optionalString(formData, "schoolGeneralNotes"),
    coordinatorName: optionalString(formData, "coordinatorName"),
    coordinatorPhone: optionalString(formData, "coordinatorPhone"),
    coordinatorEmail: optionalString(formData, "coordinatorEmail"),
    pedagogicalContactName: optionalString(formData, "pedagogicalContactName"),
    pedagogicalContactPhone: optionalString(formData, "pedagogicalContactPhone"),
    pedagogicalContactEmail: optionalString(formData, "pedagogicalContactEmail"),
    pedagogicalContactRole: optionalString(formData, "pedagogicalContactRole"),
  };
  const linkData = {
    grade: optionalString(formData, "grade"),
    shift: optionalString(formData, "shift"),
    enrollmentNumber: optionalString(formData, "enrollmentNumber"),
    startedAt: optionalDate(formData, "startedAt"),
    endedAt: optionalDate(formData, "endedAt"),
    isCurrent: formData.get("isCurrent") === "on",
    therapeuticCompanionName: optionalString(formData, "therapeuticCompanionName"),
    therapeuticCompanionPhone: optionalString(formData, "therapeuticCompanionPhone"),
    therapeuticCompanionEmail: optionalString(formData, "therapeuticCompanionEmail"),
    therapeuticCompanionNotes: optionalString(formData, "therapeuticCompanionNotes"),
    schoolNotes: optionalString(formData, "schoolNotes"),
  };

  if (athleteSchoolId) {
    const currentLink = await getPrisma().athleteSchool.findUnique({
      where: { id: athleteSchoolId },
      include: { school: true },
    });

    if (!currentLink || currentLink.athleteId !== athleteId) {
      redirect(`/admin/atletas/${athleteId}?aba=escola`);
    }

    await getPrisma().athleteSchool.update({
      where: { id: athleteSchoolId },
      data: {
        ...linkData,
        school: {
          update: {
            ...schoolData,
            address: schoolAddressData
              ? currentLink.school.addressId
                ? { update: schoolAddressData }
                : { create: schoolAddressData }
              : undefined,
          },
        },
      },
    });
  } else {
    const school = await getPrisma().school.create({
      data: {
        ...schoolData,
        address: schoolAddressData ? { create: schoolAddressData } : undefined,
      },
    });

    await getPrisma().athleteSchool.create({
      data: {
        athleteId,
        schoolId: school.id,
        ...linkData,
      },
    });
  }

  redirect(`/admin/atletas/${athleteId}?aba=escola`);
}
