import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageTrainingStructure,
  canViewTrainingStructure,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

export default async function ModalidadesPage() {
  const user = await getCurrentUser();
  if (!user || !canViewTrainingStructure(user.role)) {
    redirect("/acesso-negado");
  }

  const modalities = await getPrisma().modality.findMany({
    include: { classes: true },
    orderBy: { name: "asc" },
  });
  const canManage = canManageTrainingStructure(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Modalidades
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Modalidades esportivas atendidas pela Associação JR Desportos.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/modalidades/nova">Nova modalidade</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Turmas</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {modalities.map((modality) => (
                <tr key={modality.id}>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    {modality.name}
                    <p className="mt-1 font-normal text-zinc-600">
                      {modality.description ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{modality.isActive ? "Ativa" : "Inativa"}</Badge>
                  </td>
                  <td className="px-4 py-3">{modality.classes.length}</td>
                  <td className="px-4 py-3 text-zinc-600">{modality.notes ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <Button asChild variant="secondary">
                        <Link href={`/admin/modalidades/${modality.id}/editar`}>
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
