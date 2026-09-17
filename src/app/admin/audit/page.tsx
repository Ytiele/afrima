import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { format } from "date-fns";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <PageHeading title="Audit Log" />
      <Card className="p-2">
        {!logs?.length ? (
          <EmptyState>No activity recorded yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="p-3">When</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-neutral-100">
                  <td className="p-3 whitespace-nowrap">{format(new Date(log.created_at), "d MMM yyyy HH:mm")}</td>
                  <td className="p-3 font-mono text-xs">{log.action}</td>
                  <td className="p-3 text-neutral-600">
                    {log.target_type ? `${log.target_type} · ${log.target_id?.slice(0, 8)}` : "—"}
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
              href={`/admin/audit?page=${p}`}
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
