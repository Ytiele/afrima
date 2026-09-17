import { createClient } from "@/lib/supabase/server";
import { Card, ConsultationStatusPill, EmptyState, PageHeading } from "@/components/ui";
import { format } from "date-fns";

export default async function PractitionerHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  const { data: consultations } = practitioner
    ? await supabase
        .from("consultations")
        .select("id, status, reason, created_at, duration_seconds, patients(full_name)")
        .eq("practitioner_id", practitioner.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <PageHeading eyebrow="Your record" title="Consultation History" />
      <Card className="p-2">
        {!consultations?.length ? (
          <EmptyState>No consultations yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="p-3">Date</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((c) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="p-3">{format(new Date(c.created_at), "d MMM yyyy")}</td>
                  <td className="p-3">
                    {(c.patients as unknown as { full_name: string } | null)?.full_name ?? "—"}
                  </td>
                  <td className="p-3 max-w-xs truncate">{c.reason}</td>
                  <td className="p-3">
                    {c.duration_seconds ? `${Math.round(c.duration_seconds / 60)}m` : "—"}
                  </td>
                  <td className="p-3">
                    <ConsultationStatusPill status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
