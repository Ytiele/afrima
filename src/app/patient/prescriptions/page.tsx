import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, LinkButton, PageHeading } from "@/components/ui";
import { format } from "date-fns";

export default async function PatientPrescriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user!.id).single();

  const { data: prescriptions } = patient
    ? await supabase
        .from("prescriptions")
        .select("id, diagnosis, created_at, practitioners(full_name)")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <PageHeading eyebrow="Your record" title="My Prescriptions" />
      <Card className="p-2">
        {!prescriptions?.length ? (
          <EmptyState>No prescriptions yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {prescriptions.map((rx) => (
              <li key={rx.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-semibold">
                    Prescription — {format(new Date(rx.created_at), "d MMMM yyyy")}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {(rx.practitioners as unknown as { full_name: string } | null)?.full_name}
                    {rx.diagnosis ? ` · ${rx.diagnosis}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <LinkButton href={`/patient/prescriptions/${rx.id}`} variant="secondary">
                    View
                  </LinkButton>
                  <LinkButton href={`/api/prescriptions/pdf?id=${rx.id}`} variant="primary">
                    Download PDF
                  </LinkButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
