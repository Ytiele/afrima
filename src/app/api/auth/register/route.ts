import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Patient self-registration only (spec §5: practitioner/admin accounts are
// a known, small set — provisioned directly in Supabase, not a public
// sign-up form). Runs entirely with the admin client so it works
// regardless of whether the Supabase project has email confirmation on:
// we auto-confirm the auth user and create the profile/patient rows in
// the same request, then the client signs in normally right after.
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password, full_name, phone } = parsed.data;

  const admin = createAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "PATIENT" },
  });
  if (createErr || !created.user) {
    const message = createErr?.message?.includes("already registered")
      ? "An account with this email already exists."
      : createErr?.message ?? "Could not create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = created.user.id;

  const { error: profileErr } = await admin.from("profiles").insert({
    user_id: userId,
    full_name,
    role: "PATIENT",
    phone: phone || null,
  });
  const { error: patientErr } = await admin.from("patients").insert({
    user_id: userId,
    full_name,
  });

  if (profileErr || patientErr) {
    // Roll back the auth user so a half-created account can't get stuck
    // — the client can just retry from scratch.
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Could not finish setting up your account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
