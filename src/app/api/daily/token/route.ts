import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createDailyToken } from "@/lib/daily";

const schema = z.object({ consultation_id: z.string().uuid() });

// RLS on `consultations` (see 0003_rls.sql) already restricts the SELECT
// below to: the owning patient, the assigned practitioner, or an admin —
// so if this returns a row at all, the caller is allowed in this room.
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
    .select("id, status, daily_room_name, practitioner_id")
    .eq("id", parsed.data.consultation_id)
    .single();

  if (!consultation) return NextResponse.json({ error: "Not found or not authorized." }, { status: 404 });
  if (consultation.status !== "IN_CALL" || !consultation.daily_room_name) {
    return NextResponse.json({ error: "This consultation isn't live yet." }, { status: 409 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  const { data: practitioner } = consultation.practitioner_id
    ? await supabase.from("practitioners").select("user_id").eq("id", consultation.practitioner_id).single()
    : { data: null };
  const isOwner = practitioner?.user_id === user.id;

  try {
    const token = await createDailyToken({
      roomName: consultation.daily_room_name,
      userName: profile?.full_name || (isOwner ? "Practitioner" : "Patient"),
      isOwner,
    });
    const domain = process.env.DAILY_DOMAIN;
    const roomUrl = domain
      ? `https://${domain}/${consultation.daily_room_name}`
      : null;
    return NextResponse.json({ token, room_url: roomUrl, room_name: consultation.daily_room_name });
  } catch (err) {
    console.error("token creation failed", err);
    return NextResponse.json({ error: "Could not join the call." }, { status: 502 });
  }
}
