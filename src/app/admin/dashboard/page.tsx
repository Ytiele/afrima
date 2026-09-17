import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui";
import { AdminOngoingCalls } from "@/components/admin/AdminOngoingCalls";
import { AdminWaitingQueue } from "@/components/admin/AdminWaitingQueue";
import { AdminDashboardLive } from "./AdminDashboardLive";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const results = await Promise.all([
    supabase.from("practitioners").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "WAITING"),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "IN_CALL"),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("status", "COMPLETED")
      .gte("ended_at", startOfDay.toISOString()),
    supabase
      .from("consultations")
      .select("id, started_at, patients(full_name), practitioners(full_name)")
      .eq("status", "IN_CALL")
      .order("started_at", { ascending: true }),
    supabase
      .from("consultations")
      .select("id, reason, created_at, patients(full_name)")
      .eq("status", "WAITING")
      .order("created_at", { ascending: true }),
  ]);
  results.forEach((r) => {
    if (r.error) console.error("admin dashboard query failed:", r.error.message);
  });
  const [
    { count: activePractitioners },
    { count: waiting },
    { count: ongoing },
    { count: completedToday },
    { data: ongoingCalls },
    { data: waitingQueue },
  ] = results;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Dashboard" />
      <AdminDashboardLive
        initial={{
          activePractitioners: activePractitioners ?? 0,
          waiting: waiting ?? 0,
          ongoing: ongoing ?? 0,
          completedToday: completedToday ?? 0,
        }}
      />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AdminOngoingCalls initial={(ongoingCalls as any) ?? []} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AdminWaitingQueue initial={(waitingQueue as any) ?? []} />
    </div>
  );
}
