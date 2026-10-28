create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null,
  description text not null default '',
  due_date date,
  priority varchar(10) not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_created_at_idx
on public.tasks (created_at desc);

create index if not exists tasks_completed_idx
on public.tasks (completed);

alter table public.tasks enable row level security;

create or replace function public.update_task_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;

create trigger tasks_updated_at
before update on public.tasks
for each row
execute function public.update_task_timestamp();