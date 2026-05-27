import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { PersonAvatar } from "@/components/app/person-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { guardianTypeLabels } from "@/lib/guardians";
import {
  canManageGuardians,
  canViewFullGuardianData,
  canViewGuardians,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type ResponsaveisPageProps = {
  searchParams: Promise<{
    atleta?: string;
    busca?: string;
  }>;
};

export default async function ResponsaveisPage({
  searchParams,
}: ResponsaveisPageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewGuardians(user.role)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const athleteId = params.atleta?.trim();
  const search = params.busca?.trim();
  const canManage = canManageGuardians(user.role);
  const canViewFull = canViewFullGuardianData(user.role);

  const guardianFilters: Array<Record<string, unknown>> = [];

  if (athleteId) {
    guardianFilters.push({ athletes: { some: { athleteId } } });
  }

  if (search) {
    guardianFilters.push({
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (user.role === "FINANCEIRO") {
    guardianFilters.push({ athletes: { some: { isFinancialGuardian: true } } });
  }

  if (user.role === "PROFESSOR" || user.role === "ASSISTENTE") {
    guardianFilters.push({ athletes: { some: { isEmergencyContact: true } } });
  }

  const where = guardianFilters.length > 0 ? { AND: guardianFilters } : {};

  const [guardians, athleteOptions] = await Promise.all([
    getPrisma().guardian.findMany({
      where,
      include: {
        athletes: {
          include: { athlete: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    getPrisma().athlete.findMany({
      select: {
        id: true,
        fullName: true,
        preferredName: true,
      },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Responsáveis
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Cadastro e consulta dos responsáveis vinculados aos atletas da JR.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/responsaveis/novo">
              <Plus className="size-4" aria-hidden="true" />
              Novo responsável
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              name="atleta"
              defaultValue={athleteId ?? ""}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todos os atletas</option>
              {athleteOptions.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.preferredName
                    ? `${athlete.fullName} (${athlete.preferredName})`
                    : athlete.fullName}
                </option>
              ))}
            </select>
            <Input
              name="busca"
              placeholder="Buscar por nome, CPF, e-mail ou telefone"
              defaultValue={search ?? ""}
            />
            <Button type="submit" variant="secondary">
              <Search className="size-4" aria-hidden="true" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de responsáveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Responsável</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Vínculos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((guardian) => (
                <TableRow key={guardian.id}>
                  <TableCell className="font-bold text-zinc-950">
                    <div className="flex items-center gap-3">
                      <PersonAvatar
                        name={guardian.fullName}
                        photoUrl={guardian.photoUrl}
                        className="w-10"
                      />
                      <div>
                        <div>{guardian.fullName}</div>
                        <div className="text-xs font-semibold text-zinc-500">
                          {guardianTypeLabels[guardian.type]}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canViewFull ? (
                      <div className="space-y-1">
                        <div>{guardian.phone ?? "-"}</div>
                        <div className="text-xs text-zinc-500">
                          {guardian.email ?? "-"}
                        </div>
                      </div>
                    ) : (
                      <span>Contato essencial</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {guardian.athletes.length > 0
                      ? guardian.athletes
                          .map((link) => link.athlete.fullName)
                          .join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/responsaveis/${guardian.id}/editar`}>
                          Editar
                        </Link>
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {guardians.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-zinc-500">
              Nenhum responsável encontrado.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
