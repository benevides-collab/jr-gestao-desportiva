import type {
  ClassSchedule,
  Modality,
  StaffMember,
  TrainingClass,
  TrainingClassAssistant,
  TrainingLocation,
} from "@prisma/client";
import type { ReactNode } from "react";

import {
  createTrainingClass,
  updateTrainingClass,
} from "@/app/(admin)/admin/turmas/actions";
import { ScheduleFields } from "@/components/app/schedule-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClassWithRelations = TrainingClass & {
  schedules: ClassSchedule[];
  assistants: TrainingClassAssistant[];
};

export function TrainingClassForm({
  trainingClass,
  modalities,
  locations,
  teachers,
  assistants,
}: {
  trainingClass?: ClassWithRelations;
  modalities: Modality[];
  locations: TrainingLocation[];
  teachers: StaffMember[];
  assistants: StaffMember[];
}) {
  const action = trainingClass ? updateTrainingClass : createTrainingClass;
  const selectedAssistants = new Set(
    trainingClass?.assistants.map((link) => link.staffMemberId) ?? []
  );

  return (
    <form action={action} className="space-y-6">
      {trainingClass ? (
        <input type="hidden" name="id" value={trainingClass.id} />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Dados da turma</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Nome da turma" name="name" value={trainingClass?.name} required />
          <Select label="Modalidade" name="modalityId" value={trainingClass?.modalityId ?? ""}>
            <option value="">Selecione</option>
            {modalities.map((modality) => (
              <option key={modality.id} value={modality.id}>
                {modality.name}
              </option>
            ))}
          </Select>
          <Select
            label="Local de treino"
            name="trainingLocationId"
            value={trainingClass?.trainingLocationId ?? ""}
          >
            <option value="">Selecione</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          <Select label="Treinador responsÃ¡vel" name="teacherId" value={trainingClass?.teacherId ?? ""}>
            <option value="">Selecione</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName}
              </option>
            ))}
          </Select>
          <Field
            label="Capacidade mÃ¡xima"
            name="capacity"
            type="number"
            value={trainingClass?.capacity?.toString()}
          />
          <Select
            label="Status"
            name="status"
            value={trainingClass?.isActive === false ? "inactive" : "active"}
          >
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
          </Select>
          <Area label="ObservaÃ§Ãµes" name="notes" value={trainingClass?.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistentes vinculados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assistants.map((assistant) => (
            <label
              key={assistant.id}
              className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800"
            >
              <input
                type="checkbox"
                name="assistantId"
                value={assistant.id}
                defaultChecked={selectedAssistants.has(assistant.id)}
                className="size-4 rounded border-zinc-300 accent-jr-red"
              />
              {assistant.fullName}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HorÃ¡rios</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleFields schedules={trainingClass?.schedules ?? []} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{trainingClass ? "Salvar turma" : "Cadastrar turma"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  value?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
      />
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
        required
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      >
        {children}
      </select>
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
