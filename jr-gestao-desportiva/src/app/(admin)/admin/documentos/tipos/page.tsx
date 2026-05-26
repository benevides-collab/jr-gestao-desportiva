import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageDocuments,
  documentPeriodicityLabel,
} from "@/lib/documents";
import { getPrisma } from "@/lib/prisma";

export default async function DocumentTypesPage() {
  const user = await getCurrentUser();

  if (!user || !canManageDocuments(user.role)) {
    redirect("/acesso-negado");
  }

  const documentTypes = await getPrisma().documentType.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
            Tipos de documentos
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Configure os documentos anuais exigidos para os atletas da JR.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/documentos/tipos/novo">Novo tipo</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Obrigatório</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Periodicidade</th>
                <th className="px-4 py-3">Aplicação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {documentTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-4 py-3 font-bold text-zinc-950">
                    {type.name}
                    <p className="mt-1 font-normal text-zinc-600">
                      {type.description ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {type.isRequired ? "Sim" : "Não"}
                  </td>
                  <td className="px-4 py-3">
                    {type.requiresExpirationDate ? "Exige" : "Não exige"}
                  </td>
                  <td className="px-4 py-3">
                    {documentPeriodicityLabel(type.periodicity)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {[
                      type.appliesToMinors ? "Menores" : null,
                      type.appliesToAdults ? "Maiores" : null,
                    ]
                      .filter(Boolean)
                      .join(" e ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{type.isActive ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="secondary">
                      <Link href={`/admin/documentos/tipos/${type.id}/editar`}>
                        Editar
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documentTypes.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-zinc-600">
              Nenhum tipo de documento cadastrado.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
