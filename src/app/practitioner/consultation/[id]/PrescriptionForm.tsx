"use client";

import { useState } from "react";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";

interface Item {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const blankItem: Item = { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" };

export function PrescriptionForm({
  consultationId,
  defaultDiagnosis,
  onCreated,
}: {
  consultationId: string;
  defaultDiagnosis: string;
  onCreated: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState(defaultDiagnosis);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...blankItem }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/prescriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultationId,
          diagnosis,
          notes,
          items: items.filter((i) => i.medication_name.trim()),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Could not create prescription.");
        return;
      }
      setCreatedId(body.prescription.id);
    } finally {
      setLoading(false);
    }
  }

  if (createdId) {
    return (
      <Card className="p-6 text-center">
        <p className="mb-3">Prescription created.</p>
        <div className="flex justify-center gap-3">
          <a href={`/api/prescriptions/pdf?id=${createdId}`} className="text-accent-700 font-semibold">
            Download PDF
          </a>
          <button onClick={onCreated} className="text-neutral-600 font-semibold">
            Close
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col gap-4">
      <h3 className="text-lg">Create Prescription</h3>
      <Field label="Diagnosis">
        <input className={inputClass} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Field>

      {items.map((item, i) => (
        <div key={i} className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-600">Item {i + 1}</span>
            {items.length > 1 && (
              <button
                type="button"
                className="text-xs text-danger"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            )}
          </div>
          <Field label="Medication / treatment">
            <input
              className={inputClass}
              value={item.medication_name}
              onChange={(e) => updateItem(i, "medication_name", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Dosage">
              <input className={inputClass} value={item.dosage} onChange={(e) => updateItem(i, "dosage", e.target.value)} />
            </Field>
            <Field label="Frequency">
              <input className={inputClass} value={item.frequency} onChange={(e) => updateItem(i, "frequency", e.target.value)} />
            </Field>
            <Field label="Duration">
              <input className={inputClass} value={item.duration} onChange={(e) => updateItem(i, "duration", e.target.value)} />
            </Field>
          </div>
          <Field label="Instructions">
            <input
              className={inputClass}
              value={item.instructions}
              onChange={(e) => updateItem(i, "instructions", e.target.value)}
            />
          </Field>
        </div>
      ))}

      <button
        type="button"
        className="text-sm font-semibold text-accent-700 self-start"
        onClick={() => setItems((prev) => [...prev, { ...blankItem }])}
      >
        + Add another item
      </button>

      <Field label="Additional instructions">
        <textarea className={textareaClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button onClick={submit} disabled={loading} className="self-start">
        {loading ? "Saving…" : "Save Prescription"}
      </Button>
    </Card>
  );
}
