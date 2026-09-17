import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PractitionerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .single();
  if (!profile || !profile.is_active) redirect("/login");
  // An admin who also has an active practitioners row is allowed in here
  // too — the real authorization is "do you have a practitioner record",
  // not the profile's primary role. A patient has no practitioners row
  // and is rejected below regardless of what profile.role says.
  if (profile.role !== "PRACTITIONER" && profile.role !== "ADMIN") redirect("/login");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("is_active, status")
    .eq("user_id", user.id)
    .single();
  if (!practitioner || !practitioner.is_active) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl text-accent-700">
            Afrima Digi-Health
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/practitioner/history" className="text-neutral-600 hover:text-text">
              History
            </Link>
            {profile.role === "ADMIN" && (
              <Link href="/admin/dashboard" className="text-accent-700 hover:text-accent-600">
                Admin view
              </Link>
            )}
            <form action="/api/auth/signout" method="post">
              <button className="text-neutral-600 hover:text-text">Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
