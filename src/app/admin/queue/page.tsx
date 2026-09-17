import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui";
import { AdminWaitingQueue } from "@/components/admin/AdminWaitingQueue";

export default async function AdminQueuePage() {
  const supabase = await createClient();
  const { data: waitingQueue, error: waitingQueueError } = await supabase
    .from("consultations")
    .select(
      "id, specialty, reason, created_at, is_referral, payment_verified, mpesa_code, referral_hospital, patients(full_name)"
    )
    .eq("status", "WAITING")
    .order("created_at", { ascending: true });
  if (waitingQueueError) console.error("admin waiting queue query failed:", waitingQueueError.message);

  return (
    <div>
      <PageHeading title="Waiting Queue" />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AdminWaitingQueue initial={(waitingQueue as any) ?? []} />
    </div>
  );
}
