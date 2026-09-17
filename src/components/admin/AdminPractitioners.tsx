"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, PractitionerStatusPill } from "@/components/ui";
import type { Practitioner } from "@/lib/types";

interface Row extends Practitioner {
  current_patient?: string | null;
}

export function AdminPractitioners({ initial }: { initial: Row[] }) {
  // See AdminOngoingCalls: no prop-sync effect needed, the realtime
  // subscription below patches state directly after mount.
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-practitioners")
      .on("postgres_changes", { event: "*", schema: "public", table: "practitioners" }, (payload) => {
        setRows((prev) =>
          prev.map((r) => (r.id === (payload.new as Practitioner).id ? { ...r, ...(payload.new as Practitioner) } : r))
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function toggle(row: Row) {
    setBusyId(row.id);
    const endpoint = row.is_active ? "/api/practitioners/remove" : "/api/practitioners/reactivate";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitioner_id: row.id }),
      });
      if (res.ok) {
        const body = await res.json();
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...body.practitioner } : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-2">
      {!rows.length ? (
        <EmptyState>No practitioners yet.</EmptyState>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="p-3">Name</th>
              <th className="p-3">Status</th>
              <th className="p-3">Current Patient</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="p-3 font-semibold">{r.full_name}</td>
                <td className="p-3">
                  <PractitionerStatusPill status={r.status} />
                </td>
                <td className="p-3">{r.current_patient || "—"}</td>
                <td className="p-3 text-right">
                  <Button
                    variant={r.is_active ? "danger" : "primary"}
                    disabled={busyId === r.id}
                    onClick={() => toggle(r)}
                  >
                    {r.is_active ? "Remove" : "Reactivate"}
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
