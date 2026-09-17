-- Fix: "infinite recursion detected in policy for relation patients" (42P17).
--
-- patients_select queried consultations, and consultations_select queried
-- patients right back -- a genuine RLS cycle between the two tables, which
-- Postgres detects and refuses to run. This broke every read of a patient's
-- own row (e.g. the quick-start homepage's POST /api/consultations/start,
-- which silently got "not found" because the underlying select errored).
--
-- Fix: move each cross-table check into its own SECURITY DEFINER function
-- (same pattern as is_admin() below). Functions run as the table owner,
-- which bypasses RLS on the table it queries internally, so the check no
-- longer re-triggers the calling table's own policy.

create or replace function practitioner_assigned_to_patient(p_patient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from consultations c
    join practitioners pr on pr.id = c.practitioner_id
    where c.patient_id = p_patient_id and pr.user_id = auth.uid()
  );
$$;

create or replace function active_practitioner_has_waiting_patient(p_patient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from consultations c, practitioners pr
    where c.patient_id = p_patient_id
      and c.status = 'WAITING'
      and pr.user_id = auth.uid()
      and pr.is_active
  );
$$;

create or replace function patient_owns_row(p_patient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from patients p where p.id = p_patient_id and p.user_id = auth.uid());
$$;

create or replace function practitioner_owns_row(p_practitioner_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from practitioners pr where pr.id = p_practitioner_id and pr.user_id = auth.uid());
$$;

create or replace function active_practitioner_viewing_waiting() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from practitioners pr where pr.user_id = auth.uid() and pr.is_active);
$$;

drop policy if exists patients_select on patients;
create policy patients_select on patients for select
  using (
    user_id = auth.uid()
    or is_admin()
    or practitioner_assigned_to_patient(id)
    or active_practitioner_has_waiting_patient(id)
  );

drop policy if exists consultations_select on consultations;
create policy consultations_select on consultations for select
  using (
    is_admin()
    or patient_owns_row(patient_id)
    or practitioner_owns_row(practitioner_id)
    or (status = 'WAITING' and active_practitioner_viewing_waiting())
  );

drop policy if exists consultations_insert_self on consultations;
create policy consultations_insert_self on consultations for insert
  with check (patient_owns_row(patient_id));
