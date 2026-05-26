import { notFound, redirect } from "next/navigation";

import { DocumentTypeForm } from "@/components/app/document-type-form";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments } from "@/lib/documents";
import { getPrisma } from "@/lib/prisma";

type EditDocumentTypePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDocumentTypePage({
  params,
}: EditDocumentTypePageProps) {
  const user = await getCurrentUser();

  if (!user || !canManageDocuments(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const documentType = await getPrisma().documentType.findUnique({
    where: { id },
  });

  if (!documentType) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Editar tipo de documento
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Ajuste regras de obrigatoriedade, validade e periodicidade.
        </p>
      </div>
      <DocumentTypeForm documentType={documentType} />
    </div>
  );
}
