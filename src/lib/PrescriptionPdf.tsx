import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Prescription, PrescriptionItem } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#201e1d" },
  brand: { fontSize: 18, marginBottom: 2, color: "#89491f" },
  title: { fontSize: 14, marginBottom: 20, letterSpacing: 1 },
  row: { flexDirection: "row", marginBottom: 14, gap: 24 },
  col: { flexDirection: "column" },
  label: { fontSize: 9, color: "#5b5447", textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 12 },
  sectionTitle: { fontSize: 10, color: "#5b5447", textTransform: "uppercase", marginTop: 16, marginBottom: 8 },
  item: { marginBottom: 10, paddingBottom: 10, borderBottom: "1 solid #e3dccb" },
  itemTitle: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  itemMeta: { fontSize: 10, color: "#403b31" },
  footer: { marginTop: 40, paddingTop: 12, borderTop: "1 solid #e3dccb" },
});

export function PrescriptionPdf({
  prescription,
  items,
  patientName,
  patientAge,
  practitionerName,
}: {
  prescription: Prescription;
  items: PrescriptionItem[];
  patientName: string;
  patientAge: number | null;
  practitionerName: string;
}) {
  const date = new Date(prescription.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>AFRIMA DIGI-HEALTH</Text>
        <Text style={styles.title}>PRESCRIPTION</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{patientName}</Text>
          </View>
          {patientAge != null && (
            <View style={styles.col}>
              <Text style={styles.label}>Age</Text>
              <Text style={styles.value}>{patientAge}</Text>
            </View>
          )}
          <View style={styles.col}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Practitioner</Text>
            <Text style={styles.value}>{practitionerName}</Text>
          </View>
        </View>

        {prescription.diagnosis && (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Diagnosis</Text>
            <Text style={styles.value}>{prescription.diagnosis}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Prescription Items</Text>
        {items.map((item, i) => (
          <View key={item.id} style={styles.item}>
            <Text style={styles.itemTitle}>
              {i + 1}. {item.medication_name}
            </Text>
            <Text style={styles.itemMeta}>
              Dosage: {item.dosage || "—"}   Frequency: {item.frequency || "—"}   Duration:{" "}
              {item.duration || "—"}
            </Text>
            {item.instructions && <Text style={styles.itemMeta}>Instructions: {item.instructions}</Text>}
          </View>
        ))}

        {prescription.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Additional Instructions</Text>
            <Text style={styles.value}>{prescription.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.value}>{practitionerName}</Text>
          <Text style={styles.itemMeta}>Practitioner</Text>
        </View>
      </Page>
    </Document>
  );
}
