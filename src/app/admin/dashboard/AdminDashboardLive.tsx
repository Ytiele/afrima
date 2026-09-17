"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui";

export function AdminDashboardLive({
  initial,
}: {
  initial: { activePractitioners: number; waiting: number; ongoing: number; completedToday: number };
}) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    const supabase = createClient();

    async function recompute() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [{ count: activePractitioners }, { count: waiting }, { count: ongoing }, { count: completedToday }] =
        await Promise.all([
          supabase.from("practitioners").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "WAITING"),
          supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "IN_CALL"),
          supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("status", "COMPLETED")
            .gte("ended_at", startOfDay.toISOString()),
        ]);

      setStats({
        activePractitioners: activePractitioners ?? 0,
        waiting: waiting ?? 0,
        ongoing: ongoing ?? 0,
        completedToday: completedToday ?? 0,
      });
    }

    const channel = supabase
      .channel("admin-dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultations" }, recompute)
      .on("postgres_changes", { event: "*", schema: "public", table: "practitioners" }, recompute)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Active Practitioners" value={stats.activePractitioners} />
      <StatCard label="Patients Waiting" value={stats.waiting} />
      <StatCard label="Ongoing Calls" value={stats.ongoing} />
      <StatCard label="Completed Today" value={stats.completedToday} />
    </div>
  );
}
