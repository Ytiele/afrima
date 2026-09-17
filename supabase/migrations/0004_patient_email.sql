-- Lets the quick-start homepage look up an existing patient by email
-- (server-side, via the admin client) without needing to page through
-- auth.users. Nullable + unique-when-present so it doesn't disturb any
-- patient row created before this column existed.
alter table patients add column if not exists email text;
create unique index if not exists patients_email_idx on patients (lower(email)) where email is not null;
