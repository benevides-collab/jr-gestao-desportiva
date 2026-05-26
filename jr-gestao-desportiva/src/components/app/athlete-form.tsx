import type { Address, Athlete } from "@prisma/client";
import type { ReactNode } from "react";

import { createAthlete, updateAthlete } from "@/app/(admin)/admin/atletas/actions";
import { BirthDateField } from "@/components/app/birth-date-field";
import { PhotoUpload } from "@/components/app/photo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  athleteStatusLabels,
  genderLabels,
  toDateInputValue,
} from "@/lib/athletes";

type AthleteWithAddress = Athlete & {
  address: Address | null;
};

type AthleteFormProps = {
  athlete?: AthleteWithAddress;
  error?: string;
};

const statusOptions = Object.entries(athleteStatusLabels);
const genderOptions = Object.entries(genderLabels);

export function AthleteForm({ athlete, error }: AthleteFormProps) {
  const action = athlete ? updateAthlete : createAthlete;

  return (
    <form action={action} className="space-y-6">
      {athlete ? <input type="hidden" name="athleteId" value={athlete.id} /> : null}

      {error === "data-futura" ? (
        <ErrorMessage>A data de nascimento não pode ser futura.</ErrorMessage>
      ) : null}

      {error === "entrada-futura" ? (
        <ErrorMessage>A data de entrada na associação não pode ser futura.</ErrorMessage>
      ) : null}

      {error === "foto-invalida" ? (
        <ErrorMessage>Use uma foto JPG, PNG ou WEBP com no máximo 2 MB.</ErrorMessage>
      ) : null}

      {error === "storage" ? (
        <ErrorMessage>
          Não foi possível salvar a foto. Verifique se o bucket athlete-photos
          existe no Supabase Storage e se as permissões permitem upload pelo
          servidor.
        </ErrorMessage>
      ) : null}

      {error === "storage-config" ? (
        <ErrorMessage>
          O upload de foto ainda não está configurado no servidor. Configure
          SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env e reinicie o app.
        </ErrorMessage>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do atleta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={athlete?.fullName ?? ""}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="preferredName">Nome social / apelido</Label>
            <Input
              id="preferredName"
              name="preferredName"
              defaultValue={athlete?.preferredName ?? ""}
            />
          </div>

          <PhotoUpload
            name={athlete?.fullName ?? "Atleta JR"}
            currentPhotoUrl={athlete?.photoUrl}
          />

          <BirthDateField defaultValue={toDateInputValue(athlete?.birthDate)} />

          <div className="space-y-2">
            <Label htmlFor="joinedAt">Data de entrada</Label>
            <Input
              id="joinedAt"
              name="joinedAt"
              type="date"
              defaultValue={toDateInputValue(athlete?.joinedAt)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" defaultValue={athlete?.cpf ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rg">RG</Label>
            <Input id="rg" name="rg" defaultValue={athlete?.rg ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone do atleta</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={athlete?.phone ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail do atleta</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={athlete?.email ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Sexo</Label>
            <select
              id="gender"
              name="gender"
              defaultValue={athlete?.gender ?? "not_informed"}
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              {genderOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={athlete?.status ?? "trial"}
              required
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Observações gerais</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={athlete?.notes ?? ""}
              rows={4}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-500 focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postalCode">CEP</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={athlete?.address?.postalCode ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              name="street"
              defaultValue={athlete?.address?.street ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              name="number"
              defaultValue={athlete?.address?.number ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              name="complement"
              defaultValue={athlete?.address?.complement ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              defaultValue={athlete?.address?.neighborhood ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={athlete?.address?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              name="state"
              defaultValue={athlete?.address?.state ?? ""}
              maxLength={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit">
          {athlete ? "Salvar alterações" : "Cadastrar atleta"}
        </Button>
      </div>
    </form>
  );
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
      {children}
    </div>
  );
}
