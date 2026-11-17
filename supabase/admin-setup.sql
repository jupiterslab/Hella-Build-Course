-- Run once in this course's Supabase SQL editor while signed in as the project owner.
-- First-time setup: set hella.owner_user_id to the owner’s Auth user UUID in this SQL session.
-- Example: set hella.owner_user_id = '<owner-auth-user-uuid>';
begin;

create table if not exists public.hella_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','support')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.hella_staff enable row level security;
revoke all on public.hella_staff from anon, authenticated;

create table if not exists public.hella_staff_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);
alter table public.hella_staff_notes enable row level security;
revoke all on public.hella_staff_notes from anon, authenticated;

insert into public.hella_staff(user_id,role)
select id,'owner' from auth.users where id=nullif(current_setting('hella.owner_user_id',true),'')::uuid
on conflict (user_id) do nothing;

do $$ begin
  if not exists (select 1 from public.hella_staff where role='owner' and active) then
    raise exception 'Set hella.owner_user_id to an existing owner Auth user UUID before admin setup.';
  end if;
end $$;

create or replace function public.hella_my_role() returns text
language sql stable security definer set search_path='' as $$
  select role from public.hella_staff where user_id=auth.uid() and active;
$$;

create or replace function public.hella_dashboard() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if public.hella_my_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'learners',(select count(*) from auth.users u where not exists(select 1 from public.hella_staff s where s.user_id=u.id and s.active)),
    'completions',(select count(*) from public.progress where completed),
    'worksheets',(select count(*) from public.worksheets),
    'team',(select count(*) from public.hella_staff where active),
    'recent',coalesce((select jsonb_agg(to_jsonb(r)) from (
      select u.email,p.module_id,p.completed_at from public.progress p
      join auth.users u on u.id=p.user_id where p.completed
      order by p.completed_at desc nulls last limit 10
    ) r),'[]'::jsonb)
  );
end $$;

create or replace function public.hella_learners(p_search text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if public.hella_my_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select u.id,u.email,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email) as name,
      (select count(*) from public.progress p where p.user_id=u.id and p.completed) as completed,
      (select count(*) from public.worksheets w where w.user_id=u.id) as worksheets,
      (select max(w.updated_at) from public.worksheets w where w.user_id=u.id) as updated_at
    from auth.users u
    where not exists(select 1 from public.hella_staff s where s.user_id=u.id and s.active)
      and (u.email ilike '%'||left(p_search,200)||'%' or u.raw_user_meta_data->>'full_name' ilike '%'||left(p_search,200)||'%')
    order by u.created_at desc,u.id limit 51 offset greatest(p_offset,0)
  ) r),'[]'::jsonb);
end $$;

create or replace function public.hella_learner_detail(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare staff_role text:=public.hella_my_role();
begin
  if staff_role is null then raise exception 'Staff access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'progress',coalesce((select jsonb_agg(to_jsonb(p)) from public.progress p where p.user_id=p_user),'[]'::jsonb),
    'worksheets',case when staff_role in ('owner','manager') then coalesce((select jsonb_agg(to_jsonb(w)) from public.worksheets w where w.user_id=p_user),'[]'::jsonb) else '[]'::jsonb end,
    'notes',coalesce((select jsonb_agg(to_jsonb(n)) from (select id,note,created_at from public.hella_staff_notes where learner_id=p_user order by created_at desc limit 100)n),'[]'::jsonb)
  );
end $$;

create or replace function public.hella_add_note(p_user uuid,p_note text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if public.hella_my_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
  insert into public.hella_staff_notes(learner_id,author_id,note) values(p_user,auth.uid(),trim(p_note));
end $$;

create or replace function public.hella_team() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if public.hella_my_role() is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select s.user_id,u.email,s.role from public.hella_staff s join auth.users u on u.id=s.user_id where s.active order by u.email
  )r),'[]'::jsonb);
end $$;

create or replace function public.hella_set_staff(p_email text,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare target_id uuid; target_role text;
begin
  lock table public.hella_staff in share row exclusive mode;
  if public.hella_my_role() is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  if p_role is not null and p_role not in ('owner','manager','support') then raise exception 'Choose a valid role'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(p_email));
  if target_id is null then raise exception 'This person needs an existing course account. Ask them to register, then add their email here.'; end if;
  select role into target_role from public.hella_staff where user_id=target_id and active;
  if target_role='owner' and p_role is distinct from 'owner' and (select count(*) from public.hella_staff where role='owner' and active)=1 then
    raise exception 'Keep at least one active owner';
  end if;
  if p_role is null then
    update public.hella_staff set active=false where user_id=target_id;
  else
    insert into public.hella_staff(user_id,role,active) values(target_id,p_role,true)
    on conflict(user_id) do update set role=excluded.role,active=true;
  end if;
end $$;

revoke all on function public.hella_my_role() from public, anon;
revoke all on function public.hella_dashboard() from public, anon;
revoke all on function public.hella_learners(text,integer) from public, anon;
revoke all on function public.hella_learner_detail(uuid) from public, anon;
revoke all on function public.hella_add_note(uuid,text) from public, anon;
revoke all on function public.hella_team() from public, anon;
revoke all on function public.hella_set_staff(text,text) from public, anon;
grant execute on function public.hella_my_role(), public.hella_dashboard(), public.hella_learners(text,integer), public.hella_learner_detail(uuid), public.hella_add_note(uuid,text), public.hella_team(), public.hella_set_staff(text,text) to authenticated;
commit;
