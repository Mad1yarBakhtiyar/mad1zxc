-- Run once in Supabase SQL Editor. Server-only tables; do NOT expose service role key.
create extension if not exists pgcrypto;
create table if not exists public.skas_accounts (
  id integer primary key,
  full_name text not null,
  group_name text,
  role text not null check(role in ('student','teacher')),
  pin_hash text not null
);
create table if not exists public.skas_teacher_subjects (
  teacher_id integer not null references public.skas_accounts(id),
  subject_id integer not null check(subject_id between 1 and 7),
  primary key (teacher_id,subject_id)
);
create table if not exists public.skas_messages (
  id bigint generated always as identity primary key,
  student_id integer not null references public.skas_accounts(id),
  teacher_id integer not null references public.skas_accounts(id),
  subject_id integer not null check(subject_id between 1 and 7),
  lesson_id text,
  sender_id integer not null references public.skas_accounts(id),
  body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint sender_in_chat check(sender_id in (student_id,teacher_id))
);
create index if not exists skas_messages_thread on public.skas_messages(student_id,teacher_id,subject_id,created_at);
create table if not exists public.skas_lesson_progress (
  student_id integer not null references public.skas_accounts(id),
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key(student_id,lesson_id)
);
alter table public.skas_accounts enable row level security;
alter table public.skas_teacher_subjects enable row level security;
alter table public.skas_messages enable row level security;
alter table public.skas_lesson_progress enable row level security;
-- No client policies. Only Vercel server function with service role can access.
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (1,'Абдрагимов Даниял','БҚ-332','student',crypt('0001',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (2,'Айдаров Бахытжан','БҚ-332','student',crypt('0002',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (3,'Амангелды Муратали','БҚ-332','student',crypt('0003',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (4,'Бахтиярұлы Мадияр','БҚ-332','student',crypt('0004',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (5,'Болатұлы Нариман','БҚ-332','student',crypt('0005',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (6,'Мұрат Болат','БҚ-332','student',crypt('0006',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (7,'Сабитбек Абурахман','БҚ-332','student',crypt('0007',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,group_name,role,pin_hash) values (8,'Турсунмахамет Абдулазиз','БҚ-332','student',crypt('0008',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name,group_name=excluded.group_name;
insert into public.skas_accounts(id,full_name,role,pin_hash) values (101,'Сираждин Камиль Нариманович', 'teacher',crypt('5578',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (101,1) on conflict do nothing;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (101,2) on conflict do nothing;
insert into public.skas_accounts(id,full_name,role,pin_hash) values (102,'Елубай Ерасыл Жасұзақұлы', 'teacher',crypt('2552',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (102,3) on conflict do nothing;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (102,4) on conflict do nothing;
insert into public.skas_accounts(id,full_name,role,pin_hash) values (103,'Тулеген Аида Талапқызы', 'teacher',crypt('3609',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (103,5) on conflict do nothing;
insert into public.skas_accounts(id,full_name,role,pin_hash) values (104,'Сағидуллиев Айдар Асқарұлы', 'teacher',crypt('4211',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (104,6) on conflict do nothing;
insert into public.skas_accounts(id,full_name,role,pin_hash) values (105,'Хамзин Альтаир Айдарұлы', 'teacher',crypt('9723',gen_salt('bf',10))) on conflict(id) do update set full_name=excluded.full_name;
insert into public.skas_teacher_subjects(teacher_id,subject_id) values (105,7) on conflict do nothing;

create or replace function public.skas_verify_pin(account_id integer,submitted_pin text)
returns boolean language sql security definer set search_path=public as $$
 select exists(select 1 from public.skas_accounts where id=account_id and pin_hash=crypt(submitted_pin,pin_hash));
$$;
revoke all on function public.skas_verify_pin(integer,text) from public,anon,authenticated;
grant execute on function public.skas_verify_pin(integer,text) to service_role;
