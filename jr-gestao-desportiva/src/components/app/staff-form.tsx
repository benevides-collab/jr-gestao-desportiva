import type { Modality, StaffMember, StaffModality } from "@prisma/client";
import type { ReactNode } from "react";

import {
  createStaffMember,
  updateStaffMember,
} from "@/app/(admin)/admin/professores/actions";
import { PhotoUpload } from "@/components/app/photo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { staffRegistrationTypeOptions } from "@/lib/training";

type StaffWithModalities = StaffMember & {
  modalities: (StaffModality & { modality: Modality })[];
};

export function StaffForm({
  staff,
  modalities,
  error,
}: {
  staff?: StaffWithModalities;
  modalities: Modality[];
  error?: string;
}) {
  const action = staff ? updateStaffMember : createStaffMember;
  const selectedModalities = new Set(
    staff?.modalities.map((link) => link.modalityId) ?? []
  );

  return (
    <form action={action} className="space-y-6">
      {staff ? <input type="hidden" name="id" value={staff.id} /> : null}
      {error ? (
        <div className="rounded-md border border-jr-red/20 bg-jr-red/10 p-3 text-sm font-bold text-jr-red">
          Não foi possível salvar a foto. Verifique o bucket staff-photos no Supabase Storage.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do profissional</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" name="fullName" defaultValue={staff?.fullName ?? ""} required />
          </div>
          <PhotoUpload
            name={staff?.fullName ?? "Equipe JR"}
            currentPhotoUrl={staff?.photoUrl}
            label="Foto 3x4 ou identificação"
          />
          <Select label="Função" name="type" value={staff?.type ?? "teacher"}>
            {staffRegistrationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Field label="CPF" name="cpf" value={staff?.cpf} />
          <Field label="RG" name="rg" value={staff?.rg} />
          <Field label="Telefone" name="phone" value={staff?.phone} />
          <Field label="WhatsApp" name="whatsapp" value={staff?.whatsapp} />
          <Field label="E-mail" name="email" value={staff?.email} type="email" />
          <Select
            label="Status"
            name="status"
            value={staff?.isActive === false ? "inactive" : "active"}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modalidades vinculadas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modalities.map((modality) => (
            <label
              key={modality.id}
              className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800"
            >
              <input
                type="checkbox"
                name="modalityId"
                value={modality.id}
                defaultChecked={selectedModalities.has(modality.id)}
                className="size-4 rounded border-zinc-300 accent-jr-red"
              />
              {modality.name}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            name="notes"
            defaultValue={staff?.notes ?? ""}
            rows={4}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{staff ? "Salvar profissional" : "Cadastrar profissional"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
}: {
  label: string;
  name: string;
  value?: string | null;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={value ?? ""} />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      >
        {children}
      </select>
    </div>
  );
}
