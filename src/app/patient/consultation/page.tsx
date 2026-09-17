"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, PageHeading, inputClass, textareaClass } from "@/components/ui";

export default function StartConsultationPage() {
  const router = useRouter();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bmi, setBmi] = useState("");
  const [waz, setWaz] = useState("");
  const [reason, setReason] = useState("");
  const [facility, setFacility] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/consultations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: age ? Number(age) : null,
          gender: gender || null,
          bmi: bmi ? Number(bmi) : null,
          waz: waz ? Number(waz) : null,
          reason,
          referring_facility: facility || null,
        }),
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
      <PageHeading eyebrow="One quick step" title="Tell us why you're here" />
      <Card className="p-6 max-w-xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age">
              <input
                type="number"
                min={0}
                max={130}
                className={inputClass}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <select
                className={inputClass}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="BMI (optional)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={bmi}
                onChange={(e) => setBmi(e.target.value)}
              />
            </Field>
            <Field label="WAZ (optional)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={waz}
                onChange={(e) => setWaz(e.target.value)}
              />
            </Field>
          </div>
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
          <Field label="Referring facility (optional)">
            <input
              className={inputClass}
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
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
