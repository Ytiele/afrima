import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  medication_name: z.string().trim().min(1),
  dosage: z.string().trim().optional(),
  frequency: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
});

const schema = z.object({
  consultation_id: z.string().uuid(),
  diagnosis: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(itemSchema).min(1, "Add at least one prescription item"),
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
  const { consultation_id, diagnosis, notes, items } = parsed.data;

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!practitioner) return NextResponse.json({ error: "Not a practitioner" }, { status: 403 });

  // RLS on consultations already limits this SELECT to a consultation
  // actually assigned to this practitioner (or admin), so this doubles as
  // the authorization check.
  const { data: consultation } = await supabase
    .from("consultations")
    .select("id, patient_id, practitioner_id, diagnosis")
    .eq("id", consultation_id)
    .single();
  if (!consultation || consultation.practitioner_id !== practitioner.id) {
    return NextResponse.json({ error: "Not your consultation" }, { status: 403 });
  }

  const { data: prescription, error: rxError } = await supabase
    .from("prescriptions")
    .insert({
      consultation_id,
      patient_id: consultation.patient_id,
      practitioner_id: practitioner.id,
      diagnosis: diagnosis || consultation.diagnosis || null,
      notes: notes || null,
    })
    .select()
    .single();
  if (rxError || !prescription) {
    return NextResponse.json({ error: "Could not create prescription" }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("prescription_items").insert(
    items.map((item) => ({ ...item, prescription_id: prescription.id }))
  );
  if (itemsError) {
    await supabase.from("prescriptions").delete().eq("id", prescription.id);
    return NextResponse.json({ error: "Could not save prescription items" }, { status: 500 });
  }

  await supabase.rpc("log_audit_event", {
    p_action: "PRESCRIPTION_CREATED",
    p_target_type: "prescription",
    p_target_id: prescription.id,
  }).then(undefined, () => {});

  return NextResponse.json({ prescription });
}
