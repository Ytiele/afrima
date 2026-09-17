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
  // Only ever used to refresh the on-file name for a returning quick-start
  // patient who typed it slightly differently this time — never trusted
  // for anything security-relevant.
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

  const { data: patient } = await supabase
    .from("patients")
    .select("id, age, gender, full_name")
    .eq("user_id", user.id)
    .single();
  if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

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

  const { age, gender, bmi, waz, reason, referring_facility, full_name } = parsed.data;

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
