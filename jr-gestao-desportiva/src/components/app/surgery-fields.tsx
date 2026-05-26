"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SurgeryField = {
  key: string;
  name: string;
  surgeryDate: string;
};

type SurgeryFieldsProps = {
  surgeries: {
    id: string;
    name: string;
    surgeryDate: Date | null;
  }[];
};

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function SurgeryFields({ surgeries }: SurgeryFieldsProps) {
  const [fields, setFields] = useState<SurgeryField[]>(
    surgeries.map((surgery) => ({
      key: surgery.id,
      name: surgery.name,
      surgeryDate: toDateInputValue(surgery.surgeryDate),
    }))
  );

  function addSurgery() {
    setFields((current) => [
      ...current,
      { key: crypto.randomUUID(), name: "", surgeryDate: "" },
    ]);
  }

  function removeSurgery(key: string) {
    setFields((current) => current.filter((field) => field.key !== key));
  }

  function updateSurgery(
    key: string,
    fieldName: "name" | "surgeryDate",
    value: string
  ) {
    setFields((current) =>
      current.map((field) =>
        field.key === key ? { ...field, [fieldName]: value } : field
      )
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
            Cirurgias
          </h3>
          <p className="text-xs font-semibold text-zinc-500">
            Informe cada cirurgia realizada e a data, se souber.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={addSurgery}>
          <Plus className="mr-2 size-4" />
          Adicionar cirurgia
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">
          Nenhuma cirurgia informada.
        </div>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.key}
            className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_180px_auto]"
          >
            <div className="space-y-2">
              <Label htmlFor={`surgeryName-${field.key}`}>
                Qual cirurgia?
              </Label>
              <Input
                id={`surgeryName-${field.key}`}
                name="surgeryName"
                value={field.name}
                onChange={(event) =>
                  updateSurgery(field.key, "name", event.target.value)
                }
                placeholder={`Cirurgia ${index + 1}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`surgeryDate-${field.key}`}>Data</Label>
              <Input
                id={`surgeryDate-${field.key}`}
                name="surgeryDate"
                type="date"
                value={field.surgeryDate}
                onChange={(event) =>
                  updateSurgery(field.key, "surgeryDate", event.target.value)
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                className="w-full border-zinc-300 text-zinc-700 hover:border-jr-red hover:text-jr-red md:w-10 md:px-0"
                onClick={() => removeSurgery(field.key)}
                aria-label="Remover cirurgia"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
