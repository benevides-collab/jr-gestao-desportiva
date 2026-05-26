import { redirect } from "next/navigation";

import { DocumentTypeForm } from "@/components/app/document-type-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments } from "@/lib/documents";

export default async function NewDocumentTypePage() {
  const user = await getCurrentUser();

  if (!user || !canManageDocuments(user.role)) {
    redirect("/acesso-negado");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Novo tipo de documento
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre um documento exigido no controle anual dos atletas.
        </p>
      </div>
      <DocumentTypeForm />
    </div>
  );
}
