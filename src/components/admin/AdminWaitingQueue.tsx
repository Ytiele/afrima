"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState } from "@/components/ui";
import { SPECIALTY_LABELS, type Specialty } from "@/lib/types";
import { formatDistanceToNowStrict } from "date-fns";

interface WaitingEntry {
  id: string;
  specialty: Specialty | null;
  reason: string | null;
  created_at: string;
  patients: { full_name: string } | null;
}

export function AdminWaitingQueue({ initial }: { initial: WaitingEntry[] }) {
  // See AdminOngoingCalls: no prop-sync effect needed, the realtime
  // subscription below is the sole source of updates after mount.
  const [queue, setQueue] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-waiting-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultations" }, async () => {
        const { data } = await supabase
          .from("consultations")
          .select("id, specialty, reason, created_at, patients(full_name)")
          .eq("status", "WAITING")
          .order("created_at", { ascending: true });
        setQueue((data as unknown as WaitingEntry[]) ?? []);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function remove(id: string) {
    if (!confirm("Remove this patient from the waiting queue?")) return;
    setBusyId(id);
    try {
      await fetch("/api/consultations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: id }),
      });
      setQueue((prev) => prev.filter((q) => q.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-2">
      <h3 className="text-lg px-4 pt-3 pb-1">Waiting Queue</h3>
      {!queue.length ? (
        <EmptyState>Nobody is waiting.</EmptyState>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="p-3">#</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Specialty</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Waiting</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {queue.map((q, i) => (
              <tr key={q.id} className="border-t border-neutral-100">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{q.patients?.full_name}</td>
                <td className="p-3">{q.specialty ? SPECIALTY_LABELS[q.specialty] : "—"}</td>
                <td className="p-3 max-w-xs truncate">{q.reason}</td>
                <td className="p-3">{formatDistanceToNowStrict(new Date(q.created_at))}</td>
                <td className="p-3 text-right">
                  <Button variant="secondary" onClick={() => remove(q.id)} disabled={busyId === q.id}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
