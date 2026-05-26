import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/app/brand-logo";
import { menuForProfile } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";

type SidebarProps = {
  user: SessionUser;
};

export function Sidebar({ user }: SidebarProps) {
  const navigation = menuForProfile(user.role);

  return (
    <aside className="hidden min-h-screen w-72 border-r border-zinc-800 bg-jr-black text-white lg:flex lg:flex-col">
      <div className="border-b border-zinc-800 px-6 py-5">
        <BrandLogo className="w-28" priority />
        <p className="mt-4 text-xs font-black uppercase tracking-wide text-white">
          Associação Paradesportiva JR-SP
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Painel administrativo
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-jr-red hover:text-white"
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="size-4 text-jr-red" aria-hidden="true" />
            Dados protegidos
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Acesso interno com menu ajustado ao perfil do usuário.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ user }: SidebarProps) {
  const navigation = menuForProfile(user.role);

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
