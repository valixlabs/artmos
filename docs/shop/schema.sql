-- ARTMOS 컬렉트 — 작품·주문 (Supabase / Postgres). 2026-11-16 테스트 모드로 실행.
-- 가격·재고의 진짜 기준은 이 표. 화면(시트·JSON)은 보여 주기용이고, 결제 금액은 서버가 여기서 계산한다.
-- 쓰기는 Edge Function(서비스 키)만. 화면은 작품 읽기·본인 주문 읽기만.

create table if not exists public.works (
  work_id      text primary key,               -- 시트·JSON의 work_id와 같게
  artist_id    text not null,
  cell_id      text,                           -- 관련 전시 (예: c005)
  title        text not null,
  price_krw    integer not null check (price_krw > 0),
  shipping_krw integer not null default 0,
  status       text not null default 'available' check (status in ('available','reserved','sold','hidden')),
  edition_left integer check (edition_left is null or edition_left >= 0), -- 에디션이면 남은 수(null = 한 점뿐인 작품)
  test_only    boolean not null default false, -- 예시 작품: 토스 테스트 키에서만 결제 가능(라이브 키면 서버가 거절)
  updated_at   timestamptz not null default now()
);

create table if not exists public.orders (
  order_id    text primary key,                -- 토스 orderId (6~64자, 영문·숫자·-_=)
  user_id     uuid not null references auth.users(id) on delete restrict, -- 로그인 필수. 결제 기록은 법정 보관 기간 동안 남김
  work_id     text not null references public.works(work_id),
  cell_id     text,                            -- 어느 전시에서 소장했는지(정산·통계)
  amount_krw  integer not null,                -- 서버가 정한 금액(작품가 + 배송비)
  status      text not null default 'pending'
              check (status in ('pending','confirming','paid','failed','expired','cancelled','shipped','delivered','refunded')),
  hold_until  timestamptz not null,            -- 이 시각까지 작품을 잡아 둠(30분)
  payment_key text,
  method      text,                            -- 카드·간편결제 등(토스 응답)
  test        boolean not null default false,  -- 테스트 키로 결제한 주문
  buyer       jsonb not null,                  -- 받는 분 이름·연락처·이메일·주소·요청 사항
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index if not exists orders_user on public.orders (user_id, created_at desc);
create index if not exists orders_pending on public.orders (hold_until) where status = 'pending';

alter table public.works enable row level security;
drop policy if exists "works public read" on public.works;
create policy "works public read" on public.works for select using (status <> 'hidden');
alter table public.orders enable row level security;
drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders for select using (auth.uid() = user_id);

-- 주문 하나를 풀기(실패·시간 초과·취소): 잡아 둔 작품을 되돌림
create or replace function public.release_order(p_order text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update orders set status = p_status where order_id = p_order and status in ('pending','confirming') returning * into o;
  if o.order_id is null then return; end if;
  update works set
    edition_left = case when edition_left is null then null else edition_left + 1 end,
    status = case when status = 'reserved' then 'available' else status end,
    updated_at = now()
  where work_id = o.work_id and status <> 'sold';
end $$;

-- 시간이 지난 결제 대기 주문 풀기 (작품을 잡을 때마다 먼저 부름 → cron 없이도 정리됨)
create or replace function public.release_holds() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select order_id from orders where status = 'pending' and hold_until < now() loop
    perform release_order(r.order_id, 'expired');
  end loop;
end $$;

-- 결제 시작: 작품을 30분 잡아 두고 주문을 만듦. 금액은 여기서 계산. 못 잡으면 null
create or replace function public.hold_work(p_work text, p_order text, p_user uuid, p_cell text, p_buyer jsonb, p_test boolean)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare w public.works; o public.orders;
begin
  perform release_holds();
  update works set
    edition_left = case when edition_left is null then null else edition_left - 1 end,
    status = case when edition_left is null or edition_left - 1 = 0 then 'reserved' else 'available' end,
    updated_at = now()
  where work_id = p_work and status = 'available' and (edition_left is null or edition_left > 0)
    and (p_test or not test_only)
  returning * into w;
  if w.work_id is null then return null; end if;
  insert into orders (order_id, user_id, work_id, cell_id, amount_krw, hold_until, test, buyer)
  values (p_order, p_user, w.work_id, coalesce(p_cell, w.cell_id), w.price_krw + w.shipping_krw, now() + interval '30 minutes', p_test, p_buyer)
  returning * into o;
  return o;
end $$;

-- 결제 승인 직전: 본인 주문이고 대기 중이면 'confirming'으로 바꿔 시간 초과로 풀리지 않게 함
create or replace function public.begin_confirm(p_order text, p_user uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update orders set status = 'confirming' where order_id = p_order and user_id = p_user and status = 'pending' returning * into o;
  return o;
end $$;

-- 결제 승인 성공: 주문 paid, 작품 sold(에디션은 다 나가면 sold)
create or replace function public.mark_paid(p_order text, p_key text, p_method text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update orders set status = 'paid', payment_key = p_key, method = p_method, paid_at = now()
   where order_id = p_order and status = 'confirming' returning * into o;
  if o.order_id is null then return; end if;
  update works set status = case when edition_left is null or edition_left = 0 then 'sold' else 'available' end, updated_at = now()
   where work_id = o.work_id;
end $$;

-- 이 함수들은 서버(서비스 키)만 부름
revoke execute on function public.release_order(text, text), public.release_holds(), public.hold_work(text, text, uuid, text, jsonb, boolean),
  public.begin_confirm(text, uuid), public.mark_paid(text, text, text) from public, anon, authenticated;

-- 예시 작품 (data/artworks.json의 sample과 같은 id). 테스트 키에서만 결제됨.
insert into public.works (work_id, artist_id, title, price_krw, status, edition_left, test_only) values
  ('w-sample-1', 'a-sample-1', '새벽의 단면', 3200000, 'available', null, true),
  ('w-sample-2', 'a-sample-1', '겹쳐진 오후', 1400000, 'available', null, true),
  ('w-sample-3', 'a-sample-2', '물의 기억 3', 1800000, 'available', null, true),
  ('w-sample-7', 'a-sample-4', '기울어진 별 (에디션)', 380000, 'available', 6, true),
  ('w-sample-8', 'a-sample-4', '후 불면 번지는 빛', 250000, 'available', 19, true)
on conflict (work_id) do nothing;
