import { notFound, redirect } from "next/navigation";

import { UserForm } from "@/components/app/user-form";
import { updateUser } from "@/app/(admin)/admin/usuarios/actions";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditUserPage({ params, searchParams }: PageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccess(currentUser.role, ["SUPER_ADMIN", "DIRETORIA"])) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const query = await searchParams;
  const [user, staffMembers] = await Promise.all([
    getPrisma().user.findUnique({
      where: { id },
      include: { role: true },
    }),
    getPrisma().staffMember.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  if (!user) {
    notFound();
  }

  if (currentUser.role !== "SUPER_ADMIN" && user.role.slug === "admin") {
    redirect("/admin/usuarios?erro=sem-permissao-super-admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar usuário
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Atualize perfil, status, vínculo profissional e reset de senha.
        </p>
      </div>

      <UserForm
        action={updateUser}
        user={user}
        staffMembers={staffMembers}
        currentProfile={currentUser.role}
        error={query.erro}
      />
    </div>
  );
}

