-- Run once in this course's Supabase SQL editor while signed in as the project owner.
-- Optional bootstrap: set hella.owner_user_id to the owner’s Auth user UUID in this SQL session.
-- Example: set hella.owner_user_id = '<owner-auth-user-uuid>';
begin;


create table if not exists public.progress (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 module_id text not null,
 completed boolean not null default false,
 completed_at timestamptz,
 unique(user_id,module_id)
);
alter table public.progress enable row level security;
revoke all on public.progress from anon;
grant select,insert,update on public.progress to authenticated;
create policy "Learners read own progress" on public.progress for select to authenticated using ((select auth.uid())=user_id);
create policy "Learners insert own progress" on public.progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Learners update own progress" on public.progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.worksheets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 worksheet_name text not null,
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 unique(user_id,worksheet_name)
);
alter table public.worksheets enable row level security;
revoke all on public.worksheets from anon;
grant select,insert,update on public.worksheets to authenticated;
create policy "Learners read own worksheets" on public.worksheets for select to authenticated using ((select auth.uid())=user_id);
create policy "Learners insert own worksheets" on public.worksheets for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Learners update own worksheets" on public.worksheets for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create schema if not exists hella_private;
revoke all on schema hella_private from public, anon;
grant usage on schema hella_private to authenticated;

create table if not exists hella_private.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','support')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table hella_private.staff enable row level security;
revoke all on hella_private.staff from anon, authenticated;

create table if not exists hella_private.staff_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);
alter table hella_private.staff_notes enable row level security;
create index if not exists hella_staff_notes_learner_idx on hella_private.staff_notes(learner_id,created_at desc);
revoke all on hella_private.staff_notes from anon, authenticated;

insert into hella_private.staff(user_id,role)
select id,'owner' from auth.users where id=nullif(current_setting('hella.owner_user_id',true),'')::uuid
on conflict (user_id) do nothing;



create or replace function hella_private.my_role() returns text
language sql stable security definer set search_path='' as $$
  select role from hella_private.staff where user_id=auth.uid() and active;
$$;

create or replace function hella_private.dashboard() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if hella_private.my_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'learners',(select count(*) from auth.users u where not exists(select 1 from hella_private.staff s where s.user_id=u.id and s.active)),
    'completions',(select count(*) from public.progress where completed),
    'worksheets',(select count(*) from public.worksheets),
    'team',(select count(*) from hella_private.staff where active),
    'recent',coalesce((select jsonb_agg(to_jsonb(r)) from (
      select u.email,p.module_id,p.completed_at from public.progress p
      join auth.users u on u.id=p.user_id where p.completed
      order by p.completed_at desc nulls last limit 10
    ) r),'[]'::jsonb)
  );
end $$;

create or replace function hella_private.learners(p_search text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if hella_private.my_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select u.id,u.email,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email) as name,
      (select count(*) from public.progress p where p.user_id=u.id and p.completed) as completed,
      (select count(*) from public.worksheets w where w.user_id=u.id) as worksheets,
      (select max(w.updated_at) from public.worksheets w where w.user_id=u.id) as updated_at
    from auth.users u
    where not exists(select 1 from hella_private.staff s where s.user_id=u.id and s.active)
      and (u.email ilike '%'||left(p_search,200)||'%' or u.raw_user_meta_data->>'full_name' ilike '%'||left(p_search,200)||'%')
    order by u.created_at desc,u.id limit 51 offset greatest(p_offset,0)
  ) r),'[]'::jsonb);
end $$;

create or replace function hella_private.learner_detail(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare staff_role text:=hella_private.my_role();
begin
  if staff_role is null then raise exception 'Staff access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'progress',coalesce((select jsonb_agg(to_jsonb(p)) from public.progress p where p.user_id=p_user),'[]'::jsonb),
    'worksheets',case when staff_role in ('owner','manager') then coalesce((select jsonb_agg(to_jsonb(w)) from public.worksheets w where w.user_id=p_user),'[]'::jsonb) else '[]'::jsonb end,
    'notes',coalesce((select jsonb_agg(to_jsonb(n)) from (select id,note,created_at from hella_private.staff_notes where learner_id=p_user order by created_at desc limit 100)n),'[]'::jsonb)
  );
end $$;

create or replace function hella_private.add_note(p_user uuid,p_note text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if hella_private.my_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
  insert into hella_private.staff_notes(learner_id,author_id,note) values(p_user,auth.uid(),trim(p_note));
end $$;

create or replace function hella_private.team() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if hella_private.my_role() is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select s.user_id,u.email,s.role from hella_private.staff s join auth.users u on u.id=s.user_id where s.active order by u.email
  )r),'[]'::jsonb);
end $$;

create or replace function hella_private.set_staff(p_email text,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare target_id uuid; target_role text;
begin
  lock table hella_private.staff in share row exclusive mode;
  if hella_private.my_role() is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  if p_role is not null and p_role not in ('owner','manager','support') then raise exception 'Choose a valid role'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(p_email));
  if target_id is null then raise exception 'This person needs an existing course account. Ask them to register, then add their email here.'; end if;
  select role into target_role from hella_private.staff where user_id=target_id and active;
  if target_role='owner' and p_role is distinct from 'owner' and (select count(*) from hella_private.staff where role='owner' and active)=1 then
    raise exception 'Keep at least one active owner';
  end if;
  if p_role is null then
    update hella_private.staff set active=false where user_id=target_id;
  else
    insert into hella_private.staff(user_id,role,active) values(target_id,p_role,true)
    on conflict(user_id) do update set role=excluded.role,active=true;
  end if;
end $$;

revoke all on function hella_private.my_role() from public, anon;
revoke all on function hella_private.dashboard() from public, anon;
revoke all on function hella_private.learners(text,integer) from public, anon;
revoke all on function hella_private.learner_detail(uuid) from public, anon;
revoke all on function hella_private.add_note(uuid,text) from public, anon;
revoke all on function hella_private.team() from public, anon;
revoke all on function hella_private.set_staff(text,text) from public, anon;
grant execute on function hella_private.my_role(), hella_private.dashboard(), hella_private.learners(text,integer), hella_private.learner_detail(uuid), hella_private.add_note(uuid,text), hella_private.team(), hella_private.set_staff(text,text) to authenticated;

create or replace function public.hella_my_role() returns text
language sql security invoker set search_path='' as $$ select hella_private.my_role(); $$;
revoke all on function public.hella_my_role() from public, anon;
grant execute on function public.hella_my_role() to authenticated;

create or replace function public.hella_dashboard() returns jsonb
language sql security invoker set search_path='' as $$ select hella_private.dashboard(); $$;
revoke all on function public.hella_dashboard() from public, anon;
grant execute on function public.hella_dashboard() to authenticated;

create or replace function public.hella_learners(p_search text default '',p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$ select hella_private.learners(p_search,p_offset); $$;
revoke all on function public.hella_learners(text,integer) from public, anon;
grant execute on function public.hella_learners(text,integer) to authenticated;

create or replace function public.hella_learner_detail(p_user uuid) returns jsonb
language sql security invoker set search_path='' as $$ select hella_private.learner_detail(p_user); $$;
revoke all on function public.hella_learner_detail(uuid) from public, anon;
grant execute on function public.hella_learner_detail(uuid) to authenticated;

create or replace function public.hella_add_note(p_user uuid,p_note text) returns void
language sql security invoker set search_path='' as $$ select hella_private.add_note(p_user,p_note); $$;
revoke all on function public.hella_add_note(uuid,text) from public, anon;
grant execute on function public.hella_add_note(uuid,text) to authenticated;

create or replace function public.hella_team() returns jsonb
language sql security invoker set search_path='' as $$ select hella_private.team(); $$;
revoke all on function public.hella_team() from public, anon;
grant execute on function public.hella_team() to authenticated;

create or replace function public.hella_set_staff(p_email text,p_role text) returns void
language sql security invoker set search_path='' as $$ select hella_private.set_staff(p_email,p_role); $$;
revoke all on function public.hella_set_staff(text,text) from public, anon;
grant execute on function public.hella_set_staff(text,text) to authenticated;

commit;
