export type Role = "PATIENT" | "PRACTITIONER" | "ADMIN";

export type PractitionerStatus = "OFFLINE" | "AVAILABLE" | "IN_CALL" | "SUSPENDED";

export type ConsultationStatus =
  | "WAITING"
  | "CLAIMED"
  | "IN_CALL"
  | "COMPLETED"
  | "CANCELLED"
  | "ABANDONED";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  created_at: string;
  updated_at: string;
}

export interface Practitioner {
  id: string;
  user_id: string;
  full_name: string;
  status: PractitionerStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  practitioner_id: string | null;
  status: ConsultationStatus;
  reason: string | null;
  diagnosis: string | null;
  referring_facility: string | null;
  bmi: number | null;
  waz: number | null;
  daily_room_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationWithNames extends Consultation {
  patient_name?: string;
  practitioner_name?: string;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  practitioner_id: string;
  diagnosis: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
