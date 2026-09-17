import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton, PageHeading } from "@/components/ui";
import { format } from "date-fns";

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS restricts this to the owning patient, the authoring practitioner,
  // or an admin — anyone else gets zero rows, same as a 404.
  const { data: rx } = await supabase
    .from("prescriptions")
    .select("*, patients(full_name, age), practitioners(full_name)")
    .eq("id", id)
    .single();
  if (!rx) notFound();

  const { data: items } = await supabase
    .from("prescription_items")
    .select("*")
    .eq("prescription_id", id);

  const patient = rx.patients as unknown as { full_name: string; age: number | null } | null;
  const practitioner = rx.practitioners as unknown as { full_name: string } | null;

  return (
    <div>
      <PageHeading
        eyebrow={format(new Date(rx.created_at), "d MMMM yyyy")}
        title="Prescription"
        action={
          <LinkButton href={`/api/prescriptions/pdf?id=${rx.id}`}>Download PDF</LinkButton>
        }
      />
      <Card className="p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-neutral-500">Patient</div>
            <div className="font-semibold">{patient?.full_name}</div>
          </div>
          <div>
            <div className="text-neutral-500">Practitioner</div>
            <div className="font-semibold">{practitioner?.full_name}</div>
          </div>
        </div>
        {rx.diagnosis && (
          <div>
            <div className="text-neutral-500 text-sm">Diagnosis</div>
            <div>{rx.diagnosis}</div>
          </div>
        )}
        <div>
          <div className="text-neutral-500 text-sm mb-2">Prescription items</div>
          <ol className="space-y-3">
            {items?.map((item, i) => (
              <li key={item.id} className="border border-neutral-200 rounded-xl p-3">
                <div className="font-semibold">
                  {i + 1}. {item.medication_name}
                </div>
                <div className="text-sm text-neutral-600 grid grid-cols-3 gap-2 mt-1">
                  <span>Dosage: {item.dosage || "—"}</span>
                  <span>Frequency: {item.frequency || "—"}</span>
                  <span>Duration: {item.duration || "—"}</span>
                </div>
                {item.instructions && (
                  <div className="text-sm text-neutral-600 mt-1">{item.instructions}</div>
                )}
              </li>
            ))}
          </ol>
        </div>
        {rx.notes && (
          <div>
            <div className="text-neutral-500 text-sm">Additional instructions</div>
            <div>{rx.notes}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
