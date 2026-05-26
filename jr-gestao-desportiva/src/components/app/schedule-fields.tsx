"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { weekdayOptions } from "@/lib/training";

type Schedule = {
  id: string;
  weekday: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export function ScheduleFields({
  schedules,
}: {
  schedules: {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    notes: string | null;
  }[];
}) {
  const [fields, setFields] = useState<Schedule[]>(
    schedules.map((schedule) => ({
      id: schedule.id,
      weekday: String(schedule.weekday),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      notes: schedule.notes ?? "",
    }))
  );

  function addSchedule() {
    setFields((current) => [
      ...current,
      { id: crypto.randomUUID(), weekday: "1", startTime: "", endTime: "", notes: "" },
    ]);
  }

  function removeSchedule(id: string) {
    setFields((current) => current.filter((field) => field.id !== id));
  }

  function updateSchedule(id: string, key: keyof Schedule, value: string) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, [key]: value } : field))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">
            Horários de treino
          </h3>
          <p className="text-xs font-semibold text-zinc-500">
            Adicione os dias e horários recorrentes da turma.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={addSchedule}>
          <Plus className="mr-2 size-4" />
          Adicionar horário
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">
          Nenhum horário informado.
        </div>
      ) : null}

      <div className="space-y-3">
        {fields.map((field) => (
          <div
            key={field.id}
            className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_140px_140px_1fr_auto]"
          >
            <div className="space-y-2">
              <Label htmlFor={`weekday-${field.id}`}>Dia da semana</Label>
              <select
                id={`weekday-${field.id}`}
                name="weekday"
                value={field.weekday}
                onChange={(event) =>
                  updateSchedule(field.id, "weekday", event.target.value)
                }
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              >
                {weekdayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              id={`start-${field.id}`}
              label="Início"
              name="startTime"
              value={field.startTime}
              type="time"
              onChange={(value) => updateSchedule(field.id, "startTime", value)}
            />
            <Field
              id={`end-${field.id}`}
              label="Fim"
              name="endTime"
              value={field.endTime}
              type="time"
              onChange={(value) => updateSchedule(field.id, "endTime", value)}
            />
            <Field
              id={`notes-${field.id}`}
              label="Observações"
              name="scheduleNotes"
              value={field.notes}
              onChange={(value) => updateSchedule(field.id, "notes", value)}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-zinc-700 hover:text-jr-red md:w-10 md:px-0"
                onClick={() => removeSchedule(field.id)}
                aria-label="Remover horário"
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

function Field({
  id,
  label,
  name,
  value,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
