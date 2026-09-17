"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { DailyCallFrame } from "@/components/DailyCallFrame";
import { PrescriptionForm } from "./PrescriptionForm";
import type { Consultation } from "@/lib/types";

interface PatientInfo {
  full_name: string;
  age: number | null;
  gender: string | null;
}

export function PractitionerConsultationRoom({
  initial,
  patient,
}: {
  initial: Consultation;
  patient: PatientInfo | null;
}) {
  const router = useRouter();
  const [consultation, setConsultation] = useState(initial);
  const [dailyAuth, setDailyAuth] = useState<{ roomUrl: string; token: string } | null>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [error, setError] = useState("");
  const requestedTokenFor = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
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

  async function endConsultation() {
    await fetch("/api/consultations/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: consultation.id }),
    });
    router.push("/practitioner/dashboard");
  }

  if (consultation.status === "COMPLETED" || consultation.status === "CANCELLED") {
    router.push("/practitioner/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wide text-neutral-500">Patient</div>
        <div className="font-heading text-xl">{patient?.full_name ?? "Patient"}</div>
        <div className="text-sm text-neutral-600">
          {[patient?.age && `${patient.age}y`, patient?.gender, consultation.reason]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {consultation.is_referral && (
          <div className="text-sm text-neutral-600 mt-1">
            Referred by {consultation.referral_doctor_name ?? "—"} ({consultation.referral_doctor_number ?? "—"}) at{" "}
            {consultation.referral_hospital ?? "—"}
          </div>
        )}
      </Card>

      {dailyAuth ? (
        <DailyCallFrame roomUrl={dailyAuth.roomUrl} token={dailyAuth.token} onLeft={endConsultation} />
      ) : (
        <Card className="p-8 text-center text-neutral-600">
          Setting up the video room…
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={() => setShowPrescription((v) => !v)}>
          {showPrescription ? "Hide Prescription" : "Create Prescription"}
        </Button>
        <Button variant="danger" onClick={endConsultation}>
          End Consultation
        </Button>
      </div>

      {showPrescription && (
        <PrescriptionForm
          consultationId={consultation.id}
          defaultDiagnosis={consultation.diagnosis ?? ""}
          onCreated={() => setShowPrescription(false)}
        />
      )}
    </div>
  );
}
