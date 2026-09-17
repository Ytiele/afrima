import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(200),
  referral_hospital: z.string().trim().min(1, "Enter the referring hospital").max(300),
  referral_doctor_name: z.string().trim().min(1, "Enter the referring doctor's name").max(200),
  referral_doctor_number: z.string().trim().min(1, "Enter the referring doctor's number").max(50),
  mpesa_code: z.string().trim().min(1, "Enter your M-Pesa confirmation code").max(50),
});

// Referral consultations skip the specialty picker (a hospital referral
// isn't scoped to one) and go straight to WAITING with payment_verified =
// false, so they show up to practitioners as a distinct "Referral
// Requests" list instead of the normal answerable queue. claim_consultation
// refuses these until verify_referral_and_claim checks and claims them in
// one atomic step (see supabase/migrations/0007_referrals.sql).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { full_name, referral_hospital, referral_doctor_name, referral_doctor_number, mpesa_code } = parsed.data;

  let { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!patient) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, full_name, role: "PATIENT" }, { onConflict: "user_id" });
    const { data: createdPatient, error: patientErr } = await supabase
      .from("patients")
      .insert({ user_id: user.id, full_name })
      .select("id")
      .single();
    if (profileErr || patientErr || !createdPatient) {
      return NextResponse.json({ error: "Could not set up your visit. Please try again." }, { status: 500 });
    }
    patient = createdPatient;
  }

  const { data: existing } = await supabase
    .from("consultations")
    .select("id")
    .eq("patient_id", patient.id)
    .in("status", ["WAITING", "CLAIMED", "IN_CALL"])
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ consultation: existing });
  }

  const { data: consultation, error } = await supabase
    .from("consultations")
    .insert({
      patient_id: patient.id,
      status: "WAITING",
      is_referral: true,
      payment_verified: false,
      referral_hospital,
      referral_doctor_name,
      referral_doctor_number,
      mpesa_code,
    })
    .select()
    .single();

  if (error || !consultation) {
    return NextResponse.json({ error: "Could not submit your referral" }, { status: 500 });
  }

  return NextResponse.json({ consultation });
}
