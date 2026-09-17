import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303, not the default 307 -- this was a POST (native form submit), and a
  // 307 preserves the method, so the browser would re-POST to /login (a
  // client-only page with no POST handler) and get a 405 instead of logging
  // out. 303 always turns the follow-up request into a GET.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
