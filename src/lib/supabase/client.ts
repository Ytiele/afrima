"use client";

// Browser client — uses the anon key only. Every read/write made with this
// client is subject to Postgres RLS as the signed-in user; it can never see
// or do more than the policies in supabase/migrations/0003_rls.sql allow.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
