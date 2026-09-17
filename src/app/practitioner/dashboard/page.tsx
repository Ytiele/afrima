import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui";
import { PractitionerQueue, type WaitingRow } from "./PractitionerQueue";

export default async function PractitionerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id, status, full_name")
    .eq("user_id", user.id)
    .single();
  if (!practitioner) redirect("/login");

  let activeConsultationId: string | null = null;
  if (practitioner.status === "IN_CALL") {
    const { data: active } = await supabase
      .from("consultations")
      .select("id")
      .eq("practitioner_id", practitioner.id)
      .in("status", ["CLAIMED", "IN_CALL"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeConsultationId = active?.id ?? null;
  }

  const { data: queue } = await supabase
    .from("consultations")
    .select("id, reason, referring_facility, created_at, patients(full_name, age, gender)")
    .eq("status", "WAITING")
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeading eyebrow="Practitioner" title={`Welcome, ${practitioner.full_name}`} />
      <PractitionerQueue
        initialStatus={practitioner.status}
        initialQueue={(queue as unknown as WaitingRow[]) ?? []}
        activeConsultationId={activeConsultationId}
      />
    </div>
  );
}
