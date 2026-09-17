import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ consultation_id: z.string().uuid() });

// Wraps claim_consultation() (see supabase/migrations/0002_functions.sql)
// — the actual atomicity lives in that function's single UPDATE ... WHERE
// status = 'WAITING', not here. This route just translates its exceptions
// into the HTTP responses the practitioner UI expects.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("claim_consultation", {
    p_consultation_id: parsed.data.consultation_id,
  });

  if (error) {
    if (error.message.includes("ALREADY_CLAIMED")) {
      return NextResponse.json(
        { error: "This patient has already been taken by another practitioner." },
        { status: 409 }
      );
    }
    if (error.message.includes("PRACTITIONER_ALREADY_IN_CALL")) {
      return NextResponse.json({ error: "You're already in a call." }, { status: 409 });
    }
    if (error.message.includes("PRACTITIONER_SUSPENDED")) {
      return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
    }
    if (error.message.includes("NOT_A_PRACTITIONER")) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    return NextResponse.json({ error: "Could not claim this consultation." }, { status: 500 });
  }

  return NextResponse.json({ consultation: data });
}
