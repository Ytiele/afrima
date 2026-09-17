import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui";
import { AdminOngoingCalls } from "@/components/admin/AdminOngoingCalls";

export default async function AdminCallsPage() {
  const supabase = await createClient();
  const { data: ongoingCalls } = await supabase
    .from("consultations")
    .select("id, started_at, patients(full_name), practitioners(full_name)")
    .eq("status", "IN_CALL")
    .order("started_at", { ascending: true });

  return (
    <div>
      <PageHeading title="Ongoing Calls" />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AdminOngoingCalls initial={(ongoingCalls as any) ?? []} />
    </div>
  );
}
