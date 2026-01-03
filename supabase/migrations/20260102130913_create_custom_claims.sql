-- Create the auth hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
  declare
    claims jsonb;
    user_role public."Roles";
  begin
    -- Fetch the user role in the profiles table
    select role into user_role from public.profiles where user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    if user_role is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    else
      claims := jsonb_set(claims, '{user_role}', 'null');
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

grant all
  on table public.profiles
to supabase_auth_admin;

revoke all
  on table public.profiles
  from authenticated, anon, public;

grant SELECT, UPDATE
  on table public.profiles
  to authenticated;

-- create policy "Allow auth admin to read user roles" ON public.profiles
-- as permissive for select
-- to supabase_auth_admin
-- using (true);

-- Register your custom claims function for JWT
select auth.jwt_set_custom_claims_function('public.custom_access_token_hook');

