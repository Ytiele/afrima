"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState } from "@/components/ui";
import type { PractitionerStatus, Specialty } from "@/lib/types";
import { SPECIALTY_LABELS } from "@/lib/types";
import { formatDistanceToNowStrict } from "date-fns";

export interface WaitingRow {
  id: string;
  specialty: Specialty | null;
  reason: string | null;
  referring_facility: string | null;
  created_at: string;
  patients: { full_name: string; age: number | null; gender: string | null } | null;
}

export interface ReferralRow {
  id: string;
  referral_hospital: string | null;
  referral_doctor_name: string | null;
  referral_doctor_number: string | null;
  mpesa_code: string | null;
  created_at: string;
  patients: { full_name: string } | null;
}

export function PractitionerQueue({
  initialStatus,
  initialQueue,
  initialReferrals,
  activeConsultationId,
}: {
  initialStatus: PractitionerStatus;
  initialQueue: WaitingRow[];
  initialReferrals: ReferralRow[];
  activeConsultationId: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  // No local mirror of the queue: `initialQueue`/`initialReferrals` are
  // re-fetched server-side and handed down fresh on every router.refresh()
  // below, which is the only thing that ever changes them — a separate
  // state copy would just be a second source of truth to keep in sync for
  // no benefit.
  const queue = initialQueue;
  const referrals = initialReferrals;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("practitioner-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus() {
    setTogglingStatus(true);
    const next = status === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    const res = await fetch("/api/practitioners/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) setStatus(next);
    setTogglingStatus(false);
  }

  async function answer(consultationId: string) {
    setBusyId(consultationId);
    setError("");
    try {
      const claimRes = await fetch("/api/consultations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });
      const claimBody = await claimRes.json();
      if (!claimRes.ok) {
        setError(claimBody.error || "Could not answer this patient.");
        router.refresh();
        return;
      }
      const roomRes = await fetch("/api/daily/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });
      if (!roomRes.ok) {
        setError("Claimed, but couldn't set up the video room. Try opening the consultation.");
      }
      router.push(`/practitioner/consultation/${consultationId}`);
    } finally {
      setBusyId(null);
    }
  }

  async function verifyReferral(consultationId: string) {
    setBusyId(consultationId);
    setError("");
    try {
      const verifyRes = await fetch("/api/consultations/verify-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyBody.error || "Could not verify this referral.");
        router.refresh();
        return;
      }
      const roomRes = await fetch("/api/daily/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });
      if (!roomRes.ok) {
        setError("Verified, but couldn't set up the video room. Try opening the consultation.");
      }
      router.push(`/practitioner/consultation/${consultationId}`);
    } finally {
      setBusyId(null);
    }
  }

  if (activeConsultationId) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg mb-2">You have an active consultation</h3>
        <Button onClick={() => router.push(`/practitioner/consultation/${activeConsultationId}`)}>
          Return to consultation
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">Your status</div>
          <div className="font-heading text-2xl">{status}</div>
        </div>
        <Button variant={status === "AVAILABLE" ? "secondary" : "primary"} onClick={toggleStatus} disabled={togglingStatus}>
          {status === "AVAILABLE" ? "Go Offline" : "Go Available"}
        </Button>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!!referrals.length && (
        <Card className="p-2 border-accent-200">
          <h3 className="text-lg px-4 pt-3 pb-1">Referral Requests awaiting verification</h3>
          <ul className="divide-y divide-neutral-100">
            {referrals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-semibold">{r.patients?.full_name ?? "Patient"}</div>
                  <div className="text-sm text-neutral-600">
                    Referred by {r.referral_doctor_name ?? "—"} · {r.referral_hospital ?? "—"} ·{" "}
                    {r.referral_doctor_number ?? "—"}
                  </div>
                  <div className="text-sm text-neutral-600">
                    M-Pesa code: <span className="font-mono font-semibold">{r.mpesa_code}</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    Waiting {formatDistanceToNowStrict(new Date(r.created_at))}
                  </div>
                </div>
                <Button onClick={() => verifyReferral(r.id)} disabled={busyId !== null || status !== "AVAILABLE"}>
                  {busyId === r.id ? "Verifying…" : "Verify & Accept"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-2">
        <h3 className="text-lg px-4 pt-3 pb-1">Waiting Patients</h3>
        {!queue.length ? (
          <EmptyState>Nobody is waiting right now.</EmptyState>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {queue.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-semibold">
                    {c.patients?.full_name ?? "Patient"}
                    {c.specialty && (
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-accent-700 bg-accent-50 rounded-full px-2 py-0.5">
                        {SPECIALTY_LABELS[c.specialty]}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {[c.patients?.age && `${c.patients.age}y`, c.patients?.gender].filter(Boolean).join(" · ")}
                    {c.reason ? ` — ${c.reason}` : ""}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Waiting {formatDistanceToNowStrict(new Date(c.created_at))}
                  </div>
                </div>
                <Button
                  onClick={() => answer(c.id)}
                  disabled={busyId !== null || status !== "AVAILABLE"}
                >
                  {busyId === c.id ? "Answering…" : "Answer"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
