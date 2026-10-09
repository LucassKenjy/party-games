-- Run this in the Supabase SQL editor for your project.
-- Minimal schema: just enough to keep a history of finished rounds.

create table if not exists rounds (
  id bigint generated always as identity primary key,
  room_code text not null,
  impostor_player_id text not null,
  caught boolean not null,
  word text not null,
  theme text not null,
  vote_tally jsonb not null,
  scores jsonb not null,
  created_at timestamptz not null default now()
);
