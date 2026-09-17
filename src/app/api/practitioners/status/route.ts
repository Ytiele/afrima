import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ status: z.enum(["AVAILABLE", "OFFLINE"]) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const { data, error } = await supabase.rpc("set_practitioner_status", {
    p_status: parsed.data.status,
  });

  if (error) {
    return NextResponse.json(
      { error: "Can't change status right now (you may be in a call)." },
      { status: 409 }
    );
  }
  return NextResponse.json({ practitioner: data });
}
