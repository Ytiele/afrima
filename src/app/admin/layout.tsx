import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/practitioners", label: "Practitioners" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/calls", label: "Calls" },
  { href: "/admin/history", label: "History" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
  if (!profile || profile.role !== "ADMIN" || !profile.is_active) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="font-heading text-xl text-accent-700">Afrima Admin</span>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="text-neutral-600">{profile.full_name}</span>
            <form action="/api/auth/signout" method="post">
              <button className="text-neutral-600 hover:text-text">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="max-w-6xl w-full mx-auto flex flex-1 gap-8 px-4 sm:px-6 py-8">
        <aside className="w-44 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-accent-50 hover:text-accent-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
