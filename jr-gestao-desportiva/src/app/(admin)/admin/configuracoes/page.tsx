import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  Database,
  FileText,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  Palette,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSystemSettings } from "@/app/(admin)/admin/configuracoes/actions";
import { getCurrentUser } from "@/lib/auth";
import {
  dashboardCardDefinitions,
  dashboardCategories,
} from "@/lib/dashboard-config";
import { documentPeriodicityLabel } from "@/lib/documents";
import { canAccess } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { profileLabels, profiles } from "@/lib/roles";
import { getSystemSettings } from "@/lib/system-settings";

type PageProps = {
  searchParams: Promise<{ salvo?: string }>;
};

export default async function AdminConfiguracoesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canAccess(user.role, ["SUPER_ADMIN"])) {
    redirect("/acesso-negado");
  }

  const query = await searchParams;
  const [documentTypes, userCount, databaseOk, settings] = await Promise.all([
    getPrisma().documentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 12,
    }),
    getPrisma().user.count(),
    getPrisma()
      .role.count()
      .then(() => true)
      .catch(() => false),
    getSystemSettings(),
  ]);
  const requiredDocuments = documentTypes.filter((type) => type.isRequired);
  const storageConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Regras gerais e parâmetros administrativos do sistema interno da JR.
        </p>
      </div>

      {query.salvo ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
          Configurações salvas com sucesso.
        </div>
      ) : null}

      <form action={updateSystemSettings} className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-2">
        <SettingsCard
          icon={Settings}
          title="Dados da associação"
          description="Informações institucionais usadas como referência no sistema."
        >
          <div className="grid gap-3 md:grid-cols-[120px_1fr]">
            <div className="flex h-28 w-28 items-center justify-center rounded-md border border-zinc-200 bg-white">
              <Image
                src="/brand/logo-jr-sp.png"
                alt="Logo da Associação Paradesportiva JR-SP"
                width={88}
                height={88}
                className="h-22 w-22 object-contain"
              />
            </div>
            <div className="grid gap-3">
              <EditableField
                label="Nome da associação"
                name="association.name"
                value={settings.association.name}
              />
              <EditableField
                label="CNPJ"
                name="association.cnpj"
                value={settings.association.cnpj}
              />
              <EditableField
                label="E-mail institucional"
                name="association.email"
                value={settings.association.email}
                type="email"
              />
              <EditableField
                label="Telefone"
                name="association.phone"
                value={settings.association.phone}
              />
              <EditableField
                label="WhatsApp"
                name="association.whatsapp"
                value={settings.association.whatsapp}
              />
              <EditableField
                label="Endereço"
                name="association.address"
                value={settings.association.address}
              />
              <InfoGrid items={[["Logo", settings.association.logoPath]]} />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={CalendarDays}
          title="Ano vigente"
          description="Período de referência para controle documental anual."
        >
          <div className="grid gap-3">
            <EditableField
              label="Ano atual"
              name="currentYear.year"
              value={settings.currentYear.year}
              type="number"
            />
            <EditableField
              label="Início do período documental"
              name="currentYear.documentPeriodStart"
              value={settings.currentYear.documentPeriodStart}
              type="date"
            />
            <EditableField
              label="Fim do período documental"
              name="currentYear.documentPeriodEnd"
              value={settings.currentYear.documentPeriodEnd}
              type="date"
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={FileText}
          title="Documentos padrão"
          description="Resumo dos tipos de documentos ativos configurados."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/documentos/tipos">Tipos de documentos</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            <InfoGrid
              items={[
                ["Tipos ativos", String(documentTypes.length)],
                ["Obrigatórios", String(requiredDocuments.length)],
              ]}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Periodicidade</th>
                    <th className="px-3 py-2">Validade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {documentTypes.map((type) => (
                    <tr key={type.id}>
                      <td className="px-3 py-2 font-semibold text-zinc-950">
                        {type.name}
                      </td>
                      <td className="px-3 py-2">
                        {documentPeriodicityLabel(type.periodicity)}
                      </td>
                      <td className="px-3 py-2">
                        {type.requiresExpirationDate ? "Exige validade" : "Sem validade obrigatória"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={AlertTriangle}
          title="Alertas"
          description="Regras administrativas de avisos e pendências."
        >
          <div className="grid gap-3">
            <EditableField
              label="Dias para alerta de documento vencendo"
              name="alerts.documentExpiringDays"
              value={settings.alerts.documentExpiringDays}
              type="number"
            />
            <EditableField
              label="Dias para alerta de atestado vencendo"
              name="alerts.medicalCertificateExpiringDays"
              value={settings.alerts.medicalCertificateExpiringDays}
              type="number"
            />
            <EditableField
              label="Regra de mensalidade atrasada"
              name="alerts.overdueMonthlyFeeRule"
              value={settings.alerts.overdueMonthlyFeeRule}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={BadgeDollarSign}
          title="Mensalidades"
          description="Parâmetros gerais do controle financeiro simples."
        >
          <div className="grid gap-3">
            <EditableField
              label="Valor padrão"
              name="monthlyFees.defaultAmount"
              value={settings.monthlyFees.defaultAmount}
            />
            <EditableField
              label="Dia padrão de vencimento"
              name="monthlyFees.defaultDueDay"
              value={settings.monthlyFees.defaultDueDay}
              type="number"
            />
            <CheckboxField
              label="Permitir isenção"
              name="monthlyFees.allowExemption"
              checked={settings.monthlyFees.allowExemption}
            />
            <CheckboxField
              label="Permitir pagamento parcial"
              name="monthlyFees.allowPartialPayment"
              checked={settings.monthlyFees.allowPartialPayment}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-zinc-500">
            Valores individuais são definidos no cadastro financeiro do atleta.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={KeyRound}
          title="Usuários e permissões"
          description="Perfis disponíveis e gestão de acesso ao sistema."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/usuarios">Gerenciar usuários</Link>
            </Button>
          }
        >
          <InfoGrid items={[["Usuários cadastrados", String(userCount)]]} />
          <div className="mt-3 flex flex-wrap gap-2">
            {profiles.map((profile) => (
              <Badge key={profile} className="border-zinc-200 bg-zinc-50 text-zinc-700">
                {profileLabels[profile]}
              </Badge>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={LayoutDashboard}
          title="Personalização do Dashboard"
          description="Configuração padrão dos cards exibidos conforme perfil e permissão."
        >
          <div className="space-y-4">
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              Nesta versão, os cards são definidos em helper centralizado. Os controles
              abaixo mostram a configuração padrão e ficam preparados para persistência
              futura no banco.
            </p>
            {dashboardCategories.map((category) => {
              const cards = dashboardCardDefinitions.filter(
                (card) => card.category === category.id,
              );

              return (
                <div
                  key={category.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <h3 className="font-black text-zinc-950">{category.label}</h3>
                  <div className="mt-3 space-y-3">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-md border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-black text-zinc-950">
                              {card.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              {card.description}
                            </p>
                            {card.sensitive ? (
                              <Badge className="mt-2 border-jr-red/20 bg-jr-red/10 text-jr-red">
                                Sensível
                              </Badge>
                            ) : null}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {profiles.map((profile) => {
                              const allowed =
                                profile === "SUPER_ADMIN" ||
                                card.allowedProfiles.includes(profile);
                              const enabled =
                                allowed &&
                                (settings.dashboard[profile] ?? []).includes(card.id);

                              return (
                                <label
                                  key={profile}
                                  className={
                                    allowed
                                      ? "flex items-center gap-2 text-xs font-bold text-zinc-700"
                                      : "flex items-center gap-2 text-xs font-bold text-zinc-400"
                                  }
                                >
                                  <input
                                    name={`dashboard.${profile}.${card.id}`}
                                    type="checkbox"
                                    defaultChecked={enabled}
                                    disabled={!allowed}
                                    className="size-4 accent-jr-red"
                                  />
                                  {profileLabels[profile]}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={UploadCloud}
          title="Uploads e storage"
          description="Configuração esperada dos buckets privados do Supabase Storage."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <StorageItem
              label="Fotos de atletas"
              value="athlete-photos"
              configured={storageConfigured}
            />
            <StorageItem
              label="Documentos de atletas"
              value="athlete-documents"
              configured={storageConfigured}
            />
          </div>
          <InfoGrid
            className="mt-4"
            items={[
              ["Limite de fotos", "2 MB"],
              ["Limite de documentos", "10 MB"],
              ["Fotos permitidas", "JPG, PNG e WEBP"],
              ["Documentos permitidos", "PDF, JPG, PNG e WEBP"],
            ]}
          />
          <p className="mt-3 text-xs font-semibold text-zinc-500">
            Chaves secretas, URLs completas e senhas não são exibidas nesta tela.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={Palette}
          title="Identidade visual"
          description="Parâmetros visuais institucionais da JR."
        >
          <InfoGrid
            items={[
              ["Logo", "Logo oficial da Associação Paradesportiva JR-SP"],
              ["Tema", "Institucional, administrativo e esportivo"],
              ["Cores oficiais", "Vermelho institucional, preto, cinza escuro, cinza claro e branco"],
            ]}
          />
          <div className="mt-4 flex gap-2">
            <span className="h-8 w-8 rounded-md bg-jr-red" title="Vermelho JR" />
            <span className="h-8 w-8 rounded-md bg-zinc-950" title="Preto" />
            <span className="h-8 w-8 rounded-md bg-zinc-700" title="Cinza escuro" />
            <span className="h-8 w-8 rounded-md bg-zinc-200" title="Cinza claro" />
            <span className="h-8 w-8 rounded-md border border-zinc-300 bg-white" title="Branco" />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={ImageIcon}
          title="Preferências do sistema"
          description="Padrões de idioma, datas, moeda e exportação."
        >
          <InfoGrid
            items={[
              ["Idioma", "pt-BR"],
              ["Fuso horário", "America/Sao_Paulo"],
              ["Formato de data", "dd/mm/aaaa"],
              ["Moeda", "Real brasileiro"],
              ["Separador CSV", "Ponto e vírgula (;)"],
              ["Codificação CSV", "UTF-8 com BOM"],
            ]}
          />
        </SettingsCard>

        <SettingsCard
          icon={Database}
          title="Manutenção"
          description="Status básico e atalhos administrativos."
        >
          <InfoGrid
            items={[
              ["Banco de dados", databaseOk ? "Configurado" : "Não configurado"],
              ["Storage", storageConfigured ? "Configurado" : "Não configurado"],
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/relatorios">Relatórios</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/relatorios/documentos">Exportações documentais</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/relatorios/mensalidades">Exportações financeiras</Link>
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={ShieldCheck}
          title="Escopo da tela"
          description="Separação entre configuração geral e cadastros operacionais."
        >
          <InfoGrid
            items={[
              ["Cadastros operacionais", "Permanecem nos módulos próprios"],
              ["Dados sensíveis", "Não são exibidos nesta tela"],
              ["Edição nesta versão", "Configurações informativas e atalhos administrativos"],
            ]}
          />
        </SettingsCard>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" className="shadow-lg">
          Salvar configurações
        </Button>
      </div>
      </form>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Icon className="mb-3 size-5 text-jr-red" aria-hidden="true" />
            <CardTitle>{title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoGrid({
  items,
  className,
}: {
  items: Array<[string, string]>;
  className?: string;
}) {
  return (
    <div className={["grid gap-3", className].filter(Boolean).join(" ")}>
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
        >
          <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-zinc-950">{value}</p>
        </div>
      ))}
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  type?: "text" | "email" | "number" | "date";
}) {
  return (
    <label className="grid gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="text-xs font-black uppercase text-zinc-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value}
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      />
    </label>
  );
}

function CheckboxField({
  label,
  name,
  checked,
}: {
  label: string;
  name: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-bold text-zinc-950">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="size-4 accent-jr-red"
      />
      {label}
    </label>
  );
}

function StorageItem({
  label,
  value,
  configured,
}: {
  label: string;
  value: string;
  configured: boolean;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
      <Badge
        className={
          configured
            ? "mt-3 border-emerald-200 bg-emerald-50 text-emerald-800"
            : "mt-3 border-amber-200 bg-amber-50 text-amber-800"
        }
      >
        {configured ? "Configurado" : "Não configurado"}
      </Badge>
    </div>
  );
}
