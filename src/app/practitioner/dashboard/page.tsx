import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui";
import { PractitionerQueue, type WaitingRow, type ReferralRow } from "./PractitionerQueue";

export default async function PractitionerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id, status, full_name, specialties")
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
    .select("id, specialty, reason, referring_facility, created_at, patients(full_name, age, gender)")
    .eq("status", "WAITING")
    .eq("is_referral", false)
    .in("specialty", practitioner.specialties)
    .order("created_at", { ascending: true });

  // Referral submissions aren't specialty-scoped and never show up in the
  // plain "Answer" list -- any active practitioner can verify one.
  const { data: referrals } = await supabase
    .from("consultations")
    .select(
      "id, referral_hospital, referral_doctor_name, referral_doctor_number, mpesa_code, created_at, patients(full_name)"
    )
    .eq("status", "WAITING")
    .eq("is_referral", true)
    .eq("payment_verified", false)
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeading eyebrow="Practitioner" title={`Welcome, ${practitioner.full_name}`} />
      <PractitionerQueue
        initialStatus={practitioner.status}
        initialQueue={(queue as unknown as WaitingRow[]) ?? []}
        initialReferrals={(referrals as unknown as ReferralRow[]) ?? []}
        activeConsultationId={activeConsultationId}
      />
    </div>
  );
}
