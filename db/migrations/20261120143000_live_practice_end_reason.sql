-- Backwards-compatible with older deployments and previously completed visits.
alter table public.conversations
  add column end_reason text
  check (end_reason in ('objective_met','boundary','turn_limit','ended_early'));
