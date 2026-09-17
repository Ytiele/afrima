import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  practitioner_id: z.string().uuid(),
  specialties: z
    .array(z.enum(["GENERAL_PRACTITIONER", "NUTRITIONIST", "PSYCHOLOGIST"]))
    .min(1, "Pick at least one specialty"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("admin_set_practitioner_specialties", {
    p_practitioner_id: parsed.data.practitioner_id,
    p_specialties: parsed.data.specialties,
  });

  if (error) {
    return NextResponse.json({ error: "Not authorized or practitioner not found." }, { status: 403 });
  }
  return NextResponse.json({ practitioner: data });
}
