"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { DailyCallFrame } from "@/components/DailyCallFrame";
import type { Consultation } from "@/lib/types";

export function PatientConsultationRoom({
  initial,
  practitionerName,
}: {
  initial: Consultation;
  practitionerName: string | null;
}) {
  const router = useRouter();
  const [consultation, setConsultation] = useState(initial);
  const [position, setPosition] = useState<number | null>(null);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [dailyAuth, setDailyAuth] = useState<{ roomUrl: string; token: string } | null>(null);
  const [error, setError] = useState("");
  const requestedTokenFor = useRef<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (consultation.status !== "WAITING") return;
    let cancelled = false;
    (async () => {
      const [{ count: aheadCount }, { count: available }] = await Promise.all([
        supabase
          .from("consultations")
          .select("id", { count: "exact", head: true })
          .eq("status", "WAITING")
          .lt("created_at", initial.created_at),
        supabase.from("practitioners").select("id", { count: "exact", head: true }).eq("status", "AVAILABLE"),
      ]);
      if (cancelled) return;
      setPosition((aheadCount ?? 0) + 1);
      setAvailableCount(available ?? 0);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.status, initial.created_at]);

  useEffect(() => {
    const channel = supabase
      .channel(`consultation-${consultation.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "consultations", filter: `id=eq.${consultation.id}` },
        (payload) => setConsultation(payload.new as Consultation)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.id]);

  useEffect(() => {
    if (consultation.status !== "IN_CALL" || requestedTokenFor.current === consultation.id) return;
    requestedTokenFor.current = consultation.id;
    fetch("/api/daily/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: consultation.id }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (body.error) return setError(body.error);
        setDailyAuth({ roomUrl: body.room_url, token: body.token });
      });
  }, [consultation.status, consultation.id]);

  useEffect(() => {
    if (consultation.status === "COMPLETED" || consultation.status === "CANCELLED") {
      router.push("/patient/dashboard");
    }
  }, [consultation.status, router]);

  async function leaveQueue() {
    await fetch("/api/consultations/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: consultation.id }),
    });
    router.push("/patient/dashboard");
  }

  async function endCall() {
    await fetch("/api/consultations/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: consultation.id }),
    });
    router.push("/patient/dashboard");
  }

  if (consultation.status === "WAITING") {
    return (
      <Card className="p-8 max-w-lg mx-auto text-center">
        <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700 mb-2">
          You&apos;re in the queue
        </h6>
        <h2 className="text-2xl mb-4">A nutritionist will answer when available.</h2>
        <div className="flex justify-center gap-8 mb-6">
          <div>
            <div className="font-heading text-4xl">{position ?? "…"}</div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Position</div>
          </div>
          <div>
            <div className="font-heading text-4xl">{availableCount ?? "…"}</div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Available now</div>
          </div>
        </div>
        <Button variant="secondary" onClick={leaveQueue}>
          Leave Queue
        </Button>
      </Card>
    );
  }

  if (consultation.status === "CLAIMED" || (consultation.status === "IN_CALL" && !dailyAuth)) {
    return (
      <Card className="p-8 max-w-lg mx-auto text-center">
        <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700 mb-2">Almost there</h6>
        <h2 className="text-2xl">
          {practitionerName ? `${practitionerName} is ready for you.` : "A practitioner is ready for you."}
        </h2>
        <p className="text-sm text-neutral-600 mt-2">Setting up your consultation room…</p>
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
      </Card>
    );
  }

  if (consultation.status === "IN_CALL" && dailyAuth) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700">Consultation with</h6>
          <h2 className="text-xl">{practitionerName ?? "your practitioner"}</h2>
        </div>
        <DailyCallFrame roomUrl={dailyAuth.roomUrl} token={dailyAuth.token} onLeft={endCall} />
        <div className="flex justify-center">
          <Button variant="danger" onClick={endCall}>
            End Call
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
