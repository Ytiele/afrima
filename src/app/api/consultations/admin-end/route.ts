import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteDailyRoom } from "@/lib/daily";

const schema = z.object({ consultation_id: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data, error } = await supabase.rpc("admin_end_consultation", {
    p_consultation_id: parsed.data.consultation_id,
  });

  if (error) {
    if (error.message.includes("NOT_AUTHORIZED")) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    return NextResponse.json({ error: "Could not end the consultation." }, { status: 500 });
  }

  if (data?.daily_room_name) {
    deleteDailyRoom(data.daily_room_name).catch((err) => console.error("room cleanup failed", err));
  }

  return NextResponse.json({ consultation: data });
}
