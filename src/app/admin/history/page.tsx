import { createClient } from "@/lib/supabase/server";
import { Card, ConsultationStatusPill, EmptyState, PageHeading, inputClass } from "@/components/ui";
import { format } from "date-fns";

const PAGE_SIZE = 20;

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status || "";
  const date = params.date || "";
  const q = params.q || "";

  const supabase = await createClient();

  let query = supabase
    .from("consultations")
    .select(
      "id, status, created_at, started_at, ended_at, duration_seconds, patients(full_name), practitioners(full_name)",
      { count: "exact" }
    )
    .not("status", "in", "(WAITING,CLAIMED)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count } = await query.range(from, from + PAGE_SIZE - 1);

  // Server-side name filtering on top of the paginated slice keeps this
  // simple without loading the whole table — for the two-practitioner
  // scale this app targets, this is a reasonable trade-off; a growing
  // deployment would want this pushed into the query (e.g. a search
  // index or a join-based ilike) instead.
  const filtered = q
    ? (rows ?? []).filter((r) => {
        const patientName = (r.patients as unknown as { full_name: string } | null)?.full_name ?? "";
        const practitionerName = (r.practitioners as unknown as { full_name: string } | null)?.full_name ?? "";
        const needle = q.toLowerCase();
        return patientName.toLowerCase().includes(needle) || practitionerName.toLowerCase().includes(needle);
      })
    : rows ?? [];

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams({ ...(status && { status }), ...(date && { date }), ...(q && { q }), page: String(p) });
    return `/admin/history?${sp.toString()}`;
  }

  return (
    <div>
      <PageHeading title="Call History" />
      <form className="flex flex-wrap gap-3 mb-4" method="get">
        <input name="q" defaultValue={q} placeholder="Search patient or practitioner" className={`${inputClass} max-w-xs`} />
        <input type="date" name="date" defaultValue={date} className={`${inputClass} max-w-[160px]`} />
        <select name="status" defaultValue={status} className={`${inputClass} max-w-[160px]`}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="ABANDONED">Abandoned</option>
        </select>
        <button className="rounded-full bg-accent-500 text-white px-5 py-2.5 text-sm font-semibold">Filter</button>
      </form>

      <Card className="p-2">
        {!filtered.length ? (
          <EmptyState>No consultations match these filters.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="p-3">Patient</th>
                <th className="p-3">Practitioner</th>
                <th className="p-3">Date</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100">
                  <td className="p-3">{(r.patients as unknown as { full_name: string } | null)?.full_name}</td>
                  <td className="p-3">{(r.practitioners as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                  <td className="p-3">{format(new Date(r.created_at), "d MMM yyyy")}</td>
                  <td className="p-3">{r.started_at ? format(new Date(r.started_at), "HH:mm") : "—"}</td>
                  <td className="p-3">{r.ended_at ? format(new Date(r.ended_at), "HH:mm") : "—"}</td>
                  <td className="p-3">
                    {r.duration_seconds
                      ? `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s`
                      : "—"}
                  </td>
                  <td className="p-3">
                    <ConsultationStatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={pageHref(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                p === page ? "bg-accent-500 text-white" : "bg-white border border-neutral-300"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
