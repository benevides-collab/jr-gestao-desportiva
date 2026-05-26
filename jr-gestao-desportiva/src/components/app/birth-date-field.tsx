"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BirthDateFieldProps = {
  defaultValue?: string;
};

function calculateAgeFromInput(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  if (birthDate > today) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function BirthDateField({ defaultValue = "" }: BirthDateFieldProps) {
  const [birthDate, setBirthDate] = useState(defaultValue);
  const age = useMemo(() => calculateAgeFromInput(birthDate), [birthDate]);
  const isMinor = age !== null && age < 18;

  return (
    <div className="space-y-2">
      <Label htmlFor="birthDate">Data de nascimento</Label>
      <Input
        id="birthDate"
        name="birthDate"
        type="date"
        value={birthDate}
        onChange={(event) => setBirthDate(event.target.value)}
        required
      />
      {age !== null ? (
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">
          Idade calculada: {age} anos
        </p>
      ) : null}
      {isMinor ? (
        <div className="rounded-md border border-jr-red/25 bg-jr-red/10 p-3 text-sm font-semibold text-jr-red">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Atleta menor de idade. O cadastro de responsável legal será
              obrigatório no próximo módulo.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
