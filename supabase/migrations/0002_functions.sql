-- Afrima Digi-Health — server-side state transitions.
--
-- Every privileged transition (claim, end, admin actions) lives here as a
-- SECURITY DEFINER function rather than a generic RLS "update" policy, so
-- the *only* way to move a consultation between states is through logic
-- that re-checks the precondition atomically. Next.js API routes call
-- these via supabase-js using the caller's own session (never the
-- service-role key), so auth.uid() below is always the real caller.

create or replace function current_profile_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where user_id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_profile_role() = 'ADMIN', false);
$$;

-- Generic audit-log writer for routes that don't already go through one
-- of the dedicated SECURITY DEFINER functions below (e.g. prescription
-- creation, which is otherwise just a plain RLS-scoped insert). Any
-- signed-in user can call this, but it only ever logs THEIR OWN
-- auth.uid() and a fixed vocabulary of actions — it cannot be used to
-- forge an entry attributed to someone else or to read anything.
create or replace function log_audit_event(p_action text, p_target_type text, p_target_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_action not in ('PRESCRIPTION_CREATED') then
    raise exception 'UNKNOWN_ACTION';
  end if;
  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- claim_consultation — THE critical concurrency-safe operation (spec §9).
--
-- The UPDATE ... WHERE status = 'WAITING' is what makes this safe: Postgres
-- takes a row lock on the first transaction to reach it, and any concurrent
-- transaction either blocks and then sees status already flipped (so its
-- WHERE no longer matches, 0 rows updated) or simply doesn't match to begin
-- with. There is no separate "check then update" — the check IS the update.
-- ---------------------------------------------------------------------
create or replace function claim_consultation(p_consultation_id uuid)
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
-- start_call — CLAIMED -> IN_CALL, once the Daily room is ready. Kept
-- separate from claim so room creation (an external API call) never has
-- to happen inside the same transaction as the atomic claim itself.
-- ---------------------------------------------------------------------
create or replace function start_call(p_consultation_id uuid, p_daily_room_name text)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_row consultations;
begin
  update consultations c
    set status = 'IN_CALL', daily_room_name = p_daily_room_name, started_at = now()
    where c.id = p_consultation_id
      and c.status = 'CLAIMED'
      and exists (select 1 from practitioners pr where pr.id = c.practitioner_id and pr.user_id = auth.uid())
    returning * into v_row;

  if not found then
    raise exception 'INVALID_STATE_FOR_START';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- end_consultation — practitioner ends their own active call.
-- Idempotent: ending an already-COMPLETED call is a no-op, not an error,
-- so duplicate end requests (spec §32) can't race each other into a bad
-- state — the second caller just gets back the already-completed row.
-- ---------------------------------------------------------------------
create or replace function end_consultation(p_consultation_id uuid)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_row consultations;
  v_prac_id uuid;
begin
  select id into v_prac_id from practitioners where user_id = auth.uid();

  select * into v_row from consultations where id = p_consultation_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status = 'COMPLETED' then
    return v_row; -- already ended, e.g. by admin — idempotent no-op
  end if;
  if v_row.practitioner_id is distinct from v_prac_id and not is_admin() then
    raise exception 'NOT_YOUR_CONSULTATION';
  end if;

  update consultations
    set status = 'COMPLETED',
        ended_at = now(),
        duration_seconds = extract(epoch from (now() - coalesce(started_at, now())))::int
    where id = p_consultation_id
    returning * into v_row;

  if v_row.practitioner_id is not null then
    update practitioners
      set status = 'AVAILABLE'
      where id = v_row.practitioner_id and status <> 'SUSPENDED';
  end if;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'CONSULTATION_ENDED', 'consultation', v_row.id,
          jsonb_build_object('duration_seconds', v_row.duration_seconds));

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_end_consultation — same idempotent shape, admin-only, logged
-- distinctly so the audit trail shows who actually ended it.
-- ---------------------------------------------------------------------
create or replace function admin_end_consultation(p_consultation_id uuid)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_row consultations;
begin
  if not is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_row from consultations where id = p_consultation_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status = 'COMPLETED' or v_row.status = 'CANCELLED' then
    return v_row;
  end if;

  update consultations
    set status = 'COMPLETED',
        ended_at = now(),
        duration_seconds = extract(epoch from (now() - coalesce(started_at, now())))::int
    where id = p_consultation_id
    returning * into v_row;

  if v_row.practitioner_id is not null then
    update practitioners
      set status = 'AVAILABLE'
      where id = v_row.practitioner_id and status <> 'SUSPENDED';
  end if;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'CONSULTATION_ENDED_BY_ADMIN', 'consultation', v_row.id, '{}'::jsonb);

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- cancel_waiting_consultation — admin removes a patient from the queue,
-- OR a patient leaves the queue themselves (spec §7 "[Leave Queue]").
-- Only touches rows still WAITING, so it can't clobber a call that was
-- claimed a moment earlier.
-- ---------------------------------------------------------------------
create or replace function cancel_waiting_consultation(p_consultation_id uuid)
returns consultations
language plpgsql security definer set search_path = public as $$
declare
  v_row consultations;
  v_is_owner boolean;
begin
  select exists(
    select 1 from patients p
    join consultations c on c.patient_id = p.id
    where c.id = p_consultation_id and p.user_id = auth.uid()
  ) into v_is_owner;

  if not is_admin() and not v_is_owner then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update consultations
    set status = 'CANCELLED'
    where id = p_consultation_id and status = 'WAITING'
    returning * into v_row;

  if not found then
    raise exception 'NOT_WAITING';
  end if;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when is_admin() and not v_is_owner then 'PATIENT_REMOVED_FROM_QUEUE' else 'PATIENT_LEFT_QUEUE' end,
    'consultation', v_row.id, '{}'::jsonb
  );

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- set_practitioner_status — self-service AVAILABLE/OFFLINE toggle. Can't
-- be used to escape IN_CALL or SUSPENDED from the outside.
-- ---------------------------------------------------------------------
create or replace function set_practitioner_status(p_status text)
returns practitioners
language plpgsql security definer set search_path = public as $$
declare
  v_row practitioners;
begin
  if p_status not in ('AVAILABLE','OFFLINE') then
    raise exception 'INVALID_STATUS';
  end if;

  update practitioners
    set status = p_status
    where user_id = auth.uid() and status not in ('IN_CALL','SUSPENDED')
    returning * into v_row;

  if not found then
    raise exception 'CANNOT_CHANGE_STATUS';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_set_practitioner_active — suspend / reactivate (soft delete,
-- spec §16: never hard-delete a practitioner with history).
-- ---------------------------------------------------------------------
create or replace function admin_set_practitioner_active(p_practitioner_id uuid, p_active boolean)
returns practitioners
language plpgsql security definer set search_path = public as $$
declare
  v_row practitioners;
begin
  if not is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update practitioners
    set is_active = p_active,
        status = case when p_active then 'OFFLINE' else 'SUSPENDED' end
    where id = p_practitioner_id
    returning * into v_row;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  insert into audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), case when p_active then 'PRACTITIONER_REACTIVATED' else 'PRACTITIONER_SUSPENDED' end,
          'practitioner', v_row.id, '{}'::jsonb);

  return v_row;
end;
$$;
