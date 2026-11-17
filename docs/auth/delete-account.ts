// ARTMOS 계정 삭제 (Supabase Edge Function `delete-account`). 앱스토어 규정: 앱 안에서 계정을 지울 수 있어야 함.
// 로그인한 본인 계정만 지움. profiles는 on delete cascade로 함께 지워짐.
// 주문 기록(orders)은 전자상거래법 보관 기간(5년) 동안 user_id만 비운 채 남음(on delete set null). 결제 전 대기 주문은 먼저 풀어 작품을 되돌림.
// 배포 때 'Verify JWT'는 꺼도 됨(함수 안에서 로그인 토큰을 직접 확인).
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? (() => { try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'))[0] as string; } catch { return ''; } })());
const ORIGINS = (Deno.env.get('ALLOW_ORIGIN') ?? 'https://valixlabs.github.io').split(',');
const cors = (req: Request) => {
  const o = req.headers.get('origin') ?? '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ code: 'METHOD' }, 405);

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: au } = await admin.auth.getUser(token);
  const user = au?.user;
  if (!user) return json({ code: 'LOGIN_REQUIRED' }, 401);

  // 결제 전 대기 주문은 취소하고 작품을 되돌림
  const { data: pending } = await admin.from('orders').select('order_id').eq('user_id', user.id).in('status', ['pending', 'confirming']);
  for (const o of pending ?? []) await admin.rpc('release_order', { p_order: o.order_id, p_status: 'cancelled' });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) { console.error(error); return json({ code: 'DELETE_FAILED', message: error.message }, 500); }
  return json({ ok: true });
});
