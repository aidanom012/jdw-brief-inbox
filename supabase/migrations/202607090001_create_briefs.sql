create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'received' check (
    status in (
      'received',
      'incomplete',
      'ready_to_build',
      'building',
      'needs_james',
      'done'
    )
  ),
  artist text,
  release_title text,
  acid text,
  platform text,
  account text,
  objective text,
  raw_json jsonb not null,
  missing_required_fields text[] default '{}',
  internal_notes text default '',
  submitted_by text default 'james' check (submitted_by in ('aidan', 'james')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references briefs(id) on delete cascade,
  label text not null,
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create index if not exists briefs_status_idx on briefs(status);
create index if not exists briefs_created_at_idx on briefs(created_at desc);
create index if not exists briefs_acid_idx on briefs(acid);
create index if not exists checklist_items_brief_id_idx on checklist_items(brief_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists briefs_set_updated_at on briefs;

create trigger briefs_set_updated_at
before update on briefs
for each row
execute function set_updated_at();
