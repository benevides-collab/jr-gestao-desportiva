"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canManageTrainingStructure } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user || !canManageTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }
}

function scheduleData(formData: FormData) {
  const weekdays = formData.getAll("weekday");
  const startTimes = formData.getAll("startTime");
  const endTimes = formData.getAll("endTime");
  const notes = formData.getAll("scheduleNotes");

  return weekdays
    .map((weekday, index) => ({
      weekday: Number(weekday),
      startTime: String(startTimes[index] ?? "").trim(),
      endTime: String(endTimes[index] ?? "").trim(),
      notes: String(notes[index] ?? "").trim() || null,
    }))
    .filter((schedule) => schedule.startTime && schedule.endTime)
    .filter((schedule) => schedule.endTime > schedule.startTime);
}

function assistantIds(formData: FormData) {
  return formData.getAll("assistantId").map((value) => String(value));
}

function teacherIds(formData: FormData) {
  return formData
    .getAll("teacherId")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function createTrainingClass(formData: FormData) {
  await requireManager();
  const schedules = scheduleData(formData);
  const teachers = teacherIds(formData);
  const assistants = assistantIds(formData);
  const primaryTeacherId = teachers[0];

  if (!primaryTeacherId) {
    redirect("/admin/turmas/nova");
  }

  const trainingClass = await getPrisma().trainingClass.create({
    data: {
      name: text(formData, "name") ?? "",
      modalityId: text(formData, "modalityId") ?? "",
      trainingLocationId: text(formData, "trainingLocationId") ?? "",
      teacherId: primaryTeacherId,
      capacity: numberValue(formData, "capacity"),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
      schedules: { create: schedules },
      teachers: {
        create: teachers.map((staffMemberId) => ({ staffMemberId })),
      },
      assistants: {
        create: assistants.map((staffMemberId) => ({ staffMemberId })),
      },
    },
  });

  redirect(`/admin/turmas/${trainingClass.id}`);
}

export async function updateTrainingClass(formData: FormData) {
  await requireManager();
  const id = text(formData, "id");
  if (!id) {
    redirect("/admin/turmas");
  }

  const schedules = scheduleData(formData);
  const teachers = teacherIds(formData);
  const assistants = assistantIds(formData);
  const primaryTeacherId = teachers[0];

  if (!primaryTeacherId) {
    redirect(`/admin/turmas/${id}/editar`);
  }

  await getPrisma().trainingClass.update({
    where: { id },
    data: {
      name: text(formData, "name") ?? "",
      modalityId: text(formData, "modalityId") ?? "",
      trainingLocationId: text(formData, "trainingLocationId") ?? "",
      teacherId: primaryTeacherId,
      capacity: numberValue(formData, "capacity"),
      notes: text(formData, "notes"),
      isActive: formData.get("status") !== "inactive",
      schedules: {
        deleteMany: {},
        create: schedules,
      },
      teachers: {
        deleteMany: {},
        create: teachers.map((staffMemberId) => ({ staffMemberId })),
      },
      assistants: {
        deleteMany: {},
        create: assistants.map((staffMemberId) => ({ staffMemberId })),
      },
    },
  });

  redirect(`/admin/turmas/${id}`);
}

export async function linkAthleteToClass(formData: FormData) {
  await requireManager();
  const athleteId = text(formData, "athleteId");
  const trainingClassIds = formData
    .getAll("trainingClassId")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!athleteId || trainingClassIds.length === 0) {
    redirect(athleteId ? `/admin/atletas/${athleteId}?aba=turmas` : "/admin/atletas");
  }

  const joinedAt = dateValue(formData, "joinedAt");
  const status = text(formData, "status") ?? "active";
  const isActive = status !== "inactive";
  const notes = text(formData, "notes");

  await getPrisma().$transaction(
    trainingClassIds.map((trainingClassId) =>
      getPrisma().athleteClass.upsert({
        where: { athleteId_trainingClassId: { athleteId, trainingClassId } },
        create: {
          athleteId,
          trainingClassId,
          joinedAt,
          status,
          isActive,
          notes,
        },
        update: {
          joinedAt,
          status,
          isActive,
          notes,
        },
      })
    )
  );

  redirect(`/admin/atletas/${athleteId}?aba=turmas`);
}

export async function unlinkAthleteFromClass(formData: FormData) {
  await requireManager();
  const athleteClassId = text(formData, "athleteClassId");
  const athleteId = text(formData, "athleteId");
  if (!athleteClassId || !athleteId) {
    redirect("/admin/atletas");
  }

  await getPrisma().athleteClass.update({
    where: { id: athleteClassId },
    data: { status: "inactive", isActive: false },
  });

  redirect(`/admin/atletas/${athleteId}?aba=turmas`);
}
