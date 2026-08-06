import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ShieldCheck, ShieldX } from "lucide-react";
import type { RoleSlug } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { roleNameFromSlug } from "@/components/app/user-form";
import { toggleUserStatus } from "@/app/(admin)/admin/usuarios/actions";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { profileLabels, profiles } from "@/lib/roles";
import { getPrisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function AdminUsuariosPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccess(currentUser.role, ["SUPER_ADMIN", "DIRETORIA"])) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const users = await getPrisma().user.findMany({
    include: {
      role: true,
      staffMember: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const canCreate = canAccess(currentUser.role, ["SUPER_ADMIN", "DIRETORIA"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Usuários
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Gestão de acesso, perfis e segurança do sistema interno.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/admin/usuarios/novo">
              <Plus className="size-4" aria-hidden="true" />
              Novo usuário
            </Link>
          </Button>
        ) : null}
      </div>

      {query.erro ? (
        <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red">
          {errorMessage(query.erro)}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {users.map((appUser) => {
              const canManageThisUser = canManageRole(
                currentUser.role,
                appUser.role.slug,
              );

              return (
                <div
                  key={appUser.id}
                  className="rounded-md border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-zinc-950">
                        {appUser.name}
                      </p>
                      <p className="break-words text-xs font-semibold text-zinc-500">
                        {appUser.email}
                      </p>
                    </div>
                    <span
                      className={
                        appUser.isActive
                          ? "inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800"
                          : "inline-flex items-center gap-2 rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700"
                      }
                    >
                      {appUser.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-zinc-600">
                    <div>
                      <dt className="font-bold uppercase text-zinc-500">Perfil</dt>
                      <dd>{roleNameFromSlug(appUser.role.slug)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase text-zinc-500">
                        Profissional vinculado
                      </dt>
                      <dd>{appUser.staffMember?.fullName ?? "-"}</dd>
                    </div>
                  </dl>
                  {canManageThisUser ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/admin/usuarios/${appUser.id}/editar`}>
                          Editar
                        </Link>
                      </Button>
                      <form action={toggleUserStatus}>
                        <input type="hidden" name="userId" value={appUser.id} />
                        <input
                          type="hidden"
                          name="nextIsActive"
                          value={String(!appUser.isActive)}
                        />
                        <Button type="submit" size="sm" variant="ghost" className="w-full">
                          {appUser.isActive ? "Inativar" : "Ativar"}
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Profissional vinculado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((appUser) => {
                const canManageThisUser = canManageRole(
                  currentUser.role,
                  appUser.role.slug,
                );

                return (
                  <TableRow key={appUser.id}>
                    <TableCell className="font-bold text-zinc-950">
                      <div>{appUser.name}</div>
                      <div className="text-xs font-semibold text-zinc-500">
                        {appUser.email}
                      </div>
                    </TableCell>
                    <TableCell>{roleNameFromSlug(appUser.role.slug)}</TableCell>
                    <TableCell>{appUser.staffMember?.fullName ?? "-"}</TableCell>
                    <TableCell>
                      <span
                        className={
                          appUser.isActive
                            ? "inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800"
                            : "inline-flex items-center gap-2 rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700"
                        }
                      >
                        {appUser.isActive ? (
                          <ShieldCheck className="size-3" aria-hidden="true" />
                        ) : (
                          <ShieldX className="size-3" aria-hidden="true" />
                        )}
                        {appUser.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {appUser.lastLoginAt
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "America/Sao_Paulo",
                          }).format(appUser.lastLoginAt)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {canManageThisUser ? (
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/admin/usuarios/${appUser.id}/editar`}>
                              Editar
                            </Link>
                          </Button>
                          <form action={toggleUserStatus}>
                            <input type="hidden" name="userId" value={appUser.id} />
                            <input
                              type="hidden"
                              name="nextIsActive"
                              value={String(!appUser.isActive)}
                            />
                            <Button type="submit" size="sm" variant="ghost">
                              {appUser.isActive ? "Inativar" : "Ativar"}
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-zinc-500">
                          Protegido
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfis de acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {profiles.map((profile) => (
              <div
                key={profile}
                className="rounded-md border border-zinc-200 bg-white p-4"
              >
                <p className="font-black text-zinc-950">{profileLabels[profile]}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Perfil disponível para controle de acesso por módulo.
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function canManageRole(currentProfile: string, targetRole: RoleSlug) {
  if (currentProfile === "SUPER_ADMIN") {
    return true;
  }

  return targetRole !== "admin";
}

function errorMessage(error: string) {
  const messages: Record<string, string> = {
    "ultimo-super-admin": "Não é permitido remover ou rebaixar o último SUPER_ADMIN ativo.",
    "sem-permissao-super-admin": "Apenas SUPER_ADMIN pode criar ou alterar outro SUPER_ADMIN.",
    "perfil-invalido": "Perfil inválido ou inativo.",
  };

  return messages[error] ?? "Não foi possível concluir a operação.";
}
