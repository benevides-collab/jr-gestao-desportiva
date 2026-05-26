import type { Competition, Modality, StaffMember } from "@prisma/client";

import {
  createCompetition,
  updateCompetition,
} from "@/app/(admin)/admin/competicoes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { competitionStatusOptions } from "@/lib/competitions";

type CompetitionWithAssistants = Competition & {
  assistants?: Array<{ staffMemberId: string }>;
};

type CompetitionFormProps = {
  competition?: CompetitionWithAssistants;
  modalities: Modality[];
  staffMembers: StaffMember[];
};

export function CompetitionForm({
  competition,
  modalities,
  staffMembers,
}: CompetitionFormProps) {
  const action = competition ? updateCompetition : createCompetition;
  const selectedAssistants = new Set(
    competition?.assistants?.map((assistant) => assistant.staffMemberId) ?? []
  );
  const teachers = staffMembers.filter((staff) => staff.type === "teacher");
  const assistants = staffMembers.filter((staff) => staff.type === "assistant");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {competition ? "Editar competição" : "Nova competição"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          {competition ? <input type="hidden" name="id" value={competition.id} /> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <TextInput label="Nome da competição" name="name" value={competition?.name} required />
            <SelectInput
              label="Modalidade"
              name="modalityId"
              value={competition?.modalityId}
              options={modalities.map((modality) => ({
                value: modality.id,
                label: modality.name,
              }))}
            />
            <DateInput label="Data inicial" name="startsAt" value={competition?.startsAt} required />
            <DateInput label="Data final" name="endsAt" value={competition?.endsAt} />
            <TextInput label="Local" name="location" value={competition?.location} />
            <TextInput label="Endereço" name="address" value={competition?.address} />
            <TextInput label="Cidade" name="city" value={competition?.city} />
            <TextInput label="Estado" name="state" value={competition?.state} />
            <TextInput label="Organizador" name="organizer" value={competition?.organizer} />
            <TextInput
              label="Horário de concentração"
              name="meetingTime"
              value={competition?.meetingTime}
            />
            <TextInput label="Transporte" name="transportation" value={competition?.transportation} />
            <SelectInput
              label="Status"
              name="status"
              value={competition?.status ?? "planned"}
              options={competitionStatusOptions}
            />
            <SelectInput
              label="Treinador responsável"
              name="responsibleTeacherId"
              value={competition?.responsibleTeacherId}
              options={teachers.map((teacher) => ({
                value: teacher.id,
                label: teacher.fullName,
              }))}
            />
            <div className="space-y-2 md:col-span-2">
              <Label>Assistentes envolvidos</Label>
              <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
                {assistants.map((assistant) => (
                  <label
                    key={assistant.id}
                    className="flex items-center gap-3 text-sm font-semibold text-zinc-800"
                  >
                    <input
                      type="checkbox"
                      name="assistantIds"
                      value={assistant.id}
                      defaultChecked={selectedAssistants.has(assistant.id)}
                      className="size-4 rounded border-zinc-300 accent-jr-red"
                    />
                    {assistant.fullName}
                  </label>
                ))}
                {assistants.length === 0 ? (
                  <span className="text-sm font-semibold text-zinc-500">
                    Nenhum assistente ativo cadastrado.
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={competition?.notes ?? ""}
                rows={4}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Salvar competição</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TextInput({
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

function DateInput({
  label,
  name,
  value,
  required,
}: {
  label: string;
  name: string;
  value?: Date | null;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="date"
        defaultValue={value ? value.toISOString().slice(0, 10) : ""}
        required={required}
      />
    </div>
  );
}

function SelectInput({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string | null;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value ?? ""}
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-jr-red focus:ring-2 focus:ring-jr-red/15"
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
