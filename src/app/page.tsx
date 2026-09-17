import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { QuickStartHome } from "@/components/QuickStartHome";

function dashboardFor(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "PRACTITIONER") return "/practitioner/dashboard";
  return "/patient/dashboard";
}

// The public homepage. A signed-in user (patient with an existing session,
// or staff) is sent straight to their dashboard; everyone else sees the
// quick-start form — name, email, reason, straight into the queue.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (profile) redirect(dashboardFor(profile.role as Role));
  }

  return <QuickStartHome />;
}
