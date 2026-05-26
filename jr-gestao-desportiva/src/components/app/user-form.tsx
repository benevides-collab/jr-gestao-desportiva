import type { RoleSlug } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileFromRoleSlug, profileLabels, profiles, profileToRoleSlug } from "@/lib/roles";
import type { Profile } from "@/lib/roles";

type StaffOption = {
  id: string;
  fullName: string;
  type: string;
};

type UserFormData = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  notes: string | null;
  staffMemberId: string | null;
  role: {
    slug: RoleSlug;
  };
};

export function UserForm({
  action,
  user,
  staffMembers,
  currentProfile,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  user?: UserFormData;
  staffMembers: StaffOption[];
  currentProfile: Profile;
  error?: string;
}) {
  const selectedProfile = user ? profileFromRoleSlug(user.role.slug) : "CONSULTA";
  const allowedProfiles =
    currentProfile === "SUPER_ADMIN"
      ? profiles
      : profiles.filter((profile) => profile !== "SUPER_ADMIN");
  const isEditing = Boolean(user);

  return (
    <form action={action} className="space-y-6">
      {user ? <input type="hidden" name="userId" value={user.id} /> : null}

      {error ? (
        <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red">
          {errorMessage(error)}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={user?.name ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile">Perfil</Label>
            <select
              id="profile"
              name="profile"
              defaultValue={selectedProfile}
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              {allowedProfiles.map((profile) => (
                <option key={profile} value={profile}>
                  {profileLabels[profile]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="staffMemberId">Profissional vinculado</Label>
            <select
              id="staffMemberId"
              name="staffMemberId"
              defaultValue={user?.staffMemberId ?? ""}
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Nenhum vínculo</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName}
                </option>
              ))}
            </select>
            <p className="text-xs font-semibold text-zinc-500">
              Use principalmente para professor ou assistente.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing ? "Nova senha / reset de senha" : "Senha inicial"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required={!isEditing}
              placeholder={isEditing ? "Preencha apenas para trocar a senha" : ""}
            />
            <p className="text-xs font-semibold text-zinc-500">
              A senha é armazenada com hash.
            </p>
          </div>
          <label className="flex items-center gap-3 pt-8 text-sm font-bold text-zinc-950">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user?.isActive ?? true}
              className="size-4 accent-jr-red"
            />
            Usuário ativo
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={user?.notes ?? ""}
              className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{isEditing ? "Salvar usuário" : "Criar usuário"}</Button>
      </div>
    </form>
  );
}

export function roleNameFromSlug(slug: RoleSlug) {
  return profileLabels[profileFromRoleSlug(slug)];
}

export function profileValueFromSlug(slug: RoleSlug) {
  return profileToRoleSlug[profileFromRoleSlug(slug)];
}

function errorMessage(error: string) {
  const messages: Record<string, string> = {
    "campos-obrigatorios": "Preencha nome, e-mail e senha inicial.",
    "email-existente": "Já existe um usuário com este e-mail.",
    "perfil-invalido": "Perfil inválido ou inativo.",
    "ultimo-super-admin": "Não é permitido remover ou rebaixar o último SUPER_ADMIN ativo.",
    "sem-permissao-super-admin": "Apenas SUPER_ADMIN pode criar ou alterar outro SUPER_ADMIN.",
  };

  return messages[error] ?? "Não foi possível salvar o usuário.";
}

