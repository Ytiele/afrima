import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PrescriptionPdf } from "@/lib/PrescriptionPdf";

export const runtime = "nodejs";

// GET /api/prescriptions/pdf?id=<prescription_id>
// RLS on `prescriptions`/`prescription_items` already restricts this to
// the owning patient, the authoring practitioner, or an admin (spec §24)
// — there is no separate authorization check needed here because the
// query below simply returns nothing for anyone else.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("*, patients(full_name, age), practitioners(full_name)")
    .eq("id", id)
    .single();
  if (!prescription) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase
    .from("prescription_items")
    .select("*")
    .eq("prescription_id", id);

  const patient = prescription.patients as unknown as { full_name: string; age: number | null } | null;
  const practitioner = prescription.practitioners as unknown as { full_name: string } | null;

  const buffer = await renderToBuffer(
    <PrescriptionPdf
      prescription={prescription}
      items={items ?? []}
      patientName={patient?.full_name ?? "Patient"}
      patientAge={patient?.age ?? null}
      practitionerName={practitioner?.full_name ?? "Practitioner"}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prescription-${id.slice(0, 8)}.pdf"`,
    },
  });
}
