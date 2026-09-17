import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PractitionerConsultationRoom } from "./PractitionerConsultationRoom";

export default async function PractitionerConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: consultation } = await supabase.from("consultations").select("*").eq("id", id).single();
  if (!consultation) notFound();

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, age, gender")
    .eq("id", consultation.patient_id)
    .single();

  return (
    <div className="py-4">
      <PractitionerConsultationRoom initial={consultation} patient={patient} />
    </div>
  );
}
