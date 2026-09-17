import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui";
import { AdminPractitioners } from "@/components/admin/AdminPractitioners";

export default async function AdminPractitionersPage() {
  const supabase = await createClient();
  const { data: practitioners } = await supabase
    .from("practitioners")
    .select("*")
    .order("full_name", { ascending: true });

  const inCallIds = (practitioners ?? []).filter((p) => p.status === "IN_CALL").map((p) => p.id);
  let currentPatients: Record<string, string> = {};
  if (inCallIds.length) {
    const { data: activeConsultations } = await supabase
      .from("consultations")
      .select("practitioner_id, patients(full_name)")
      .in("practitioner_id", inCallIds)
      .eq("status", "IN_CALL");
    currentPatients = Object.fromEntries(
      (activeConsultations ?? []).map((c) => [
        c.practitioner_id,
        (c.patients as unknown as { full_name: string } | null)?.full_name ?? "",
      ])
    );
  }

  const rows = (practitioners ?? []).map((p) => ({ ...p, current_patient: currentPatients[p.id] ?? null }));

  return (
    <div>
      <PageHeading title="Practitioners" />
      <AdminPractitioners initial={rows} />
    </div>
  );
}
