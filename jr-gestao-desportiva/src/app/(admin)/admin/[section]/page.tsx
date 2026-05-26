import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, menuItemBySegment } from "@/lib/permissions";
import { profileLabels } from "@/lib/roles";

type AdminSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function AdminSectionPage({ params }: AdminSectionPageProps) {
  const { section } = await params;
  const user = await getCurrentUser();
  const item = menuItemBySegment(section);

  if (!item) {
    redirect("/admin/dashboard");
  }

  if (!user || !canAccess(user.role, item.allowedProfiles)) {
    redirect("/acesso-negado");
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge className="border-zinc-200 bg-white text-zinc-700">
          Módulo preparado
        </Badge>
        <h1 className="mt-3 text-2xl font-black text-zinc-950 sm:text-3xl">
          {item.label}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          {item.description} A implementação completa deste módulo ficará para
          cards futuros.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acesso liberado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-zinc-600">
            Seu perfil atual é <strong>{profileLabels[user.role]}</strong>. Esta
            tela existe apenas como placeholder administrativo neste card.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
