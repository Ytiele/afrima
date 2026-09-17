import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "PATIENT") redirect("/login");
  if (!profile.is_active) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl text-accent-700">
            Afrima Digi-Health
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/patient/history" className="text-neutral-600 hover:text-text">
              History
            </Link>
            <Link href="/patient/prescriptions" className="text-neutral-600 hover:text-text">
              Prescriptions
            </Link>
            <form action="/api/auth/signout" method="post">
              <button className="text-neutral-600 hover:text-text">Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
