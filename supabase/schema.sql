-- Knowledge Board — database schema (PRD §4)
-- Run in the Supabase SQL editor. Auth users are managed by Supabase Auth;
-- boards/cards/attachments below are owner-scoped via Row-Level Security.

-- ---------- Tables ----------

create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  color       text not null default '#4f46e5',
  created_at  timestamptz not null default now()
);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  url         text,
  status      text not null default 'todo'
                check (status in ('todo', 'in_progress', 'done')),
  -- Fractional index so a single drag only rewrites the moved row.
  order_index double precision not null default 0,
  icon        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.attachments (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.cards (id) on delete cascade,
  file_path  text not null,
  file_name  text not null,
  file_size  bigint not null,
  mime_type  text not null
);

create index if not exists cards_board_order_idx
  on public.cards (board_id, order_index);
create index if not exists attachments_card_idx
  on public.attachments (card_id);

-- ---------- Row-Level Security ----------

alter table public.boards      enable row level security;
alter table public.cards       enable row level security;
alter table public.attachments enable row level security;

-- Boards: a user only sees and edits their own.
create policy "own boards" on public.boards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cards: owned transitively through the parent board.
create policy "own cards" on public.cards
  for all using (
    exists (select 1 from public.boards b
            where b.id = cards.board_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.boards b
            where b.id = cards.board_id and b.user_id = auth.uid())
  );

-- Attachments: owned transitively through card → board.
create policy "own attachments" on public.attachments
  for all using (
    exists (select 1 from public.cards c
            join public.boards b on b.id = c.board_id
            where c.id = attachments.card_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.cards c
            join public.boards b on b.id = c.board_id
            where c.id = attachments.card_id and b.user_id = auth.uid())
  );

-- ---------- updated_at trigger ----------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_touch_updated_at on public.cards;
create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.touch_updated_at();

-- ---------- Storage (attachments) ----------
-- Manual step: create a private bucket named "attachments" (Storage → New
-- bucket, "Public" OFF) in the Supabase dashboard, then run the policies
-- below. Objects are stored as "{card_id}/{uuid}-{filename}", so ownership
-- is checked by tracing the card_id path segment back to the owning board.

create policy "own attachment objects select" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.cards c
      join public.boards b on b.id = c.board_id
      where c.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  );

create policy "own attachment objects insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.cards c
      join public.boards b on b.id = c.board_id
      where c.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  );

create policy "own attachment objects delete" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.cards c
      join public.boards b on b.id = c.board_id
      where c.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  );
