import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createDailyRoom } from "@/lib/daily";

const schema = z.object({ consultation_id: z.string().uuid() });

// Called by the practitioner immediately after a successful claim. RLS
// already guarantees the SELECT below only returns a row if this
// practitioner is the one assigned to it, so there's no separate
// "is this really your consultation" check needed here.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: consultation } = await supabase
    .from("consultations")
    .select("id, status, practitioner_id, practitioners!inner(user_id)")
    .eq("id", parsed.data.consultation_id)
    .eq("practitioners.user_id", user.id)
    .single();

  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found or not yours." }, { status: 404 });
  }
  if (consultation.status !== "CLAIMED") {
    return NextResponse.json({ error: `Consultation is ${consultation.status}, not CLAIMED.` }, { status: 409 });
  }

  try {
    const room = await createDailyRoom(consultation.id);
    const { data: updated, error } = await supabase.rpc("start_call", {
      p_consultation_id: consultation.id,
      p_daily_room_name: room.name,
    });
    if (error) throw error;
    return NextResponse.json({ consultation: updated, room_name: room.name });
  } catch (err) {
    console.error("create-room failed", err);
    return NextResponse.json({ error: "Could not set up the video room." }, { status: 502 });
  }
}
