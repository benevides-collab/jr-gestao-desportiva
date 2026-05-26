"use server";

import { redirect } from "next/navigation";
import type {
  CompetitionAthleteStatus,
  CompetitionMedal,
  CompetitionStatus,
} from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import {
  competitionAthleteStatusOptions,
  competitionStatusOptions,
  medalOptions,
} from "@/lib/competitions";
import {
  canManageCompetitions,
  canUpdateCompetitionParticipation,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

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

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function requiredDate(formData: FormData, key: string) {
  return optionalDate(formData, key) ?? new Date();
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function competitionStatus(formData: FormData): CompetitionStatus {
  const value = text(formData, "status");
  return competitionStatusOptions.some((option) => option.value === value)
    ? (value as CompetitionStatus)
    : "planned";
}

function athleteStatus(formData: FormData): CompetitionAthleteStatus {
  const value = text(formData, "status");
  return competitionAthleteStatusOptions.some((option) => option.value === value)
    ? (value as CompetitionAthleteStatus)
    : "called";
}

function medalValue(formData: FormData): CompetitionMedal {
  const value = text(formData, "medal");
  return medalOptions.some((option) => option.value === value)
    ? (value as CompetitionMedal)
    : "none";
}

function assistantLinks(formData: FormData) {
  return formData
    .getAll("assistantIds")
    .map((value) => String(value))
    .filter(Boolean)
    .map((staffMemberId) => ({ staffMemberId }));
}

async function requireCompetitionManager() {
  const user = await getCurrentUser();
  if (!user || !canManageCompetitions(user.role)) {
    redirect("/acesso-negado");
  }
  return user;
}

export async function createCompetition(formData: FormData) {
  await requireCompetitionManager();

  const competition = await getPrisma().competition.create({
    data: {
      name: requiredText(formData, "name"),
      modalityId: text(formData, "modalityId"),
      responsibleTeacherId: text(formData, "responsibleTeacherId"),
      location: text(formData, "location"),
      address: text(formData, "address"),
      city: text(formData, "city"),
      state: text(formData, "state"),
      organizer: text(formData, "organizer"),
      meetingTime: text(formData, "meetingTime"),
      transportation: text(formData, "transportation"),
      status: competitionStatus(formData),
      startsAt: requiredDate(formData, "startsAt"),
      endsAt: optionalDate(formData, "endsAt"),
      notes: text(formData, "notes"),
      assistants: { create: assistantLinks(formData) },
    },
  });

  redirect(`/admin/competicoes/${competition.id}`);
}

export async function updateCompetition(formData: FormData) {
  await requireCompetitionManager();
  const id = text(formData, "id");

  if (!id) {
    redirect("/admin/competicoes");
  }

  await getPrisma().competition.update({
    where: { id },
    data: {
      name: requiredText(formData, "name"),
      modalityId: text(formData, "modalityId"),
      responsibleTeacherId: text(formData, "responsibleTeacherId"),
      location: text(formData, "location"),
      address: text(formData, "address"),
      city: text(formData, "city"),
      state: text(formData, "state"),
      organizer: text(formData, "organizer"),
      meetingTime: text(formData, "meetingTime"),
      transportation: text(formData, "transportation"),
      status: competitionStatus(formData),
      startsAt: requiredDate(formData, "startsAt"),
      endsAt: optionalDate(formData, "endsAt"),
      notes: text(formData, "notes"),
      assistants: {
        deleteMany: {},
        create: assistantLinks(formData),
      },
    },
  });

  redirect(`/admin/competicoes/${id}`);
}

export async function callAthletesToCompetition(formData: FormData) {
  await requireCompetitionManager();
  const competitionId = requiredText(formData, "competitionId");
  const athleteIds = formData
    .getAll("athleteIds")
    .map((value) => String(value))
    .filter(Boolean);

  for (const athleteId of athleteIds) {
    await getPrisma().competitionAthlete.upsert({
      where: { competitionId_athleteId: { competitionId, athleteId } },
      create: {
        competitionId,
        athleteId,
        status: "called",
        documentsOk: checkbox(formData, `documentsOk-${athleteId}`),
        medicalClearanceOk: checkbox(formData, `medicalOk-${athleteId}`),
        guardianOk: checkbox(formData, `guardianOk-${athleteId}`),
      },
      update: {
        status: "called",
        documentsOk: checkbox(formData, `documentsOk-${athleteId}`),
        medicalClearanceOk: checkbox(formData, `medicalOk-${athleteId}`),
        guardianOk: checkbox(formData, `guardianOk-${athleteId}`),
      },
    });
  }

  redirect(`/admin/competicoes/${competitionId}`);
}

export async function removeAthleteFromCompetition(formData: FormData) {
  await requireCompetitionManager();
  const competitionId = requiredText(formData, "competitionId");
  const athleteId = requiredText(formData, "athleteId");

  await getPrisma().competitionAthlete.delete({
    where: { competitionId_athleteId: { competitionId, athleteId } },
  });

  redirect(`/admin/competicoes/${competitionId}`);
}

export async function updateCompetitionAthlete(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canUpdateCompetitionParticipation(user.role)) {
    redirect("/acesso-negado");
  }

  const id = requiredText(formData, "competitionAthleteId");
  const competitionId = requiredText(formData, "competitionId");

  await getPrisma().competitionAthlete.update({
    where: { id },
    data: {
      status: athleteStatus(formData),
      documentsOk: checkbox(formData, "documentsOk"),
      medicalClearanceOk: checkbox(formData, "medicalClearanceOk"),
      guardianOk: checkbox(formData, "guardianOk"),
      presenceConfirmed: checkbox(formData, "presenceConfirmed"),
      participated: checkbox(formData, "participated"),
      result: text(formData, "result"),
      placement: text(formData, "placement"),
      medal: medalValue(formData),
      notes: text(formData, "notes"),
    },
  });

  redirect(`/admin/competicoes/${competitionId}`);
}
