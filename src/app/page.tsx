import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

function dashboardFor(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "PRACTITIONER") return "/practitioner/dashboard";
  return "/patient/dashboard";
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  redirect(profile ? dashboardFor(profile.role as Role) : "/login");
}
