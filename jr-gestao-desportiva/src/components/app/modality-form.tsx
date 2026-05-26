import type { Modality } from "@prisma/client";

import { createModality, updateModality } from "@/app/(admin)/admin/modalidades/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ModalityFormProps = {
  modality?: Modality;
};

export function ModalityForm({ modality }: ModalityFormProps) {
  const action = modality ? updateModality : createModality;

  return (
    <form action={action} className="space-y-6">
      {modality ? <input type="hidden" name="id" value={modality.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Dados da modalidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Nome da modalidade" name="name" value={modality?.name} required />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={modality?.isActive === false ? "inactive" : "active"}
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
            >
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
            </select>
          </div>
          <Area label="Descrição" name="description" value={modality?.description} />
          <Area label="Observações" name="notes" value={modality?.notes} />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit">{modality ? "Salvar modalidade" : "Cadastrar modalidade"}</Button>
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
        rows={4}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      />
    </div>
  );
}
