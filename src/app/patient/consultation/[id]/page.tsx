import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientConsultationRoom } from "./PatientConsultationRoom";

export default async function PatientConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: consultation } = await supabase.from("consultations").select("*").eq("id", id).single();
  if (!consultation) notFound();

  let practitionerName: string | null = null;
  if (consultation.practitioner_id) {
    const { data: practitioner } = await supabase
      .from("practitioners")
      .select("full_name")
      .eq("id", consultation.practitioner_id)
      .single();
    practitionerName = practitioner?.full_name ?? null;
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", consultation.patient_id)
    .single();

  return (
    <div className="py-8">
      <PatientConsultationRoom
        initial={consultation}
        practitionerName={practitionerName}
        patientName={patient?.full_name ?? null}
      />
    </div>
  );
}
