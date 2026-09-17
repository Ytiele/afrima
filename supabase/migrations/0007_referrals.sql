-- Afrima Digi-Health — referral consultations (hospital referral + M-Pesa
-- payment verification) and a proper, RLS-safe "my position in queue".
--
-- A referral submission is just a consultation with is_referral = true and
-- payment_verified = false — it sits at status = 'WAITING' like any other
-- queue entry (no new status value needed), but claim_consultation refuses
-- to hand it out until a practitioner runs verify_referral_and_claim,
-- which checks it and claims it in the same atomic step.

alter table consultations
  add column if not exists is_referral boolean not null default false,
  add column if not exists referral_hospital text,
  add column if not exists referral_doctor_name text,
  add column if not exists referral_doctor_number text,
  add column if not exists mpesa_code text,
  add column if not exists payment_verified boolean not null default true;

-- ---------------------------------------------------------------------
-- claim_consultation — now also refuses an unverified referral (defense
-- in depth; the practitioner UI never offers the plain "Answer" button
-- for one of these, only "Verify & Accept" via the function below).
-- ---------------------------------------------------------------------
create or replace function claim_consultation(p_consultation_id uuid)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_prac practitioners;
  v_target consultations;
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

  select * into v_target from consultations where id = p_consultation_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_target.is_referral and not v_target.payment_verified then
    raise exception 'PAYMENT_NOT_VERIFIED';
  end if;
  if v_target.specialty is not null and not (v_target.specialty = any(v_prac.specialties)) then
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
-- verify_referral_and_claim — the one action a practitioner takes on a
-- referral submission: checking the M-Pesa code IS the acceptance, so
-- verifying and claiming happen in the same atomic UPDATE ... WHERE,
-- giving the same "first to act wins" guarantee as claim_consultation.
-- ---------------------------------------------------------------------
create or replace function verify_referral_and_claim(p_consultation_id uuid)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_prac practitioners;
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

  update consultations
    set status = 'CLAIMED', practitioner_id = v_prac.id, payment_verified = true
    where id = p_consultation_id and status = 'WAITING' and is_referral and not payment_verified
    returning * into v_row;

  if not found then
    raise exception 'ALREADY_CLAIMED';
  end if;

  update practitioners set status = 'IN_CALL' where id = v_prac.id;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'REFERRAL_VERIFIED_AND_CLAIMED', 'consultation', v_row.id,
          jsonb_build_object('practitioner_id', v_prac.id, 'mpesa_code', v_row.mpesa_code));

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- my_queue_position — lets a WAITING patient see their own position for
-- the personalized "you're next" message, without granting them any
-- visibility into anyone else's row (RLS still hides those from a plain
-- select; this runs as SECURITY DEFINER but re-checks ownership itself).
-- ---------------------------------------------------------------------
create or replace function my_queue_position(p_consultation_id uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_target consultations;
  v_position int;
begin
  select c.* into v_target
  from consultations c
  join patients p on p.id = c.patient_id
  where c.id = p_consultation_id and p.user_id = auth.uid();

  if not found or v_target.status <> 'WAITING' then
    return null;
  end if;

  select count(*) + 1 into v_position
  from consultations c2
  where c2.status = 'WAITING'
    and c2.created_at < v_target.created_at
    and c2.is_referral = v_target.is_referral
    and (
      (v_target.specialty is null and c2.specialty is null)
      or c2.specialty = v_target.specialty
    );

  return v_position;
end;
$$;
