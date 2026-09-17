-- Afrima Digi-Health — core schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles: one row per authenticated user, carries the role
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('PATIENT','PRACTITIONER','ADMIN')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  age int check (age is null or (age >= 0 and age <= 130)),
  gender text check (gender in ('MALE','FEMALE','OTHER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- practitioners
-- ---------------------------------------------------------------------
create table if not exists practitioners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  status text not null default 'OFFLINE' check (status in ('OFFLINE','AVAILABLE','IN_CALL','SUSPENDED')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- consultations (queue + call in one table — see spec §11: "you may
-- combine queue information into consultations")
-- ---------------------------------------------------------------------
create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete restrict,
  practitioner_id uuid references practitioners(id) on delete set null,
  status text not null default 'WAITING'
    check (status in ('WAITING','CLAIMED','IN_CALL','COMPLETED','CANCELLED','ABANDONED')),
  reason text,
  diagnosis text,
  referring_facility text,
  bmi numeric,
  waz numeric,
  daily_room_name text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultations_waiting_idx
  on consultations (created_at) where status = 'WAITING';
create index if not exists consultations_practitioner_idx on consultations (practitioner_id);
create index if not exists consultations_patient_idx on consultations (patient_id);

-- ---------------------------------------------------------------------
-- prescriptions + prescription_items (structured, not a text blob)
-- ---------------------------------------------------------------------
create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete restrict,
  practitioner_id uuid not null references practitioners(id) on delete restrict,
  diagnosis text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  medication_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text
);

create index if not exists prescription_items_prescription_idx
  on prescription_items (prescription_id);

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_patients_updated on patients;
create trigger trg_patients_updated before update on patients
  for each row execute function set_updated_at();

drop trigger if exists trg_practitioners_updated on practitioners;
create trigger trg_practitioners_updated before update on practitioners
  for each row execute function set_updated_at();

drop trigger if exists trg_consultations_updated on consultations;
create trigger trg_consultations_updated before update on consultations
  for each row execute function set_updated_at();

drop trigger if exists trg_prescriptions_updated on prescriptions;
create trigger trg_prescriptions_updated before update on prescriptions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- realtime: make sure these tables publish change events
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'consultations'
  ) then
    alter publication supabase_realtime add table consultations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'practitioners'
  ) then
    alter publication supabase_realtime add table practitioners;
  end if;
end $$;
