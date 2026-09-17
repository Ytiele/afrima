"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";

type Step = "form" | "verify" | "working";

export function QuickStartHome() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function afterSignedIn(nameForRecord?: string) {
    const res = await fetch("/api/consultations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, full_name: nameForRecord }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Could not join the queue.");
      setStep("form");
      return;
    }
    router.push(`/patient/consultation/${body.consultation.id}`);
  }

  async function submitDetails(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/patients/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Something went wrong.");
        return;
      }

      const supabase = createClient();

      if (body.status === "new") {
        setStep("working");
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });
        if (signInErr) {
          setError("Could not sign you in. Please try again.");
          setStep("form");
          return;
        }
        await afterSignedIn(fullName);
        return;
      }

      // Returning email: don't sign anyone in yet -- send a one-time code
      // so only the actual owner of that inbox can reach their record.
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        setError("Could not send a code to that email. Please try again.");
        return;
      }
      setStep("verify");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (verifyErr) {
        setError("That code didn't work — check it and try again.");
        return;
      }
      setStep("working");
      await afterSignedIn(fullName);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="wrap max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-heading text-xl text-accent-700">
          Afrima Digi-Health
        </Link>
        <Link href="/login" className="text-sm font-semibold text-neutral-600 hover:text-text">
          Practitioner or admin? Log in
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700 mb-3">
              Nutrition consultations, the moment you need them
            </h6>
            <h1 className="text-4xl sm:text-5xl mb-4 max-w-md">Someone is always available.</h1>
            <p className="text-base max-w-sm text-neutral-700">
              No booking, no appointment slots. Tell us who you are and what&apos;s on your mind, and
              you&apos;ll be connected to the next available nutritionist by video call.
            </p>
          </div>

          <Card className="p-6 sm:p-8">
            {step === "verify" ? (
              <form onSubmit={submitCode} className="flex flex-col gap-4">
                <div>
                  <div className="card-kicker">Check your email</div>
                  <h3 className="text-xl mt-1">Enter the code we sent to {email}</h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    We already have a record under this email, so this just confirms it&apos;s really you.
                  </p>
                </div>
                <Field label="6-digit code">
                  <input
                    className={inputClass}
                    required
                    autoFocus
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                  />
                </Field>
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Checking…" : "Confirm and join the queue"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-neutral-600 self-center"
                  onClick={() => setStep("form")}
                >
                  Use a different email
                </button>
              </form>
            ) : step === "working" ? (
              <div className="text-center py-10 text-neutral-600">Setting things up…</div>
            ) : (
              <form onSubmit={submitDetails} className="flex flex-col gap-4">
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
                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="What would you like help with?">
                  <textarea
                    className={textareaClass}
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="A quick line is enough — the practitioner will ask more on the call."
                  />
                </Field>
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Joining…" : "Join the queue"}
                </Button>
                <p className="text-xs text-neutral-500 text-center">
                  First time here, you&apos;re in instantly. Used this email before? We&apos;ll email you a
                  quick code first, so nobody else can see your history.
                </p>
              </form>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
