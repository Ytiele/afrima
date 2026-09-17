import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ practitioner_id: z.string().uuid() });

// "Remove" = soft delete (spec §16) — is_active=false, status=SUSPENDED.
// Historical consultations/prescriptions stay intact and attributed.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data, error } = await supabase.rpc("admin_set_practitioner_active", {
    p_practitioner_id: parsed.data.practitioner_id,
    p_active: false,
  });

  if (error) {
    return NextResponse.json({ error: "Not authorized or practitioner not found." }, { status: 403 });
  }
  return NextResponse.json({ practitioner: data });
}
