import { redirect } from "next/navigation";

export default async function AppLayout() {
  redirect("/admin/dashboard");
}
