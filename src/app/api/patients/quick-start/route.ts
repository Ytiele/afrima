import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// The homepage's "enter your name and email, join the queue" form.
//
// First time we see an email: create the account outright and hand back
// a one-time password the browser immediately signs in with — zero extra
// steps, since nobody else could have claimed that email before them.
//
// An email we've already seen: do NOT sign anyone in here. Returning
// "verified" would let anyone who merely knows a patient's email address
// read their consultation history and prescriptions. Instead this tells
// the client to fall back to Supabase's own OTP email flow, which proves
// the requester actually controls that inbox before a session is issued.
const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const full_name = parsed.data.full_name;
  const email = parsed.data.email.toLowerCase();

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("patients")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ status: "verify" });
  }

  const tempPassword = crypto.randomBytes(18).toString("base64url");

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role: "PATIENT" },
  });
  if (createErr || !created.user) {
    const message = createErr?.message?.includes("already registered")
      ? "That email is already in use — check your inbox for a code instead."
      : "Could not start your consultation. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const userId = created.user.id;

  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ user_id: userId, full_name, role: "PATIENT" });
  const { error: patientErr } = await admin
    .from("patients")
    .insert({ user_id: userId, full_name, email });

  if (profileErr || patientErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Could not start your consultation. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ status: "new", email, password: tempPassword });
}
