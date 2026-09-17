import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  age: z.number().int().min(0).max(130).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  bmi: z.number().positive().nullable().optional(),
  waz: z.number().nullable().optional(),
  reason: z.string().trim().min(1, "Tell us why you're here").max(2000),
  referring_facility: z.string().trim().max(300).nullable().optional(),
  specialty: z.enum(["GENERAL_PRACTITIONER", "NUTRITIONIST", "PSYCHOLOGIST"]),
  // Required only the first time we see this anonymous session (there's
  // no account to fall back on); optional afterwards, e.g. starting a
  // second consultation in the same visit reuses the on-file name.
  full_name: z.string().trim().min(1).max(200).optional(),
});

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

  let { data: patient } = await supabase
    .from("patients")
    .select("id, age, gender, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!patient) {
    if (!parsed.data.full_name) {
      return NextResponse.json({ error: "Tell us your name" }, { status: 400 });
    }
    // First time we've seen this anonymous session — the normal path for
    // every quick-start visit, not a fallback. RLS's patients_insert_self
    // already permits a user to insert their own row, and
    // profiles_insert_self likewise, so this runs on the caller's own
    // session rather than the admin client.
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, full_name: parsed.data.full_name, role: "PATIENT" }, { onConflict: "user_id" });
    const { data: createdPatient, error: patientErr } = await supabase
      .from("patients")
      .insert({ user_id: user.id, full_name: parsed.data.full_name })
      .select("id, age, gender, full_name")
      .single();
    if (profileErr || patientErr || !createdPatient) {
      return NextResponse.json({ error: "Could not set up your visit. Please try again." }, { status: 500 });
    }
    patient = createdPatient;
  }

  // Don't let a patient stack up a second WAITING/active consultation.
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

  const { age, gender, bmi, waz, reason, referring_facility, full_name, specialty } = parsed.data;

  // Keep the patient's own on-file details reasonably current.
  if (age || gender || (full_name && full_name !== patient.full_name)) {
    await supabase
      .from("patients")
      .update({
        age: age ?? patient.age,
        gender: gender ?? patient.gender,
        full_name: full_name || patient.full_name,
      })
      .eq("id", patient.id);
  }

  const { data: consultation, error } = await supabase
    .from("consultations")
    .insert({
      patient_id: patient.id,
      status: "WAITING",
      specialty,
      reason,
      referring_facility: referring_facility || null,
      bmi: bmi ?? null,
      waz: waz ?? null,
    })
    .select()
    .single();

  if (error || !consultation) {
    return NextResponse.json({ error: "Could not create consultation" }, { status: 500 });
  }

  return NextResponse.json({ consultation });
}
