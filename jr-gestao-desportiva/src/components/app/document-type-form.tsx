import type { DocumentType } from "@prisma/client";

import {
  createDocumentType,
  updateDocumentType,
} from "@/app/(admin)/admin/documentos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { periodicityOptions } from "@/lib/documents";

type DocumentTypeFormProps = {
  documentType?: DocumentType;
};

export function DocumentTypeForm({ documentType }: DocumentTypeFormProps) {
  const action = documentType ? updateDocumentType : createDocumentType;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {documentType ? "Editar tipo de documento" : "Novo tipo de documento"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          {documentType ? (
            <input type="hidden" name="id" value={documentType.id} />
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                defaultValue={documentType?.name ?? ""}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                name="description"
                defaultValue={documentType?.description ?? ""}
                rows={3}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodicity">Periodicidade</Label>
              <select
                id="periodicity"
                name="periodicity"
                defaultValue={documentType?.periodicity ?? "annual"}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                {periodicityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                name="notes"
                defaultValue={documentType?.notes ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CheckOption
              name="isRequired"
              label="Documento obrigatório"
              defaultChecked={documentType?.isRequired ?? true}
            />
            <CheckOption
              name="requiresExpirationDate"
              label="Exige data de validade"
              defaultChecked={documentType?.requiresExpirationDate ?? false}
            />
            <CheckOption
              name="appliesToMinors"
              label="Aplicável a menor de idade"
              defaultChecked={documentType?.appliesToMinors ?? true}
            />
            <CheckOption
              name="appliesToAdults"
              label="Aplicável a maior de idade"
              defaultChecked={documentType?.appliesToAdults ?? true}
            />
            <CheckOption
              name="isActive"
              label="Tipo ativo"
              defaultChecked={documentType?.isActive ?? true}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Salvar tipo</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CheckOption({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-zinc-300 accent-jr-red"
      />
      {label}
    </label>
  );
}
