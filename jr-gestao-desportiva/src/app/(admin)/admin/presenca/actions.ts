"use server";

import type { AttendanceStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  attendanceStatusOptions,
  canAccessTrainingClass,
  isToday,
  parseAttendanceDate,
} from "@/lib/attendance";
import {
  canManageAttendance,
  canManageRetroactiveAttendance,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function statusValue(value: FormDataEntryValue | null): AttendanceStatus {
  const normalized = String(value ?? "present");
  return attendanceStatusOptions.some((option) => option.value === normalized)
    ? (normalized as AttendanceStatus)
    : "present";
}

export async function saveAttendanceCall(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canManageAttendance(user.role)) {
    redirect("/acesso-negado");
  }

  const trainingClassId = text(formData, "trainingClassId");
  const attendanceDate = parseAttendanceDate(text(formData, "attendanceDate"));

  if (!trainingClassId) {
    redirect("/admin/presenca");
  }

  if (!isToday(attendanceDate) && !canManageRetroactiveAttendance(user.role)) {
    redirect("/acesso-negado");
  }

  if (!(await canAccessTrainingClass(user, trainingClassId))) {
    redirect("/acesso-negado");
  }

  const athleteIds = formData.getAll("athleteId").map((value) => String(value));
  await getPrisma().$transaction(
    athleteIds.map((athleteId) => {
      const status = statusValue(formData.get(`status-${athleteId}`));
      const notes = text(formData, `notes-${athleteId}`);

      return getPrisma().attendance.upsert({
        where: {
          athleteId_trainingClassId_attendanceDate: {
            athleteId,
            trainingClassId,
            attendanceDate,
          },
        },
        create: {
          athleteId,
          trainingClassId,
          attendanceDate,
          status,
          notes,
          recordedByUserId: user.id === "dev-admin" ? null : user.id,
          updatedByUserId: user.id === "dev-admin" ? null : user.id,
        },
        update: {
          status,
          notes,
          updatedByUserId: user.id === "dev-admin" ? null : user.id,
        },
      });
    })
  );

  redirect(`/admin/turmas/${trainingClassId}/presenca?data=${attendanceDate.toISOString().slice(0, 10)}`);
}
