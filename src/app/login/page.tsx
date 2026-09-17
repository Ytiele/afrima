"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, inputClass } from "@/components/ui";
import type { Role } from "@/lib/types";

function dashboardFor(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "PRACTITIONER") return "/practitioner/dashboard";
  return "/patient/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setError("Incorrect email or password.");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("user_id", data.user.id)
        .single();

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        setError("This account is not active. Contact an administrator.");
        return;
      }

      router.push(next || dashboardFor(profile.role as Role));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <Link
        href="/"
        className="block text-xs font-bold uppercase tracking-wide text-brand-cta mb-2"
      >
        Afrima Digi-Health
      </Link>
      <h1 className="text-2xl mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            className={inputClass}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full mt-2 bg-brand-cta! hover:bg-brand-cta-hover!">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-sm text-neutral-600 mt-6 text-center">
        Need care instead?{" "}
        <Link href="/" className="text-brand-cta font-semibold">
          Go to the homepage
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="relative isolate hidden lg:block">
        <Image
          src="/hero-consult.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="50vw"
          className="object-cover object-center -z-20"
        />
        <div
          className="absolute inset-0 -z-10 flex flex-col justify-between p-10"
          style={{ background: "linear-gradient(160deg, rgba(2,2,2,0.9), rgba(13,40,24,0.85))" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Afrima Digi-Health" width={40} height={40} className="h-10 w-auto" />
            <span className="font-heading text-lg text-white">Afrima Digi-Health</span>
          </Link>
          <div>
            <h2 className="text-3xl text-white max-w-sm mb-3">Run the queue, answer the call.</h2>
            <p className="text-sm text-neutral-300 max-w-sm">
              Practitioner and admin access to Afrima Digi-Health Ke — Afrimerchants Ltd&apos;s
              telehealth platform.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-bg px-4 py-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
