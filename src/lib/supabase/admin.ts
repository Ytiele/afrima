import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. `import "server-only"` makes
// any accidental import from a Client Component a BUILD ERROR, not just a
// runtime leak: this file, and SUPABASE_SERVICE_ROLE_KEY, must never reach
// the browser bundle. Use only inside Route Handlers / Server Actions that
// have already re-derived the caller's identity from their own session
// (e.g. the Daily token/room routes, which need to look up a consultation
// across role boundaries after verifying the caller is party to it).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
