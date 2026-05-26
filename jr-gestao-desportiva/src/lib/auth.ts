import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { getPrisma } from "@/lib/prisma";
import { profileFromRoleSlug, type Profile } from "@/lib/roles";

const cookieName = "jr_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "jr-dev-secret-change-me"
);

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Profile;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  (await cookies()).delete(cookieName);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export async function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (process.env.DATABASE_URL) {
    const dbUser = await getPrisma().user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    if (dbUser?.isActive) {
      const validPassword = await bcrypt.compare(password, dbUser.passwordHash);

      if (validPassword) {
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: profileFromRoleSlug(dbUser.role.slug),
        };
      }
    }
  }

  const fallbackEmail = process.env.ADMIN_EMAIL ?? "admin@jr.local";
  const fallbackPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  if (normalizedEmail === fallbackEmail && password === fallbackPassword) {
    return {
      id: "dev-admin",
      name: "Administrador JR",
      email: fallbackEmail,
      role: "SUPER_ADMIN" as Profile,
    };
  }

  return null;
}
