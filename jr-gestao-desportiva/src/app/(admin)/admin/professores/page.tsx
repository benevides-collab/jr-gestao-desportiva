import Link from "next/link";
import { redirect } from "next/navigation";

import { PersonAvatar } from "@/components/app/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageTrainingStructure,
  canViewTrainingStructure,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { staffTypeLabel } from "@/lib/training";

export default async function TreinadoresPage() {
  const user = await getCurrentUser();
  if (!user || !canViewTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const staff = await getPrisma().staffMember.findMany({
    include: { modalities: { include: { modality: true } } },
    orderBy: { fullName: "asc" },
  });
  const canManage = canManageTrainingStructure(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Treinadores e assistentes
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Equipe técnica vinculada às turmas.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/professores/novo">Novo profissional</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Modalidades</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={member.fullName} photoUrl={member.photoUrl} />
                      <span className="font-bold text-zinc-950">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{staffTypeLabel(member.type)}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {member.phone ?? "-"}
                    <p>{member.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {member.modalities.map((link) => link.modality.name).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{member.isActive ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <Button asChild variant="secondary">
                        <Link href={`/admin/professores/${member.id}/editar`}>
                          Editar
                        </Link>
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
