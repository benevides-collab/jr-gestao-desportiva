"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { RoleSlug } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { profileToRoleSlug, type Profile } from "@/lib/roles";
import { getPrisma } from "@/lib/prisma";

const usersPath = "/admin/usuarios";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function requireUserManager() {
  const user = await getCurrentUser();

  if (!user || !canAccess(user.role, ["SUPER_ADMIN", "DIRETORIA"])) {
    redirect("/acesso-negado");
  }

  return user;
}

function canManageTargetRole(currentRole: Profile, targetSlug: RoleSlug) {
  if (currentRole === "SUPER_ADMIN") {
    return true;
  }

  return targetSlug !== "admin";
}

async function assertCanChangeSuperAdminStatus(targetUserId: string, nextRoleSlug: RoleSlug, nextIsActive: boolean) {
  const current = await getPrisma().user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });

  if (!current) {
    redirect(usersPath);
  }

  const isCurrentlyActiveAdmin = current.isActive && current.role.slug === "admin";
  const willRemainActiveAdmin = nextIsActive && nextRoleSlug === "admin";

  if (!isCurrentlyActiveAdmin || willRemainActiveAdmin) {
    return;
  }

  const activeAdmins = await getPrisma().user.count({
    where: {
      isActive: true,
      role: { slug: "admin" },
      id: { not: targetUserId },
    },
  });

  if (activeAdmins === 0) {
    redirect(`${usersPath}?erro=ultimo-super-admin`);
  }
}

async function roleByProfile(profile: string) {
  const slug = profileToRoleSlug[profile as Profile];

  if (!slug) {
    redirect(`${usersPath}?erro=perfil-invalido`);
  }

  const role = await getPrisma().role.findUnique({
    where: { slug },
  });

  if (!role || !role.isActive) {
    redirect(`${usersPath}?erro=perfil-invalido`);
  }

  return role;
}

export async function createUser(formData: FormData) {
  const currentUser = await requireUserManager();
  const name = stringValue(formData, "name");
  const email = normalizeEmail(stringValue(formData, "email"));
  const password = stringValue(formData, "password");
  const profile = stringValue(formData, "profile");
  const notes = stringValue(formData, "notes");
  const staffMemberId = stringValue(formData, "staffMemberId");
  const isActive = formData.get("isActive") === "on";
  const role = await roleByProfile(profile);

  if (!canManageTargetRole(currentUser.role, role.slug)) {
    redirect(`${usersPath}?erro=sem-permissao-super-admin`);
  }

  if (!name || !email || !password) {
    redirect(`${usersPath}/novo?erro=campos-obrigatorios`);
  }

  const existing = await getPrisma().user.findUnique({ where: { email } });

  if (existing) {
    redirect(`${usersPath}/novo?erro=email-existente`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await getPrisma().user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId: role.id,
      staffMemberId: staffMemberId || null,
      isActive,
      notes: notes || null,
    },
  });

  redirect(usersPath);
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireUserManager();
  const userId = stringValue(formData, "userId");
  const name = stringValue(formData, "name");
  const email = normalizeEmail(stringValue(formData, "email"));
  const password = stringValue(formData, "password");
  const profile = stringValue(formData, "profile");
  const notes = stringValue(formData, "notes");
  const staffMemberId = stringValue(formData, "staffMemberId");
  const isActive = formData.get("isActive") === "on";
  const role = await roleByProfile(profile);

  if (!userId || !name || !email) {
    redirect(`${usersPath}/${userId}/editar?erro=campos-obrigatorios`);
  }

  if (!canManageTargetRole(currentUser.role, role.slug)) {
    redirect(`${usersPath}?erro=sem-permissao-super-admin`);
  }

  await assertCanChangeSuperAdminStatus(userId, role.slug, isActive);

  const emailOwner = await getPrisma().user.findUnique({ where: { email } });

  if (emailOwner && emailOwner.id !== userId) {
    redirect(`${usersPath}/${userId}/editar?erro=email-existente`);
  }

  await getPrisma().user.update({
    where: { id: userId },
    data: {
      name,
      email,
      roleId: role.id,
      staffMemberId: staffMemberId || null,
      isActive,
      notes: notes || null,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
  });

  redirect(usersPath);
}

export async function toggleUserStatus(formData: FormData) {
  const currentUser = await requireUserManager();
  const userId = stringValue(formData, "userId");
  const nextIsActive = stringValue(formData, "nextIsActive") === "true";
  const target = await getPrisma().user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!target) {
    redirect(usersPath);
  }

  if (!canManageTargetRole(currentUser.role, target.role.slug)) {
    redirect(`${usersPath}?erro=sem-permissao-super-admin`);
  }

  await assertCanChangeSuperAdminStatus(userId, target.role.slug, nextIsActive);

  await getPrisma().user.update({
    where: { id: userId },
    data: { isActive: nextIsActive },
  });

  redirect(usersPath);
}

