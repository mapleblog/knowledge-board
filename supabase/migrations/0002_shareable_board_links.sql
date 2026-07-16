-- v2.0 (8.3) — Shareable read-only board links.
-- Adds an opt-in share token per board + a SINGLE controlled public read path.
-- Additive, non-destructive. Safe to run on the live project.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor (project bruzjjsqcmmzptamkhrw)
-- and run. Mirrored in ../schema.sql. Must be applied before /share/[token] works.
--
-- SECURITY MODEL: this is the app's first public (unauthenticated) read path.
-- Table RLS stays owner-only — it is NOT loosened. The only way an anon visitor
-- can read a board is through get_shared_board(token), a security-definer
-- function that (a) matches on the unguessable share_token, (b) returns ONLY
-- safe read-only fields (no user_id, no attachments, no share_token itself),
-- and (c) is granted to anon/authenticated only (revoked from PUBLIC broadly).
-- Revoking a share = setting share_token back to NULL (or rotating it).

-- null = private (default); a random uuid = "anyone with the link can view".
alter table public.boards
  add column if not exists share_token uuid unique;

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

-- Lock execute down to the two Supabase roles that actually need it.
revoke all on function public.get_shared_board(uuid) from public;
grant execute on function public.get_shared_board(uuid) to anon, authenticated;
