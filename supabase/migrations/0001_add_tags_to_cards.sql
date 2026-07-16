-- v2.0 (8.2) — Card tagging.
-- Additive, non-destructive: adds a defaulted tags array + a GIN index for
-- "cards having tag X" lookups. Safe to run on the live project.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor (project bruzjjsqcmmzptamkhrw)
-- and run. Mirrored in ../schema.sql. Must be applied before the tag UI works —
-- the app writes cards.tags on create/update.

alter table public.cards
  add column if not exists tags text[] not null default '{}';

create index if not exists cards_tags_gin
  on public.cards using gin (tags);
