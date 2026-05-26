import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ReportOption } from "@/lib/reports";

export function ReportPageHeader({
  title,
  description,
  exportHref,
}: {
  title: string;
  description: string;
  exportHref?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {exportHref ? (
        <Button asChild variant="secondary">
          <Link href={exportHref}>Exportar CSV</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
      </CardContent>
    </Card>
  );
}

export function SelectFilter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: ReportOption[];
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
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextFilter({
  label,
  name,
  value,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  type?: "text" | "date" | "number";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={value}
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      />
    </div>
  );
}

export function FilterActions({ clearHref }: { clearHref: string }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <Button asChild variant="secondary">
        <Link href={clearHref}>Limpar filtros</Link>
      </Button>
      <Button type="submit">Filtrar</Button>
    </div>
  );
}

