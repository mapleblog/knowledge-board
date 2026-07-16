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
  -- null = private; a random uuid = "anyone with the link can view" (read-only).
  -- Exposed publicly only through get_shared_board() below, never via RLS.
  share_token uuid unique,
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
  -- Known limits (accepted for MVP, revisit post-MVP):
  --  * No rebalancing: each drop between two neighbors halves the gap, so
  --    ~50 consecutive drops into the same gap exhaust double precision and
  --    two rows end up with equal indexes (order then falls back to row
  --    order, unstable). Fix if hit: renumber the board's cards 1..n.
  --  * New cards are appended as max(order_index)+1 via a read-then-insert
  --    (src/lib/card-actions.ts), which can race across two sessions and
  --    produce duplicate indexes. Harmless beyond nondeterministic ordering
  --    of the two cards; the next drag of either card resolves it.
  order_index double precision not null default 0,
  icon        text,
  -- Free-form labels for filtering. Normalized app-side (lowercase, trimmed,
  -- deduped, length/count-capped) in src/lib/types.ts + card-actions.ts.
  tags        text[] not null default '{}',
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
create index if not exists cards_tags_gin
  on public.cards using gin (tags);
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

-- search_path pinned empty so the trigger can't be hijacked by objects in a
-- schema that shadows pg_catalog names (Supabase security advisor).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_touch_updated_at on public.cards;
create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.touch_updated_at();

-- ---------- Shareable read-only board links (v2.0) ----------
-- The app's only public (unauthenticated) read path. Table RLS above stays
-- owner-only; this security-definer function is the single controlled way an
-- anon visitor reads a board — matched on the unguessable share_token, and
-- returning only safe read-only fields (no user_id, no attachments, no token).
-- Granted to anon/authenticated only; revoke a share by nulling share_token.
create or replace function public.get_shared_board(share_token uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'description', b.description,
    'color', b.color,
    'cards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'url', c.url,
          'status', c.status,
          'tags', c.tags,
          'order_index', c.order_index
        ) order by c.order_index asc
      )
      from public.cards c
      where c.board_id = b.id
    ), '[]'::jsonb)
  )
  from public.boards b
  where b.share_token = get_shared_board.share_token
  limit 1;
$$;

revoke all on function public.get_shared_board(uuid) from public;
grant execute on function public.get_shared_board(uuid) to anon, authenticated;

-- ---------- Storage (attachments) ----------
-- Manual step: create a private bucket named "attachments" (Storage → New
-- bucket, "Public" OFF) in the Supabase dashboard, then run the policies
-- below. Objects are stored as "{card_id}/{uuid}-{filename}", so ownership
-- is checked by tracing the card_id path segment back to the owning board.
-- NB: the object path must be written as "objects.name" — an unqualified
-- "name" resolves to boards.name inside the EXISTS subquery and the check
-- always fails (fixed live via migration
-- fix_attachment_policies_qualify_object_name).

create policy "own attachment objects select" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.cards c
      join public.boards b on b.id = c.board_id
      where c.id::text = (storage.foldername(objects.name))[1]
        and b.user_id = auth.uid()
    )
  );

create policy "own attachment objects insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.cards c
      join public.boards b on b.id = c.board_id
      where c.id::text = (storage.foldername(objects.name))[1]
        and b.user_id = auth.uid()
    )
  );

create policy "own attachment objects delete" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.cards c
      join public.boards b on b.id = c.board_id
      where c.id::text = (storage.foldername(objects.name))[1]
        and b.user_id = auth.uid()
    )
  );
