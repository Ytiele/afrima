-- Afrima Digi-Health — Row Level Security.
--
-- State CHANGES go through the SECURITY DEFINER functions in
-- 0002_functions.sql, not generic UPDATE policies — so most tables below
-- intentionally have no patient/practitioner UPDATE policy at all for the
-- columns that matter (status, practitioner_id, etc). What's left here is
-- read access, and the few inserts/updates that are genuinely just "the
-- owner editing their own record."

alter table profiles enable row level security;
alter table patients enable row level security;
alter table practitioners enable row level security;
alter table consultations enable row level security;
alter table prescriptions enable row level security;
alter table prescription_items enable row level security;
alter table audit_logs enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on profiles for select
  using (user_id = auth.uid() or is_admin());

create policy profiles_insert_self on profiles for insert
  with check (user_id = auth.uid());

create policy profiles_update_self on profiles for update
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- patients — a patient reads/writes their own row; a practitioner may
-- read a patient's row only for a consultation actually assigned to
-- them; ALSO the basic info (name/age/gender) of anyone currently in the
-- open WAITING queue, since every active practitioner needs to see that
-- to render "Waiting Patients" before anyone has claimed them (spec §8);
-- admin reads everything.
-- ---------------------------------------------------------------------
create policy patients_select on patients for select
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from consultations c
      join practitioners pr on pr.id = c.practitioner_id
      where c.patient_id = patients.id and pr.user_id = auth.uid()
    )
    or exists (
      select 1 from consultations c, practitioners pr
      where c.patient_id = patients.id
        and c.status = 'WAITING'
        and pr.user_id = auth.uid()
        and pr.is_active
    )
  );

create policy patients_insert_self on patients for insert
  with check (user_id = auth.uid());

create policy patients_update_self on patients for update
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- practitioners — the directory (name + status) is visible to any
-- signed-in user (patients need to know "2 practitioners available";
-- practitioners need the live queue). No patient identity leaks through
-- this table. Only the practitioner themself or an admin may update it,
-- and only through the RPCs above in practice.
-- ---------------------------------------------------------------------
create policy practitioners_select_authenticated on practitioners for select
  using (auth.uid() is not null);

create policy practitioners_update_self_or_admin on practitioners for update
  using (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- consultations — a patient sees only their own; a practitioner sees
-- consultations assigned to them PLUS the open WAITING queue (needed to
-- render "Waiting Patients"); admin sees everything.
-- ---------------------------------------------------------------------
create policy consultations_select on consultations for select
  using (
    is_admin()
    or exists (select 1 from patients p where p.id = consultations.patient_id and p.user_id = auth.uid())
    or exists (select 1 from practitioners pr where pr.id = consultations.practitioner_id and pr.user_id = auth.uid())
    or (status = 'WAITING' and exists (select 1 from practitioners pr where pr.user_id = auth.uid() and pr.is_active))
  );

create policy consultations_insert_self on consultations for insert
  with check (exists (select 1 from patients p where p.id = consultations.patient_id and p.user_id = auth.uid()));

-- No general UPDATE policy: claim/start/end all go through the RPCs,
-- which run as SECURITY DEFINER and therefore bypass RLS by design while
-- still checking auth.uid() themselves.

-- ---------------------------------------------------------------------
-- prescriptions / prescription_items
-- ---------------------------------------------------------------------
create policy prescriptions_select on prescriptions for select
  using (
    is_admin()
    or exists (select 1 from patients p where p.id = prescriptions.patient_id and p.user_id = auth.uid())
    or exists (select 1 from practitioners pr where pr.id = prescriptions.practitioner_id and pr.user_id = auth.uid())
  );

create policy prescriptions_insert on prescriptions for insert
  with check (
    exists (
      select 1 from practitioners pr
      join consultations c on c.practitioner_id = pr.id
      where pr.user_id = auth.uid()
        and c.id = prescriptions.consultation_id
        and c.patient_id = prescriptions.patient_id
    )
  );

create policy prescription_items_select on prescription_items for select
  using (
    exists (
      select 1 from prescriptions rx
      where rx.id = prescription_items.prescription_id
        and (
          is_admin()
          or exists (select 1 from patients p where p.id = rx.patient_id and p.user_id = auth.uid())
          or exists (select 1 from practitioners pr where pr.id = rx.practitioner_id and pr.user_id = auth.uid())
        )
    )
  );

create policy prescription_items_insert on prescription_items for insert
  with check (
    exists (
      select 1 from prescriptions rx
      join practitioners pr on pr.id = rx.practitioner_id
      where rx.id = prescription_items.prescription_id and pr.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- audit_logs — admin only, no client-side insert (functions insert as
-- SECURITY DEFINER, bypassing RLS).
-- ---------------------------------------------------------------------
create policy audit_logs_select_admin on audit_logs for select
  using (is_admin());
