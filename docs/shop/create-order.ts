// ARTMOS 주문 만들기 (Supabase Edge Function `create-order`)
// 로그인한 회원만. 화면이 보낸 work_id로 작품을 30분 잡아 두고, 금액은 서버 표(works)에서 계산해 돌려준다.
// 화면이 보낸 금액은 쓰지 않음. 배포 때 'Verify JWT'는 꺼도 됨(함수 안에서 로그인 토큰을 직접 확인). 환경 변수: TOSS_SECRET_KEY(test_sk_… / live_sk_…, 테스트 여부 판단에만 씀), ALLOW_ORIGIN(선택)
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? (() => { try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'))[0] as string; } catch { return ''; } })());
const ORIGINS = (Deno.env.get('ALLOW_ORIGIN') ?? 'https://valixlabs.github.io').split(',');
const cors = (req: Request) => {
  const o = req.headers.get('origin') ?? '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};
const TEST = (Deno.env.get('TOSS_SECRET_KEY') ?? '').startsWith('test_');
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ code: 'METHOD' }, 405);

  // 로그인 확인
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: au } = await db.auth.getUser(token);
  const user = au?.user;
  if (!user) return json({ code: 'LOGIN_REQUIRED' }, 401);

  const body = await req.json().catch(() => ({}));
  const b = body.buyer ?? {};
  const buyer = {
    name: clip(b.name, 40), phone: clip(b.phone, 20).replace(/[^\d-]/g, ''), email: clip(b.email, 80) || user.email,
    zip: clip(b.zip, 10), addr1: clip(b.addr1, 120), addr2: clip(b.addr2, 120), memo: clip(b.memo, 120), country: 'KR',
  };
  if (!body.work_id || !buyer.name || !/^01\d-?\d{3,4}-?\d{4}$/.test(buyer.phone) || !buyer.zip || !buyer.addr1) return json({ code: 'BAD_REQUEST' }, 400);

  const orderId = 'A' + Date.now().toString(36).toUpperCase() + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  const { data: o, error } = await db.rpc('hold_work', {
    p_work: clip(body.work_id, 40), p_order: orderId, p_user: user.id, p_cell: body.cell ? clip(body.cell, 20) : null, p_buyer: buyer, p_test: TEST,
  });
  if (error) { console.error(error); return json({ code: 'DB' }, 500); }
  if (!o?.order_id) return json({ code: 'NOT_AVAILABLE', message: 'sold or on hold' }, 409);

  const { data: w } = await db.from('works').select('title').eq('work_id', o.work_id).single();
  return json({
    orderId: o.order_id, amount: o.amount_krw, orderName: String(w?.title ?? 'ARTMOS').slice(0, 90),
    customerKey: user.id, holdUntil: o.hold_until, test: TEST,
  });
});
