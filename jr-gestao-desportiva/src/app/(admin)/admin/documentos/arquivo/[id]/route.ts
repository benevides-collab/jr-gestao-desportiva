import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { canViewFullDocuments } from "@/lib/documents";
import { getPrisma } from "@/lib/prisma";
import { createAthleteDocumentSignedUrl } from "@/lib/supabase-storage";

type DocumentFileRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: DocumentFileRouteProps) {
  const user = await getCurrentUser();

  if (!user || !canViewFullDocuments(user.role)) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const document = await getPrisma().athleteDocument.findUnique({
    where: { id },
    select: { filePath: true },
  });

  if (!document?.filePath) {
    redirect("/admin/documentos?erro=arquivo-indisponivel");
  }

  const signedUrl = await createAthleteDocumentSignedUrl(document.filePath);
  redirect(signedUrl);
}
