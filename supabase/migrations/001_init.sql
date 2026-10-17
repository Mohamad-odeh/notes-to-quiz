-- Notes to Quiz: database setup
-- Run this ONCE in the Supabase SQL Editor (paste it all, then click Run).
-- It creates:
--   1. the tables
--   2. indexes (to make common lookups fast)
--   3. permissions + Row Level Security (each user can only see and change their own data)
--   4. a trigger that creates a profile when someone signs up
--   5. two functions for shared quiz links (/q/[share_id])
--   6. the private "notes" storage bucket for uploaded PDFs and photos


-- =====================================================================
-- 1. Tables
-- =====================================================================

-- One row per user. Created automatically on sign-up (see section 4).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- One row per quiz.
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) <= 200),
  source_type text not null check (source_type in ('text', 'pdf', 'image')),
  language text not null check (language in ('en', 'ar')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  is_public boolean not null default false,          -- true = anyone with the share link can take it
  share_id uuid not null unique default gen_random_uuid(),  -- the secret part of the share link
  created_at timestamptz not null default now()
);

-- One row per question. Each question belongs to one quiz.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null,                             -- 1, 2, 3... (question order)
  type text not null check (type in ('multiple_choice', 'true_false')),
  question text not null,
  options jsonb not null,                            -- the answer choices, e.g. ["A", "B", "C", "D"]
  correct_answer text not null,                      -- one of the options
  explanation text not null,
  topic text not null,                               -- 2-4 words, used for "topics to review"
  created_at timestamptz not null default now()
);

-- One row each time someone finishes a quiz.
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,  -- empty for visitors without an account
  score int not null check (score >= 0),
  total int not null check (total > 0 and score <= total),
  answers jsonb not null default '[]',               -- which answer was picked for each question
  created_at timestamptz not null default now()
);

-- Thumbs up/down on a quiz, with an optional comment. One per user per quiz.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (quiz_id, user_id)
);

-- A log of every request to Claude to make a quiz. Used for the daily limit.
-- Users can't delete these rows, so deleting quizzes doesn't reset the limit.
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);


-- =====================================================================
-- 2. Indexes
-- =====================================================================

create index quizzes_user_id_created_at_idx on public.quizzes (user_id, created_at desc);
create index questions_quiz_id_position_idx on public.questions (quiz_id, position);
create index attempts_quiz_id_idx on public.attempts (quiz_id);
create index attempts_user_id_created_at_idx on public.attempts (user_id, created_at desc);
create index feedback_user_id_idx on public.feedback (user_id);
create index generations_user_id_created_at_idx on public.generations (user_id, created_at desc);


-- =====================================================================
-- 3. Permissions and Row Level Security (RLS)
-- =====================================================================
-- "anon" = visitors who are not logged in. "authenticated" = logged-in users.
-- "service_role" = the secret key, used only by our server for admin jobs.
-- Visitors get no direct table access at all. Logged-in users get only what they need,
-- and the RLS policies below limit them to their OWN rows.

revoke all on public.profiles, public.quizzes, public.questions, public.attempts,
  public.feedback, public.generations from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.quizzes to authenticated;
grant select, insert on public.questions to authenticated;
grant select, insert on public.attempts to authenticated;
grant select, insert, update on public.feedback to authenticated;
grant select, insert on public.generations to authenticated;

grant select, insert, update, delete on public.profiles, public.quizzes, public.questions,
  public.attempts, public.feedback, public.generations to service_role;

alter table public.profiles enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.feedback enable row level security;
alter table public.generations enable row level security;

-- profiles: see and update only your own profile
create policy "Users can view their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- quizzes: full control over your own quizzes only
create policy "Users can view their own quizzes" on public.quizzes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own quizzes" on public.quizzes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own quizzes" on public.quizzes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own quizzes" on public.quizzes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- questions: allowed only if the question's quiz is yours
create policy "Users can view questions of their own quizzes" on public.questions
  for select to authenticated using (
    exists (select 1 from public.quizzes q
            where q.id = quiz_id and q.user_id = (select auth.uid()))
  );
create policy "Users can add questions to their own quizzes" on public.questions
  for insert to authenticated with check (
    exists (select 1 from public.quizzes q
            where q.id = quiz_id and q.user_id = (select auth.uid()))
  );

-- attempts: see your own; save attempts on your own quizzes
-- (attempts on someone else's shared quiz go through save_shared_attempt below)
create policy "Users can view their own attempts" on public.attempts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can save attempts on their own quizzes" on public.attempts
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.quizzes q
                where q.id = quiz_id and q.user_id = (select auth.uid()))
  );

-- feedback: see, add and change your own feedback on your own quizzes
create policy "Users can view their own feedback" on public.feedback
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add feedback on their own quizzes" on public.feedback
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.quizzes q
                where q.id = quiz_id and q.user_id = (select auth.uid()))
  );
create policy "Users can update their own feedback" on public.feedback
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- generations: see and add your own (no update or delete)
create policy "Users can view their own generations" on public.generations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can log their own generations" on public.generations
  for insert to authenticated with check ((select auth.uid()) = user_id);


-- =====================================================================
-- 4. Create a profile automatically when someone signs up
-- =====================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =====================================================================
-- 5. Shared quiz links
-- =====================================================================
-- Nobody can list public quizzes. A shared quiz can only be read by someone who
-- knows its share_id, and only if the owner turned sharing on.
-- "security definer" lets these two functions read past RLS, but ONLY in the
-- limited way written here.

-- Returns one shared quiz with its questions, or nothing.
create function public.get_shared_quiz(p_share_id uuid)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select jsonb_build_object(
    'title', q.title,
    'language', q.language,
    'difficulty', q.difficulty,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qu.id,
        'type', qu.type,
        'question', qu.question,
        'options', qu.options,
        'correct_answer', qu.correct_answer,
        'explanation', qu.explanation,
        'topic', qu.topic
      ) order by qu.position)
      from public.questions qu
      where qu.quiz_id = q.id
    ), '[]'::jsonb)
  )
  from public.quizzes q
  where q.share_id = p_share_id and q.is_public;
$$;

-- Saves an attempt on a shared quiz, with or without an account.
create function public.save_shared_attempt(
  p_share_id uuid, p_score int, p_total int, p_answers jsonb
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_quiz_id uuid;
begin
  select id into v_quiz_id
  from public.quizzes
  where share_id = p_share_id and is_public;

  if v_quiz_id is null then
    raise exception 'Quiz not found';
  end if;
  if p_total < 1 or p_total > 50 or p_score < 0 or p_score > p_total then
    raise exception 'Invalid score';
  end if;
  if pg_column_size(p_answers) > 20000 then
    raise exception 'Answers too large';
  end if;

  insert into public.attempts (quiz_id, user_id, score, total, answers)
  values (v_quiz_id, auth.uid(), p_score, p_total, coalesce(p_answers, '[]'::jsonb));
end;
$$;

revoke execute on function public.get_shared_quiz(uuid) from public;
revoke execute on function public.save_shared_attempt(uuid, int, int, jsonb) from public;
grant execute on function public.get_shared_quiz(uuid) to anon, authenticated;
grant execute on function public.save_shared_attempt(uuid, int, int, jsonb) to anon, authenticated;


-- =====================================================================
-- 6. Storage: the private "notes" bucket
-- =====================================================================
-- Private = files are never public. Max 10 MB. Only PDFs and photos.
-- Each user uploads into a folder named after their user id, e.g. notes/<user id>/photo.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notes', 'notes', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

create policy "Users can upload notes to their own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'notes' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Users can read their own notes" on storage.objects
  for select to authenticated using (
    bucket_id = 'notes' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Users can delete their own notes" on storage.objects
  for delete to authenticated using (
    bucket_id = 'notes' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
