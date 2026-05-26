import { redirect } from "next/navigation";

import { MobileNav, Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="lg:grid lg:grid-cols-[18rem_1fr]">
        <Sidebar user={user} />
        <div className="min-w-0">
          <Topbar user={user} />
          <MobileNav user={user} />
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
