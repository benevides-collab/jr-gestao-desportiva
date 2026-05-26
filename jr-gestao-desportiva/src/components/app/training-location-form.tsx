import type { Address, TrainingLocation } from "@prisma/client";

import {
  createTrainingLocation,
  updateTrainingLocation,
} from "@/app/(admin)/admin/locais/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationWithAddress = TrainingLocation & { address: Address | null };

export function TrainingLocationForm({
  location,
}: {
  location?: LocationWithAddress;
}) {
  const action = location ? updateTrainingLocation : createTrainingLocation;

  return (
    <form action={action} className="space-y-6">
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Dados do local</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Nome do local" name="name" value={location?.name} required />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={location?.isActive === false ? "inactive" : "active"}
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <Field label="Link do mapa" name="mapUrl" value={location?.mapUrl} />
          <Area label="Acessibilidade" name="accessibility" value={location?.accessibility} />
          <Area label="Observações" name="notes" value={location?.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="CEP" name="postalCode" value={location?.address?.postalCode} />
          <Field label="Rua" name="street" value={location?.address?.street} />
          <Field label="Número" name="number" value={location?.address?.number} />
          <Field
            label="Complemento"
            name="complement"
            value={location?.address?.complement}
          />
          <Field
            label="Bairro"
            name="neighborhood"
            value={location?.address?.neighborhood}
          />
          <Field label="Cidade" name="city" value={location?.address?.city} />
          <Field label="Estado" name="state" value={location?.address?.state} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{location ? "Salvar local" : "Cadastrar local"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  required,
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value ?? ""} required={required} />
    </div>
  );
}

function Area({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={value ?? ""}
        rows={3}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      />
    </div>
  );
}
