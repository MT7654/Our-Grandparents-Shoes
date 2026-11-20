-- A user message is the intentional turn for both typed and button input.
create index if not exists practice_message_period on public.messages(sent_at, vid) where sender = 'user';

create function public.practice_usage(first_day date, last_day date, scenario_filter public.scenario_name default null, cohort_filter uuid default null)
returns table(kind text, label text, starts date, ends date, participants bigint, eligible bigint, sessions bigint)
language sql stable security invoker set search_path = public, pg_catalog as $$
with periods as (
  select 'period' kind, 'Selected period' label, first_day starts, last_day ends, scenario_filter scenario
  union all
  select 'month', to_char(m,'YYYY-MM'), greatest(first_day,m::date),
    least(last_day,(m + interval '1 month - 1 day')::date), scenario_filter
  from generate_series(date_trunc('month',first_day::timestamp),last_day::timestamp,interval '1 month') m
  union all
  select 'scenario', s::text, first_day, last_day, s
  from unnest(enum_range(null::public.scenario_name)) s where scenario_filter is null or s=scenario_filter
), activity as (
  select c.uid,c.vid,c.scenario_name,m.sent_at,(m.sent_at at time zone 'Asia/Singapore')::date as practice_day
  from messages m join conversations c using(vid)
  where m.sender='user' and m.sent_at >= (first_day::timestamp at time zone 'Asia/Singapore')
    and m.sent_at < ((last_day+1)::timestamp at time zone 'Asia/Singapore')
)
select p.kind,p.label,p.starts,p.ends,count(distinct a.uid),count(distinct v.user_id),count(distinct a.vid)
from periods p left join profiles v on v.role='user' and v.created_at < ((p.ends+1)::timestamp at time zone 'Asia/Singapore')
and (cohort_filter is null or exists(select 1 from visit_memberships m where m.uid=v.user_id and m.cohort_id=cohort_filter and m.joined_at < ((p.ends+1)::timestamp at time zone 'Asia/Singapore') and coalesce(m.left_at,'infinity') > (p.starts::timestamp at time zone 'Asia/Singapore')))
left join activity a on a.uid=v.user_id and a.practice_day between p.starts and p.ends and (p.scenario is null or p.scenario=a.scenario_name)
and (cohort_filter is null or exists(select 1 from visit_memberships m where m.uid=a.uid and m.cohort_id=cohort_filter and a.sent_at >= m.joined_at and a.sent_at < coalesce(m.left_at,'infinity')))
where exists(select 1 from profiles where user_id=auth.uid() and role='admin')
group by p.kind,p.label,p.starts,p.ends order by p.kind,p.starts,p.label
$$;
revoke all on function public.practice_usage(date,date,public.scenario_name,uuid) from public;
grant execute on function public.practice_usage(date,date,public.scenario_name,uuid) to authenticated;
