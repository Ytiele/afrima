import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ consultation_id: z.string().uuid() });

// Admin "Remove" from the waiting queue (spec §19) — WAITING -> CANCELLED,
// never a hard delete.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data, error } = await supabase.rpc("cancel_waiting_consultation", {
    p_consultation_id: parsed.data.consultation_id,
  });

  if (error) {
    return NextResponse.json({ error: "Not authorized, or this patient is no longer waiting." }, { status: 409 });
  }
  return NextResponse.json({ consultation: data });
}
