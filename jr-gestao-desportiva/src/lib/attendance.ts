import type { AttendanceStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import {
  canManageRetroactiveAttendance,
  canManageAttendance,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

export const attendanceStatusOptions: {
  value: AttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Presente" },
  { value: "absent", label: "Falta" },
  { value: "justified_absence", label: "Falta justificada" },
  { value: "late", label: "Atraso" },
  { value: "medical_leave", label: "Dispensa médica" },
  { value: "partial", label: "Participou parcialmente" },
];

export function attendanceStatusLabel(value: AttendanceStatus | string | null | undefined) {
  return attendanceStatusOptions.find((option) => option.value === value)?.label ?? "-";
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function parseAttendanceDate(value: string | null | undefined) {
  const normalized = value?.trim() || todayInputValue();
  return new Date(`${normalized}T00:00:00.000Z`);
}

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return todayInputValue();
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function isToday(date: Date) {
  return toDateInputValue(date) === todayInputValue();
}

export async function findStaffMemberForUser(user: SessionUser) {
  return getPrisma().staffMember.findFirst({
    where: {
      email: user.email,
      isActive: true,
    },
  });
}

export async function canAccessTrainingClass(
  user: SessionUser,
  trainingClassId: string
) {
  if (canManageRetroactiveAttendance(user.role)) {
    return true;
  }

  if (!canManageAttendance(user.role)) {
    return false;
  }

  const staff = await findStaffMemberForUser(user);
  if (!staff) {
    return false;
  }

  const trainingClass = await getPrisma().trainingClass.findFirst({
    where: {
      id: trainingClassId,
      OR: [
        { teacherId: staff.id },
        { teachers: { some: { staffMemberId: staff.id } } },
        { assistants: { some: { staffMemberId: staff.id } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(trainingClass);
}

export async function scopedTrainingClassWhere(user: SessionUser) {
  if (canManageRetroactiveAttendance(user.role) || user.role === "CONSULTA") {
    return {};
  }

  const staff = await findStaffMemberForUser(user);
  if (!staff) {
    return { id: "__none__" };
  }

  return {
    OR: [
      { teacherId: staff.id },
      { teachers: { some: { staffMemberId: staff.id } } },
      { assistants: { some: { staffMemberId: staff.id } } },
    ],
  };
}
