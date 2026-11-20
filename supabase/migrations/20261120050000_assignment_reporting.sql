-- Coordinators manage role and identity through the existing privileged account service.
revoke update on public.profiles from authenticated;
grant update(full_name,last_active) on public.profiles to authenticated;

create view public.visit_assignment_status with (security_invoker=true) as
select a.id as assignment_id,r.uid,a.due_date,a.scenarios,a.difficulty,
 count(distinct c.scenario_name) filter(where c.completed)=cardinality(a.scenarios) as completed,
 exists(select 1 from conversations active join messages m using(vid) where active.uid=r.uid and active.practice_context='assignment:'||a.id::text and m.sender='user') as started,
 max(m.sent_at) filter(where m.sender='user') as last_practice
from visit_assignments a join visit_recipients r on a.id=r.assignment_id
left join conversations c on c.uid=r.uid and c.practice_context='assignment:'||a.id::text and c.scenario_name=any(a.scenarios)
left join messages m on m.vid=c.vid
group by a.id,r.uid;
grant select on public.visit_assignment_status to authenticated;
