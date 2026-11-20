create table public.visit_turns (
 id uuid primary key, vid uuid not null references public.conversations on delete cascade,
 reply_id uuid not null, version smallint not null default 1, action_label text, scene_event text,
 evaluated boolean not null default false, submitted_at timestamptz not null default now()
);
alter table public.visit_turns enable row level security;
create policy review on public.visit_turns for select to authenticated using(exists(select 1 from conversations c where c.vid=visit_turns.vid and (c.uid=auth.uid() or is_admin(auth.uid()))));
create function public.commit_visit_turn(owner_id uuid, visit_id uuid, turn_id uuid, previous_id uuid, volunteer_text text, reply_text text, action_text text, event_name text, ending boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare c conversations; receipt visit_turns; volunteer messages; reply messages; last_id uuid;
begin
 select * into strict c from conversations where uid=owner_id and vid=visit_id for update;
 select * into receipt from visit_turns where id=turn_id and vid=visit_id;
 if found then
   select * into strict volunteer from messages where vid=visit_id and mid=turn_id;
   if volunteer.content<>volunteer_text then raise exception 'Turn ID conflict'; end if;
   select * into strict reply from messages where vid=visit_id and mid=receipt.reply_id;
 else
   select mid into last_id from messages where vid=visit_id order by sent_at desc,mid desc limit 1;
   if previous_id is distinct from last_id or c.completed then raise exception 'Visit changed. Resume to continue.'; end if;
   insert into messages(vid,mid,sender,content,sent_at) values(visit_id,turn_id,'user',volunteer_text,clock_timestamp()) returning * into volunteer;
   insert into messages(vid,sender,content,sent_at) values(visit_id,'persona',reply_text,greatest(clock_timestamp(),volunteer.sent_at+interval '1 microsecond')) returning * into reply;
   insert into visit_turns(id,vid,reply_id,action_label,scene_event) values(turn_id,visit_id,reply.mid,action_text,event_name) returning * into receipt;
   update conversations set turns=greatest(0,turns-1),completed=ending,objective_met=ending where vid=visit_id returning * into c;
 end if;
 return jsonb_build_object('user_message',to_jsonb(volunteer),'persona_message',to_jsonb(reply),'completed',c.completed,'turns',c.turns,'pendingEvaluation',not receipt.evaluated);
end $$;
revoke all on function public.commit_visit_turn(uuid,uuid,uuid,uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.commit_visit_turn(uuid,uuid,uuid,uuid,text,text,text,text,boolean) to service_role;
create function public.assess_visit_turn(visit_id uuid,turn_id uuid,reply_id_arg uuid,verdict jsonb,starting integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare receipt visit_turns; assessment evaluations; c conversations;
begin
 select * into strict c from conversations where vid=visit_id for update;
 select * into strict receipt from visit_turns where id=turn_id and vid=visit_id and reply_id=reply_id_arg;
 select * into assessment from evaluations where vid=visit_id;
 if not receipt.evaluated then
   update messages set feedback=left(verdict->>'feedback',255),status=(verdict->>'status')::message_status where vid=visit_id and mid=turn_id;
   if not exists(select 1 from visit_turns where vid=visit_id and evaluated and submitted_at>receipt.submitted_at) then
     insert into evaluations(vid,expression,sentiment,suggestion,rapport)
     values(visit_id,(verdict->>'expression')::eval_new_expression,(verdict->>'sentiment')::eval_sentiment,verdict->>'suggestion',
       greatest(0,least(100,coalesce(assessment.rapport,starting)+(verdict->>'rapportChange')::int)))
     on conflict(vid) do update set expression=excluded.expression,sentiment=excluded.sentiment,suggestion=excluded.suggestion,rapport=excluded.rapport returning * into assessment;
   end if;
   update visit_turns set evaluated=true where id=turn_id;
 end if;
 return jsonb_build_object('evaluation',to_jsonb(assessment),'completed',c.completed,'turns',c.turns);
end $$;
revoke all on function public.assess_visit_turn(uuid,uuid,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.assess_visit_turn(uuid,uuid,uuid,jsonb,integer) to service_role;
