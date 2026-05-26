import { redirect } from "next/navigation";

import { UserForm } from "@/components/app/user-form";
import { createUser } from "@/app/(admin)/admin/usuarios/actions";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function NewUserPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccess(currentUser.role, ["SUPER_ADMIN", "DIRETORIA"])) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const staffMembers = await getPrisma().staffMember.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Novo usuário
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Cadastre uma pessoa autorizada a acessar o sistema interno da JR.
        </p>
      </div>

      <UserForm
        action={createUser}
        staffMembers={staffMembers}
        currentProfile={currentUser.role}
        error={query.erro}
      />
    </div>
  );
}

