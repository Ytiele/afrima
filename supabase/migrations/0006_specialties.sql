-- Afrima Digi-Health — specialties + fully anonymous patient intake.
--
-- Patients no longer create an account, enter a password, or verify an
-- email: the homepage now asks only for a name, which of three
-- specialties they want to see, and a reason, then signs them in with
-- Supabase Auth's built-in anonymous sign-in before creating their queue
-- entry. Practitioners are scoped to the specialties they cover so the
-- queue splits three ways instead of being one shared pool.

alter table practitioners
  add column if not exists specialties text[] not null
  default array['GENERAL_PRACTITIONER','NUTRITIONIST','PSYCHOLOGIST'];

alter table practitioners
  drop constraint if exists practitioners_specialties_check;
alter table practitioners
  add constraint practitioners_specialties_check check (
    array_length(specialties, 1) > 0
    and specialties <@ array['GENERAL_PRACTITIONER','NUTRITIONIST','PSYCHOLOGIST']::text[]
  );

alter table consultations
  add column if not exists specialty text
  check (specialty in ('GENERAL_PRACTITIONER','NUTRITIONIST','PSYCHOLOGIST'));

-- ---------------------------------------------------------------------
-- Specialty-aware queue visibility: an active practitioner should only
-- see (and be able to claim) WAITING patients in a specialty they cover.
-- A null specialty (pre-migration rows, if any) stays visible to anyone,
-- same as before.
-- ---------------------------------------------------------------------
create or replace function active_practitioner_has_waiting_patient(p_patient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from consultations c, practitioners pr
    where c.patient_id = p_patient_id
      and c.status = 'WAITING'
      and pr.user_id = auth.uid()
      and pr.is_active
      and (c.specialty is null or c.specialty = any(pr.specialties))
  );
$$;

-- Signature is changing (it now needs the consultation's specialty), so
-- the dependent policy has to go first, then the old zero-arg function.
drop policy if exists consultations_select on consultations;
drop function if exists active_practitioner_viewing_waiting();

create or replace function active_practitioner_viewing_waiting(p_specialty text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practitioners pr
    where pr.user_id = auth.uid()
      and pr.is_active
      and (p_specialty is null or p_specialty = any(pr.specialties))
  );
$$;

create policy consultations_select on consultations for select
  using (
    is_admin()
    or patient_owns_row(patient_id)
    or practitioner_owns_row(practitioner_id)
    or (status = 'WAITING' and active_practitioner_viewing_waiting(specialty))
  );

-- ---------------------------------------------------------------------
-- claim_consultation now also enforces the specialty match server-side
-- (defense in depth -- the queue UI already only shows matching patients).
-- ---------------------------------------------------------------------
create or replace function claim_consultation(p_consultation_id uuid)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_prac practitioners;
  v_specialty text;
  v_row consultations;
begin
  select * into v_prac from practitioners where user_id = auth.uid() for update;
  if not found then
    raise exception 'NOT_A_PRACTITIONER';
  end if;
  if v_prac.is_active = false or v_prac.status = 'SUSPENDED' then
    raise exception 'PRACTITIONER_SUSPENDED';
  end if;
  if v_prac.status = 'IN_CALL' then
    raise exception 'PRACTITIONER_ALREADY_IN_CALL';
  end if;

  select specialty into v_specialty from consultations where id = p_consultation_id;
  if v_specialty is not null and not (v_specialty = any(v_prac.specialties)) then
    raise exception 'SPECIALTY_MISMATCH';
  end if;

  update consultations
    set status = 'CLAIMED', practitioner_id = v_prac.id
    where id = p_consultation_id and status = 'WAITING'
    returning * into v_row;

  if not found then
    raise exception 'ALREADY_CLAIMED';
  end if;

  update practitioners set status = 'IN_CALL' where id = v_prac.id;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'CONSULTATION_CLAIMED', 'consultation', v_row.id,
          jsonb_build_object('practitioner_id', v_prac.id));

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_set_practitioner_specialties — the only way specialties change,
-- same SECURITY DEFINER pattern as admin_set_practitioner_active.
-- ---------------------------------------------------------------------
create or replace function admin_set_practitioner_specialties(p_practitioner_id uuid, p_specialties text[])
returns practitioners
language plpgsql security definer set search_path = public as $$
declare
  v_row practitioners;
begin
  if not is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_specialties is null or array_length(p_specialties, 1) is null then
    raise exception 'AT_LEAST_ONE_SPECIALTY_REQUIRED';
  end if;
  if not (p_specialties <@ array['GENERAL_PRACTITIONER','NUTRITIONIST','PSYCHOLOGIST']::text[]) then
    raise exception 'INVALID_SPECIALTY';
  end if;

  update practitioners
    set specialties = p_specialties
    where id = p_practitioner_id
    returning * into v_row;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'PRACTITIONER_SPECIALTIES_UPDATED', 'practitioner', v_row.id,
          jsonb_build_object('specialties', p_specialties));

  return v_row;
end;
$$;
