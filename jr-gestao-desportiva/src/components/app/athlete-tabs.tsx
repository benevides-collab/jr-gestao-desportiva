import Link from "next/link";

type AthleteTabsProps = {
  athleteId: string;
  activeTab: string;
};

const tabs = [
  ["dados", "Dados gerais"],
  ["responsaveis", "Responsáveis"],
  ["escola", "Escola"],
  ["medico", "Médico/Saúde"],
  ["documentos", "Documentos"],
  ["turmas", "Turmas"],
  ["presenca", "Presença"],
  ["competicoes", "Competições"],
  ["financeiro", "Financeiro"],
];

export function AthleteTabs({ athleteId, activeTab }: AthleteTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-zinc-200 pb-2">
      {tabs.map(([value, label]) => (
        <Link
          key={value}
          href={`/admin/atletas/${athleteId}${value === "dados" ? "" : `?aba=${value}`}`}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold ${
            activeTab === value
              ? "bg-jr-red text-white"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
