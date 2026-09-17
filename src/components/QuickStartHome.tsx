"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { MPESA_ACCOUNT, MPESA_PAYBILL, SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/types";
import {
  Ambulance,
  Apple,
  HeartHandshake,
  Home as HomeIcon,
  Microscope,
  Ribbon,
  ShieldCheck,
  Smartphone,
  Video,
  type LucideIcon,
} from "lucide-react";

type Mode = "queue" | "referral";

const SERVICES: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Clinical Nutrition",
    description:
      "Work one-on-one with licensed nutritionists on personalized meal plans, weight management, and nutrition therapy for chronic conditions — all through a secure video consultation.",
    icon: Apple,
  },
  {
    title: "Psychological Support",
    description:
      "Connect with experienced mental health professionals for personalized therapy sessions, effective stress management strategies, and compassionate emotional support — all accessible online, from the comfort and privacy of your home.",
    icon: HeartHandshake,
  },
  {
    title: "Chronic Disease Follow up & Home Based Care",
    description:
      "We are a reliable partner in taking care of patients discharged from hospitals to recuperate at home, especially for patients ailing from mobility-limiting ailments such as stroke, head & spinal injuries, dementia & Alzheimer's disease, cancers, and post-surgery home care, among others. Our team of qualified home-based care nurses, community health nurses, psychologists, nutritionists, and occupational & physiotherapists commit to a patient's follow-up from the time they are discharged from hospital — arranging transport home, ensuring proper set-up at home, and delivering dignified home-based clinical care, both physically and virtually, at affordable costs.",
    icon: HomeIcon,
  },
  {
    title: "Ambulance Services",
    description:
      "We offer emergency evacuation services through our dedicated team of ambulance attendants and partners within Murang'a County at very pocket-friendly charges, including linkage with partner institutions offering ICU & HDU services at affordable charges.",
    icon: Ambulance,
  },
  {
    title: "Cancer Care & Follow up",
    description:
      "We pride ourselves as reliable partners ensuring cancer patients get quick linkage with specialists for specialized treatments through our MOUs with reputable institutions across the country, so patients can quickly start prescribed chemotherapy, radiotherapy, and surgeries at well-equipped partner facilities.",
    icon: Ribbon,
  },
  {
    title: "Imaging & Laboratory Services Facilitation",
    description:
      "Through our partners, we ensure patients undergo prescribed specialized diagnostic laboratory and imaging tests even when financially constrained — so treatment isn't delayed, improving outcomes for many patients seeking our services.",
    icon: Microscope,
  },
];

const TRUST_POINTS: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Secure video consultations",
    description: "Every call runs over an encrypted, private connection between you and your practitioner.",
    icon: Video,
  },
  {
    title: "Licensed professionals",
    description: "Every nutritionist, psychologist, and practitioner on Afrima Digi-Health is vetted and licensed.",
    icon: ShieldCheck,
  },
  {
    title: "No app to install",
    description: "Join from any phone or computer browser — no downloads, no account to set up.",
    icon: Smartphone,
  },
];

export function QuickStartHome() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <nav className="sticky top-0 z-10 bg-brand-black">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Afrima Digi-Health" width={40} height={40} className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline font-heading text-lg text-white">Afrima Digi-Health</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 text-sm font-semibold">
            <a href="#who-we-are" className="hidden md:inline text-neutral-300 hover:text-white">
              Who We Are
            </a>
            <a href="#services" className="hidden md:inline text-neutral-300 hover:text-white">
              Our Services
            </a>
            <Link href="/login" className="text-neutral-300 hover:text-white">
              <span className="hidden sm:inline">Practitioner or admin? </span>Log in
            </Link>
            <a
              href="#get-started"
              className="rounded-full px-3 sm:px-4 py-2 text-white bg-brand-cta hover:bg-brand-cta-hover transition-colors whitespace-nowrap"
            >
              Join the Queue
            </a>
          </div>
        </div>
      </nav>

      <section className="relative isolate px-4 py-16 sm:py-24 overflow-hidden">
        <Image
          src="/hero-consult.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center -z-20"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(2,2,2,0.92), rgba(13,40,24,0.88))",
          }}
        />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h6 className="text-xs font-bold uppercase tracking-wide mb-3 text-[#5fbf7f]">
              Care, the moment you need it
            </h6>
            <h1 className="text-4xl sm:text-5xl mb-4 max-w-md text-white">
              Someone is always available.
            </h1>
            <p className="text-base max-w-sm text-neutral-300">
              No booking, no account, no appointment slots. Tell us your name and who you&apos;d
              like to see, and you&apos;ll be connected by video call the moment someone&apos;s free.
            </p>
          </div>

          <div id="get-started">
            <GetStartedCard />
          </div>
        </div>
      </section>

      <section id="who-we-are" className="px-4 py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden order-2 md:order-1">
            <Image
              src="/video-call-woman.jpg"
              alt="A practitioner speaking with a patient over video call"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="order-1 md:order-2">
            <h6 className="text-xs font-bold uppercase tracking-wide text-brand-cta mb-3">Who We Are</h6>
            <h2 className="text-3xl sm:text-4xl mb-6">Afrimerchants Ltd</h2>
            <p className="text-base text-neutral-700">
              Afrima Digi-Health Ke is a trusted Kenyan digital health company that connects patients
              with licensed nutritionists and psychologists through secure virtual consultations. As a
              proud subsidiary of Afrimerchants Limited, we&apos;re on a mission to make affordable,
              expert care accessible to everyone, everywhere in Kenya. With a growing network of 150+
              partner health facilities and 400+ community health workers (CHWs) across the country, we
              remove the barriers to professional support — providing safe, confidential, and
              convenient healthcare you can rely on, right from your phone or computer.
            </p>
            <div className="flex flex-wrap gap-10 mt-8">
              <div>
                <div className="font-heading text-4xl text-brand-cta">150+</div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Partner health facilities
                </div>
              </div>
              <div>
                <div className="font-heading text-4xl text-brand-cta">400+</div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Community health workers
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h6 className="text-xs font-bold uppercase tracking-wide text-brand-cta mb-3">
              Virtual care, real connection
            </h6>
            <h2 className="text-3xl sm:text-4xl mb-6">Trusted telehealth, wherever you are</h2>
            <div className="flex flex-col gap-6">
              {TRUST_POINTS.map((t) => (
                <div key={t.title} className="flex gap-4">
                  <div className="shrink-0 h-11 w-11 rounded-full bg-brand-cta/10 flex items-center justify-center">
                    <t.icon className="h-5 w-5 text-brand-cta" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-1">{t.title}</h3>
                    <p className="text-sm text-neutral-600">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
            <Image
              src="/video-call-man.jpg"
              alt="A practitioner joining a secure video consultation from their desk"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="services" className="px-4 py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h6 className="text-xs font-bold uppercase tracking-wide text-brand-cta mb-3">
              What we offer
            </h6>
            <h2 className="text-3xl sm:text-4xl">Our Services</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <Card key={s.title} className="p-6">
                <div className="h-11 w-11 rounded-full mb-4 bg-brand-cta/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-brand-cta" />
                </div>
                <h3 className="text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-600">{s.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-4 py-10 bg-brand-black">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Afrima Digi-Health" width={32} height={32} className="h-8 w-auto" />
            <div>
              <div className="font-heading text-white text-sm">Afrima Digi-Health Ke</div>
              <div className="text-xs text-neutral-400">Connect. Consult. Revitalize.</div>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} Afrimerchants Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

function GetStartedCard() {
  const [mode, setMode] = useState<Mode>("queue");

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex gap-2 mb-5 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("queue")}
          className={`px-3 py-1.5 rounded-full ${
            mode === "queue" ? "bg-brand-cta text-white" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          Join the queue
        </button>
        <button
          type="button"
          onClick={() => setMode("referral")}
          className={`px-3 py-1.5 rounded-full ${
            mode === "referral" ? "bg-brand-cta text-white" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          Referral consultation
        </button>
      </div>
      {mode === "queue" ? <QueueForm /> : <ReferralForm />}
    </Card>
  );
}

function QueueForm() {
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
                  ? "border-brand-cta bg-neutral-50 text-brand-cta"
                  : "border-neutral-200 text-neutral-700 hover:border-brand-cta"
              }`}
            >
              {SPECIALTY_LABELS[s]}
            </button>
          ))}
        </div>
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full bg-brand-cta! hover:bg-brand-cta-hover!">
        {loading ? "Joining…" : "Join the queue"}
      </Button>
    </form>
  );
}

type ReferralStep = "details" | "payment";

function ReferralForm() {
  const router = useRouter();
  const [step, setStep] = useState<ReferralStep>("details");
  const [fullName, setFullName] = useState("");
  const [hospital, setHospital] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorNumber, setDoctorNumber] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function continueToPayment(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !hospital.trim() || !doctorName.trim() || !doctorNumber.trim()) {
      setError("Please fill in all the details.");
      return;
    }
    setStep("payment");
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!mpesaCode.trim()) {
      setError("Enter the M-Pesa code from your payment confirmation.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInAnonymously();
      if (signInErr) {
        setError("Could not start your session. Please try again.");
        return;
      }

      const res = await fetch("/api/consultations/start-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          referral_hospital: hospital,
          referral_doctor_name: doctorName,
          referral_doctor_number: doctorNumber,
          mpesa_code: mpesaCode,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Could not submit your referral.");
        return;
      }
      router.push(`/patient/consultation/${body.consultation.id}`);
    } finally {
      setLoading(false);
    }
  }

  if (step === "payment") {
    return (
      <form onSubmit={submitPayment} className="flex flex-col gap-4">
        <div>
          <div className="card-kicker">Pay for your consultation</div>
          <h3 className="text-xl mt-1">Pay via M-Pesa</h3>
        </div>
        <div className="rounded-lg bg-neutral-50 border border-brand-green-900/20 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Paybill Number</span>
            <span className="font-mono font-bold">{MPESA_PAYBILL}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Account Number</span>
            <span className="font-mono font-bold">{MPESA_ACCOUNT}</span>
          </div>
        </div>
        <p className="text-sm text-neutral-600">
          Once you&apos;ve paid, enter the M-Pesa confirmation code below and submit — a
          practitioner will verify it and accept your call.
        </p>
        <Field label="M-Pesa confirmation code">
          <input
            className={inputClass}
            required
            autoFocus
            value={mpesaCode}
            onChange={(e) => setMpesaCode(e.target.value)}
            placeholder="e.g. QFG7H8J9K0"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-brand-cta! hover:bg-brand-cta-hover!">
          {loading ? "Submitting…" : "Submit and join the queue"}
        </Button>
        <button
          type="button"
          className="text-sm text-neutral-600 self-center"
          onClick={() => setStep("details")}
        >
          Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={continueToPayment} className="flex flex-col gap-4">
      <div>
        <div className="card-kicker">Referred by a hospital?</div>
        <h3 className="text-xl mt-1">Referral consultation</h3>
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
      <Field label="Referring hospital">
        <input
          className={inputClass}
          required
          value={hospital}
          onChange={(e) => setHospital(e.target.value)}
          placeholder="Kenyatta National Hospital"
        />
      </Field>
      <Field label="Referring doctor's name">
        <input
          className={inputClass}
          required
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Dr. Achieng"
        />
      </Field>
      <Field label="Referring doctor's number">
        <input
          className={inputClass}
          required
          value={doctorNumber}
          onChange={(e) => setDoctorNumber(e.target.value)}
          placeholder="07XXXXXXXX"
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full bg-brand-cta! hover:bg-brand-cta-hover!">
        Continue to payment
      </Button>
    </form>
  );
}
