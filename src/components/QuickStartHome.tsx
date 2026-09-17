"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/types";

export function QuickStartHome() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!specialty) {
      setError("Choose who you'd like to see.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      // No email, no password: every visit is a fresh, anonymous Supabase
      // Auth session. There's no account to come back to later -- if
      // someone wants their history, that's a real login (staff-only for
      // now), not something a name+specialty form should grant.
      const { error: signInErr } = await supabase.auth.signInAnonymously();
      if (signInErr) {
        setError("Could not start your session. Please try again.");
        return;
      }

      const res = await fetch("/api/consultations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, specialty }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Could not join the queue.");
        return;
      }
      router.push(`/patient/consultation/${body.consultation.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="wrap max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 flex items-center justify-between">
        <span className="font-heading text-xl text-accent-700">Afrima Digi-Health</span>
        <Link href="/login" className="text-sm font-semibold text-neutral-600 hover:text-text">
          Practitioner or admin? Log in
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700 mb-3">
              Care, the moment you need it
            </h6>
            <h1 className="text-4xl sm:text-5xl mb-4 max-w-md">Someone is always available.</h1>
            <p className="text-base max-w-sm text-neutral-700">
              No booking, no account, no appointment slots. Tell us your name and who you&apos;d
              like to see, and you&apos;ll be connected by video call the moment someone&apos;s free.
            </p>
          </div>

          <Card className="p-6 sm:p-8">
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <div className="card-kicker">Get started</div>
                <h3 className="text-xl mt-1">Join the queue</h3>
              </div>
              <Field label="Full name">
                <input
                  className={inputClass}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Wanjiru"
                />
              </Field>
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
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Joining…" : "Join the queue"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
