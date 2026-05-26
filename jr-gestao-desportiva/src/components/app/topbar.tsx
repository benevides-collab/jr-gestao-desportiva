import { LogOut, Shield } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { BrandLogo } from "@/components/app/brand-logo";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth";
import { profileLabels } from "@/lib/roles";

type TopbarProps = {
  user: SessionUser;
};

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-14 lg:w-16" />
          <div className="hidden sm:block">
            <p className="text-sm font-black uppercase tracking-wide text-zinc-950">
              Associação Paradesportiva JR-SP
            </p>
            <p className="text-xs font-semibold text-zinc-500">
              Painel administrativo interno
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-zinc-950">{user.name}</p>
            <p className="flex items-center justify-end gap-1 text-xs font-semibold text-zinc-500">
              <Shield className="size-3" aria-hidden="true" />
              {profileLabels[user.role]}
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
