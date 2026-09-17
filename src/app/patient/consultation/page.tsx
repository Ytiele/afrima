"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, PageHeading, textareaClass } from "@/components/ui";
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/types";

// Reached from the patient dashboard's "Start a new consultation" link —
// the patient already has a session and an on-file name from an earlier
// visit this same session, so this only asks what's actually new: who
// they want to see this time, and why.
export default function StartConsultationPage() {
  const router = useRouter();
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!specialty) {
      setError("Choose who you'd like to see.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/consultations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Could not start your consultation.");
        return;
      }
      router.push(`/patient/consultation/${body.consultation.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeading eyebrow="One quick step" title="Who would you like to see?" />
      <Card className="p-6 max-w-xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Who would you like to see?">
            <div className="grid grid-cols-1 gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecialty(s)}
                  className={`text-left px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    specialty === s
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-neutral-200 text-neutral-700 hover:border-accent-300"
                  }`}
                >
                  {SPECIALTY_LABELS[s]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Reason for consultation">
            <textarea
              className={textareaClass}
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What would you like to discuss today?"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2 self-start">
            {loading ? "Joining queue…" : "Join the queue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
