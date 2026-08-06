"use client";

import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="sticky top-20 z-20 border-b border-zinc-200 bg-white px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-black text-zinc-950 shadow-sm"
          aria-expanded={open}
        >
          <Menu className="size-4" aria-hidden="true" />
          Abrir menu
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(22rem,86vw)] flex-col bg-jr-black text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-4">
              <div>
                <BrandLogo className="w-20" priority />
                <p className="mt-3 text-xs font-black uppercase text-white">
                  Associação Paradesportiva JR-SP
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-md border border-zinc-700 text-white"
                aria-label="Fechar menu"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-jr-red hover:text-white"
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
