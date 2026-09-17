"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState } from "@/components/ui";
import { format } from "date-fns";

interface OngoingCall {
  id: string;
  started_at: string;
  patients: { full_name: string } | null;
  practitioners: { full_name: string } | null;
}

function useTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

function duration(startedAt: string) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

export function AdminOngoingCalls({ initial }: { initial: OngoingCall[] }) {
  // `initial` seeds state on mount; every update after that comes from the
  // realtime subscription below re-fetching and setting state itself, so
  // there's no separate prop-sync effect needed (or wanted).
  const [calls, setCalls] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  useTicker();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-ongoing-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultations" }, async () => {
        const { data } = await supabase
          .from("consultations")
          .select("id, started_at, patients(full_name), practitioners(full_name)")
          .eq("status", "IN_CALL")
          .order("started_at", { ascending: true });
        setCalls((data as unknown as OngoingCall[]) ?? []);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function endCall(id: string) {
    if (!confirm("Are you sure you want to end this consultation?")) return;
    setBusyId(id);
    try {
      await fetch("/api/consultations/admin-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: id }),
      });
      setCalls((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-2">
      <h3 className="text-lg px-4 pt-3 pb-1">Ongoing Calls</h3>
      {!calls.length ? (
        <EmptyState>No calls in progress.</EmptyState>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="p-3">Patient</th>
              <th className="p-3">Practitioner</th>
              <th className="p-3">Started</th>
              <th className="p-3">Duration</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="p-3">{c.patients?.full_name}</td>
                <td className="p-3">{c.practitioners?.full_name}</td>
                <td className="p-3">{format(new Date(c.started_at), "HH:mm")}</td>
                <td className="p-3 font-mono">{duration(c.started_at)}</td>
                <td className="p-3 text-right">
                  <Button variant="danger" onClick={() => endCall(c.id)} disabled={busyId === c.id}>
                    End Call
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
