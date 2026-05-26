"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canManageMedicalInfo } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : null;
}

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalBoolean(formData: FormData, key: string) {
  const value = optionalString(formData, key);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function parseDateValue(value: FormDataEntryValue | null | undefined) {
  const stringValue = String(value ?? "").trim();

  return stringValue ? new Date(`${stringValue}T00:00:00.000Z`) : null;
}

function getDoctorAddressData(formData: FormData) {
  const data = {
    postalCode: optionalString(formData, "doctorPostalCode"),
    street: optionalString(formData, "doctorStreet"),
    number: optionalString(formData, "doctorNumber"),
    complement: optionalString(formData, "doctorComplement"),
    neighborhood: optionalString(formData, "doctorNeighborhood"),
    city: optionalString(formData, "doctorCity"),
    state: optionalString(formData, "doctorState"),
  };

  return Object.values(data).some(Boolean) ? data : null;
}

async function requireMedicalManager() {
  const user = await getCurrentUser();

  if (!user || !canManageMedicalInfo(user.role)) {
    redirect("/acesso-negado");
  }
}

export async function saveAthleteMedicalInfo(formData: FormData) {
  await requireMedicalManager();

  const athleteId = requiredString(formData, "athleteId");
  const currentInfo = await getPrisma().athleteMedicalInfo.findUnique({
    where: { athleteId },
    include: { doctor: true },
  });
  const doctorName = optionalString(formData, "doctorName");
  const doctorAddressData = getDoctorAddressData(formData);
  let doctorId: string | null = currentInfo?.doctorId ?? null;

  if (doctorName) {
    const doctorData = {
      fullName: doctorName,
      specialty: optionalString(formData, "doctorSpecialty"),
      crm: optionalString(formData, "doctorCrm"),
      phone: optionalString(formData, "doctorPhone"),
      email: optionalString(formData, "doctorEmail"),
      clinicName: optionalString(formData, "doctorClinicName"),
    };

    if (currentInfo?.doctorId) {
      await getPrisma().doctor.update({
        where: { id: currentInfo.doctorId },
        data: {
          ...doctorData,
          address: doctorAddressData
            ? currentInfo.doctor?.addressId
              ? { update: doctorAddressData }
              : { create: doctorAddressData }
            : undefined,
        },
      });
    } else {
      const doctor = await getPrisma().doctor.create({
        data: {
          ...doctorData,
          address: doctorAddressData ? { create: doctorAddressData } : undefined,
        },
      });
      doctorId = doctor.id;
    }
  } else {
    doctorId = null;
  }

  const medicalInfo = await getPrisma().athleteMedicalInfo.upsert({
    where: { athleteId },
    create: {
      athleteId,
      doctorId,
      physicalRestrictions: optionalString(formData, "physicalRestrictions"),
      allergies: optionalString(formData, "allergies"),
      continuousMedication: optionalString(formData, "continuousMedication"),
      trainingNotes: optionalString(formData, "trainingNotes"),
      emergencyMedicalContact: optionalString(formData, "emergencyMedicalContact"),
      emergencyMedicalPhone: optionalString(formData, "emergencyMedicalPhone"),
      isFitForPhysicalActivity: optionalBoolean(
        formData,
        "isFitForPhysicalActivity"
      ),
      internalMedicalNotes: optionalString(formData, "internalMedicalNotes"),
    },
    update: {
      doctorId,
      physicalRestrictions: optionalString(formData, "physicalRestrictions"),
      allergies: optionalString(formData, "allergies"),
      continuousMedication: optionalString(formData, "continuousMedication"),
      trainingNotes: optionalString(formData, "trainingNotes"),
      emergencyMedicalContact: optionalString(formData, "emergencyMedicalContact"),
      emergencyMedicalPhone: optionalString(formData, "emergencyMedicalPhone"),
      isFitForPhysicalActivity: optionalBoolean(
        formData,
        "isFitForPhysicalActivity"
      ),
      internalMedicalNotes: optionalString(formData, "internalMedicalNotes"),
    },
  });

  const surgeryNames = formData.getAll("surgeryName");
  const surgeryDates = formData.getAll("surgeryDate");
  const surgeries = surgeryNames
    .map((name, index) => ({
      name: String(name ?? "").trim(),
      surgeryDate: parseDateValue(surgeryDates[index]),
    }))
    .filter((surgery) => surgery.name.length > 0);

  await getPrisma().$transaction([
    getPrisma().athleteSurgery.deleteMany({
      where: { medicalInfoId: medicalInfo.id },
    }),
    ...(surgeries.length > 0
      ? [
          getPrisma().athleteSurgery.createMany({
            data: surgeries.map((surgery) => ({
              medicalInfoId: medicalInfo.id,
              ...surgery,
            })),
          }),
        ]
      : []),
  ]);

  redirect(`/admin/atletas/${athleteId}?aba=medico`);
}
