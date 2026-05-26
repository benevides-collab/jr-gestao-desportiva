import type { Address, Guardian } from "@prisma/client";
import type { ReactNode } from "react";

import {
  createGuardian,
  updateGuardian,
} from "@/app/(admin)/admin/responsaveis/actions";
import { PhotoUpload } from "@/components/app/photo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { relationshipFromGuardianType, relationshipOptions } from "@/lib/guardians";

type GuardianWithAddress = Guardian & {
  address: Address | null;
};

type GuardianFormProps = {
  guardian?: GuardianWithAddress;
  athleteId?: string;
  error?: string;
};

export function GuardianForm({ guardian, athleteId, error }: GuardianFormProps) {
  const action = guardian ? updateGuardian : createGuardian;
  const relationshipDefault = guardian
    ? relationshipFromGuardianType(guardian.type)
    : "";

  return (
    <form action={action} className="space-y-6">
      {guardian ? <input type="hidden" name="guardianId" value={guardian.id} /> : null}
      {athleteId ? <input type="hidden" name="athleteId" value={athleteId} /> : null}

      {error === "duplicado" ? (
        <ErrorMessage>
          Já existe um responsável cadastrado com este CPF, e-mail ou telefone.
        </ErrorMessage>
      ) : null}

      {error === "foto-invalida" ? (
        <ErrorMessage>Use uma foto JPG, PNG ou WEBP com no máximo 2 MB.</ErrorMessage>
      ) : null}

      {error === "storage-config" ? (
        <ErrorMessage>
          O upload de foto ainda não está configurado no servidor.
        </ErrorMessage>
      ) : null}

      {error === "storage" ? (
        <ErrorMessage>
          Não foi possível salvar a foto. Verifique o bucket guardian-photos no
          Supabase Storage.
        </ErrorMessage>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do responsável</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={guardian?.fullName ?? ""}
              required
            />
          </div>

          <PhotoUpload
            name={guardian?.fullName ?? "Responsável JR"}
            currentPhotoUrl={guardian?.photoUrl}
            label="Foto 3x4 ou identificação"
          />

          <div className="space-y-2">
            <Label htmlFor="relationship">Grau de parentesco</Label>
            <select
              id="relationship"
              name="relationship"
              defaultValue={relationshipDefault}
              required
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="">Selecione</option>
              {relationshipOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" defaultValue={guardian?.cpf ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rg">RG</Label>
            <Input id="rg" name="rg" defaultValue={guardian?.rg ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={guardian?.phone ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={guardian?.whatsapp ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={guardian?.email ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={guardian?.notes ?? ""}
              rows={4}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-500 focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            />
          </div>
        </CardContent>
      </Card>

      {athleteId && !guardian ? <GuardianLinkFields /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <TextInput label="CEP" name="postalCode" value={guardian?.address?.postalCode} />
          <TextInput label="Rua" name="street" value={guardian?.address?.street} />
          <TextInput label="Número" name="number" value={guardian?.address?.number} />
          <TextInput
            label="Complemento"
            name="complement"
            value={guardian?.address?.complement}
          />
          <TextInput
            label="Bairro"
            name="neighborhood"
            value={guardian?.address?.neighborhood}
          />
          <TextInput label="Cidade" name="city" value={guardian?.address?.city} />
          <TextInput label="Estado" name="state" value={guardian?.address?.state} maxLength={2} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">
          {guardian ? "Salvar responsável" : "Cadastrar responsável"}
        </Button>
      </div>
    </form>
  );
}

export function GuardianLinkFields() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vínculo com o atleta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField name="isLegalGuardian" label="Responsável legal" />
          <CheckboxField name="isFinancialGuardian" label="Responsável financeiro" />
          <CheckboxField name="isEmergencyContact" label="Contato de emergência" />
          <CheckboxField name="canPickup" label="Autorizado a retirar o atleta" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkNotes">Observações do vínculo</Label>
          <textarea
            id="linkNotes"
            name="linkNotes"
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-500 focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TextInput({
  label,
  name,
  value,
  maxLength,
}: {
  label: string;
  name: string;
  value?: string | null;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value ?? ""} maxLength={maxLength} />
    </div>
  );
}

function CheckboxField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
      <input
        type="checkbox"
        name={name}
        className="size-4 rounded border-zinc-300 accent-jr-red"
      />
      {label}
    </label>
  );
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
      {children}
    </div>
  );
}
