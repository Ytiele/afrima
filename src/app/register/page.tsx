"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, phone, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Could not create your account.");
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Account created — please log in.");
        router.push("/login");
        return;
      }
      router.push("/patient/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <Link
          href="/"
          className="block text-xs font-bold uppercase tracking-wide text-accent-700 mb-2"
        >
          Afrima Digi-Health
        </Link>
        <h1 className="text-2xl mb-6">Create your patient account</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          <Field label="Phone (optional)">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xx xxx xxx"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-neutral-600 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-700 font-semibold">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
