import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, ShieldAlert } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
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
import { getCurrentUser } from "@/lib/auth";
import {
  athleteStatusLabels,
  calculateAge,
  genderLabels,
  isMinor,
} from "@/lib/athletes";
import { canManageAthletes, canViewAthletes } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

const statuses = Object.keys(athleteStatusLabels);
const genders = Object.keys(genderLabels);

type AtletasPageProps = {
  searchParams: Promise<{
    atleta?: string;
    status?: string;
    sexo?: string;
    menor?: string;
    modalidade?: string;
    local?: string;
    turma?: string;
  }>;
};

export default async function AtletasPage({ searchParams }: AtletasPageProps) {
  const user = await getCurrentUser();

  if (!user || !canViewAthletes(user.role)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const athleteId = params.atleta ?? "";
  const status = statuses.includes(params.status ?? "") ? params.status : "";
  const gender = genders.includes(params.sexo ?? "") ? params.sexo : "";
  const minorFilter = params.menor === "sim";
  const modalityId = params.modalidade ?? "";
  const trainingLocationId = params.local ?? "";
  const trainingClassId = params.turma ?? "";
  const canManage = canManageAthletes(user.role);

  const where: Prisma.AthleteWhereInput = {
    ...(athleteId ? { id: athleteId } : {}),
    ...(status ? { status: status as Prisma.EnumAthleteStatusFilter } : {}),
    ...(gender ? { gender: gender as Prisma.EnumGenderNullableFilter } : {}),
    ...(modalityId || trainingLocationId || trainingClassId
      ? {
          classes: {
            some: {
              ...(trainingClassId ? { trainingClassId } : {}),
              ...(modalityId || trainingLocationId
                ? {
                    trainingClass: {
                      ...(modalityId ? { modalityId } : {}),
                      ...(trainingLocationId ? { trainingLocationId } : {}),
                    },
                  }
                : {}),
            },
          },
        }
      : {}),
  };

  const [athletesRaw, athleteOptions, modalities, locations, classes] = await Promise.all([
    getPrisma().athlete.findMany({
      where,
      include: {
        address: true,
        classes: {
          where: { isActive: true },
          include: {
            trainingClass: {
              include: {
                modality: true,
                trainingLocation: true,
              },
            },
          },
          orderBy: { joinedAt: "desc" },
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
    getPrisma().modality.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().trainingLocation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    getPrisma().trainingClass.findMany({
      where: {
        isActive: true,
        ...(modalityId ? { modalityId } : {}),
        ...(trainingLocationId ? { trainingLocationId } : {}),
      },
      include: {
        modality: true,
        trainingLocation: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const athletes = athletesRaw.filter((athlete) =>
    minorFilter ? isMinor(athlete.birthDate) : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Atletas
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Cadastro base de atletas da Associação Paradesportiva JR-SP.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/atletas/novo">
              <Plus className="size-4" aria-hidden="true" />
              Novo atleta
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <select
              name="atleta"
              defaultValue={athleteId}
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
            <select
              name="status"
              defaultValue={status}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todos os status</option>
              {Object.entries(athleteStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="sexo"
              defaultValue={gender}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todos os sexos</option>
              {Object.entries(genderLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="menor"
              defaultValue={minorFilter ? "sim" : ""}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todas as idades</option>
              <option value="sim">Menor de idade</option>
            </select>
            <select
              name="modalidade"
              defaultValue={modalityId}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todas as modalidades</option>
              {modalities.map((modality) => (
                <option key={modality.id} value={modality.id}>
                  {modality.name}
                </option>
              ))}
            </select>
            <select
              name="local"
              defaultValue={trainingLocationId}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todos os locais</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <select
              name="turma"
              defaultValue={trainingClassId}
              className="h-11 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Todas as turmas</option>
              {classes.map((trainingClass) => (
                <option key={trainingClass.id} value={trainingClass.id}>
                  {trainingClass.name} - {trainingClass.modality.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" className="w-full justify-center">
              <Search className="size-4" aria-hidden="true" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de atletas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Turmas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {athletes.map((athlete) => {
                const age = calculateAge(athlete.birthDate);
                const minor = age < 18;

                return (
                  <TableRow key={athlete.id}>
                    <TableCell className="font-bold text-zinc-950">
                      <div className="flex items-center gap-3">
                        <AthleteAvatar
                          name={athlete.fullName}
                          photoUrl={athlete.photoUrl}
                          className="w-10"
                        />
                        <div>
                          <div>{athlete.fullName}</div>
                          {athlete.preferredName ? (
                            <div className="text-xs font-semibold text-zinc-500">
                              {athlete.preferredName}
                            </div>
                          ) : null}
                          {minor ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-jr-red/10 px-2 py-1 text-xs font-bold text-jr-red">
                              <ShieldAlert className="size-3" aria-hidden="true" />
                              Menor de idade
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{athleteStatusLabels[athlete.status]}</TableCell>
                    <TableCell>{age} anos</TableCell>
                    <TableCell>
                      {athlete.gender ? genderLabels[athlete.gender] : "-"}
                    </TableCell>
                    <TableCell>{athlete.address?.city ?? "-"}</TableCell>
                    <TableCell className="max-w-xs text-sm text-zinc-700">
                      {athlete.classes.length > 0
                        ? athlete.classes
                            .map(
                              (link) =>
                                `${link.trainingClass.name} (${link.trainingClass.modality.name})`,
                            )
                            .join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/admin/atletas/${athlete.id}`}>Ver</Link>
                        </Button>
                        {canManage ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/atletas/${athlete.id}/editar`}>
                              Editar
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {athletes.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-zinc-500">
              Nenhum atleta encontrado.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
