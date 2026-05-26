"use server";

import { redirect } from "next/navigation";

import { clearSession, createSession, validateCredentials } from "@/lib/auth";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await validateCredentials(email, password);

  if (!user) {
    redirect("/login?erro=credenciais");
  }

  await createSession(user);
  redirect("/admin/dashboard");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
