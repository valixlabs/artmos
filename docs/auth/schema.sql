-- ARTMOS 회원 정보 (Supabase / Postgres) — 초안. 계정·비밀번호는 Supabase Auth(auth.users)가 보관.
-- 여기에는 항해명(닉네임)·동의 기록만. 항해명은 대소문자·띄어쓰기를 무시하고 겹치지 않게(유일).
create extension if not exists citext;

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  nick_key    text generated always as (lower(regexp_replace(btrim(nickname), '\s+', ' ', 'g'))) stored,
  marketing   boolean not null default false,     -- [선택] 새 전시·이벤트 소식
  marketing_at timestamptz,                        -- 소식 받기 동의(또는 거부)를 정한 시각
  agreed_at   timestamptz,                         -- 필수 약관 동의 시각 (소셜 첫 가입은 비어 있다가 동의 화면에서 채움)
  lang        text,
  created_at  timestamptz not null default now(),
  constraint nickname_len check (nickname is null or char_length(btrim(nickname)) between 2 and 20)
);
create unique index if not exists profiles_nick_unique on public.profiles (nick_key) where nickname is not null;

alter table public.profiles enable row level security;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 가입하면 profiles 한 줄 자동 생성 (이메일 가입 때 보낸 동의 기록을 옮김)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, marketing, marketing_at, agreed_at, lang)
  values (new.id,
          coalesce((new.raw_user_meta_data->>'marketing')::boolean, false),
          (new.raw_user_meta_data->>'agreed_at')::timestamptz,
          (new.raw_user_meta_data->>'agreed_at')::timestamptz,   -- 이메일 가입 폼에서 받은 동의. 소셜은 null → 앱이 동의 화면을 띄움
          new.raw_user_meta_data->>'lang');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 항해명 쓸 수 있나? (다른 사람 이름은 보여 주지 않고 '된다/안 된다'만)
create or replace function public.nickname_available(p_nick text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from profiles
    where nick_key = lower(regexp_replace(btrim(p_nick), '\s+', ' ', 'g')) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
  );
$$;

-- ===== 2026-11-16 추가: 수집 최소화 =====
-- 이미 만든 표에 칸 추가 (처음 만드는 경우엔 위 create table에 들어 있음)
alter table public.profiles add column if not exists marketing_at timestamptz;

-- 소셜 로그인 제공자가 보내는 이름·프로필 사진은 저장하지 않음 (항해명은 따로 정함)
-- Supabase Auth가 auth.users / auth.identities에 자동으로 적는 값에서 지움. 이메일·식별자(sub)는 로그인에 필요해 남김.
create or replace function public.strip_social_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text[] := array['name','full_name','nickname','user_name','preferred_username','slug','avatar_url','picture','profile_image','thumbnail_image'];
begin
  if tg_table_name = 'users' then
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - k;
  else
    new.identity_data := coalesce(new.identity_data, '{}'::jsonb) - k;
  end if;
  return new;
end $$;
drop trigger if exists strip_social_users on auth.users;
create trigger strip_social_users before insert or update on auth.users for each row execute function public.strip_social_profile();
drop trigger if exists strip_social_identities on auth.identities;
create trigger strip_social_identities before insert or update on auth.identities for each row execute function public.strip_social_profile();
