// ARTMOS 결제 승인 (Supabase Edge Function `confirm-payment`)
// checkout.html이 successUrl로 받은 paymentKey·orderId·amount를 보냄 → 본인 주문·금액 확인 → 토스 승인 API.
// 시크릿 키(TOSS_SECRET_KEY = test_sk_… / live_sk_…)는 이 함수의 환경 변수(Supabase Secrets)에만 둔다.
// 승인 전에는 카드에서 돈이 나가지 않음 → 여기서 거절하면 결제는 자동으로 취소됨.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const ORIGINS = (Deno.env.get('ALLOW_ORIGIN') ?? 'https://valixlabs.github.io').split(',');
const cors = (req: Request) => {
  const o = req.headers.get('origin') ?? '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};
const SECRET = Deno.env.get('TOSS_SECRET_KEY') ?? '';

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ code: 'METHOD' }, 405);
  if (!SECRET) return json({ code: 'NOT_CONFIGURED' }, 500);

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: au } = await db.auth.getUser(token);
  const user = au?.user;
  if (!user) return json({ code: 'LOGIN_REQUIRED' }, 401);

  const { paymentKey, orderId, amount } = await req.json().catch(() => ({}));
  if (!paymentKey || !orderId) return json({ code: 'BAD_REQUEST' }, 400);

  const { data: cur } = await db.from('orders').select('order_id,user_id,status,amount_krw').eq('order_id', orderId).maybeSingle();
  if (!cur || cur.user_id !== user.id) return json({ code: 'NO_ORDER' }, 404);
  if (cur.status === 'paid') return json({ orderId, status: 'paid' });                 // 새로 고침 등 두 번 호출
  if (Number(amount) !== cur.amount_krw) return json({ code: 'AMOUNT_MISMATCH' }, 400); // 금액 바꿔치기 방지

  // 대기 중 → 승인 중(이 사이에 시간 초과로 풀리지 않게)
  const { data: o } = await db.rpc('begin_confirm', { p_order: orderId, p_user: user.id });
  if (!o?.order_id) return json({ code: 'ORDER_CLOSED', message: 'expired or cancelled' }, 409);

  const r = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(SECRET + ':'), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
    body: JSON.stringify({ paymentKey, orderId, amount: o.amount_krw }),
  });
  const p = await r.json().catch(() => ({}));
  if (!r.ok || p.status !== 'DONE') {
    await db.rpc('release_order', { p_order: orderId, p_status: 'failed' });
    return json({ code: p.code ?? 'TOSS', message: p.message ?? '' }, 400);
  }
  await db.rpc('mark_paid', { p_order: orderId, p_key: paymentKey, p_method: p.easyPay?.provider ?? p.method ?? null });
  // TODO: 소장인에게 확인 메일, 운영자·작가에게 알림
  return json({ orderId, status: 'paid', method: p.method, approvedAt: p.approvedAt });
});
