import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton, PageHeading } from "@/components/ui";

export default async function PatientDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  // If there's already an active (non-final) consultation, send them
  // straight back into it instead of letting them start a second one.
  let activeConsultationId: string | null = null;
  if (patient) {
    const { data: active } = await supabase
      .from("consultations")
      .select("id")
      .eq("patient_id", patient.id)
      .in("status", ["WAITING", "CLAIMED", "IN_CALL"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeConsultationId = active?.id ?? null;
  }

  return (
    <div>
      <PageHeading eyebrow="Welcome back" title={profile?.full_name ?? "Patient"} />

      <Card className="p-8 mb-8 bg-gradient-to-br from-accent-50 to-sage-50">
        <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700 mb-2">
          Need to talk to a nutritionist?
        </h6>
        <h3 className="text-xl mb-3 max-w-md">
          {activeConsultationId
            ? "You already have a consultation in progress."
            : "Start a consultation and you'll be connected the moment someone is free."}
        </h3>
        <LinkButton
          href={activeConsultationId ? `/patient/consultation/${activeConsultationId}` : "/patient/consultation"}
        >
          {activeConsultationId ? "Return to my consultation" : "Start Consultation"}
        </LinkButton>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg mb-2">Consultation History</h3>
          <p className="text-sm text-neutral-600 mb-4">
            See your past consultations and how long each one took.
          </p>
          <LinkButton href="/patient/history" variant="secondary">
            View history
          </LinkButton>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg mb-2">My Prescriptions</h3>
          <p className="text-sm text-neutral-600 mb-4">
            View and download any prescriptions written for you.
          </p>
          <LinkButton href="/patient/prescriptions" variant="secondary">
            View prescriptions
          </LinkButton>
        </Card>
      </div>
    </div>
  );
}
