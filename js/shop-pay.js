// ARTMOS 컬렉트 — 실물 작품 결제 (일반 결제, 토스페이먼츠 결제창 v2)
// 실물 상품이라 애플·구글 인앱결제 대상이 아님 → 앱 안에서도 일반 결제 가능.
// 순서: ① 서버에 주문 만들기(가격·재고는 서버가 정함, 작품을 잠시 예약) → ② 토스 결제창 → ③ checkout.html 로 돌아와
//       서버가 결제 승인(시크릿 키) + 금액 확인 → ④ 작품 '판매 완료', 주문 '결제 완료'.
// 서버(Supabase Edge Function)가 준비되기 전에는 config.shop.pay.enabled = false → '구매하기' 버튼이 안 보이고 문의만.
// 시험 두 가지:
//  ?shoptest=1    → 서버·결제창 없이 이 기기에서만 흉내(로그인 없이도, 예시 작품도)
//  ?shoptest=toss → 실제 서버 + 토스 '테스트' 결제창(돈이 나가지 않음). 로그인 필요, clientKey가 test_ck_일 때만
// 소장(결제)은 로그인한 회원만(2026-11-16 소유자 결정). 주문은 계정에 묶여 서버 orders 표에 남음.
import { CONFIG } from './config.js?v=38';
import { cachedUser, currentUser, accessToken, AUTH_ON } from './auth.js?v=16';

const SH = CONFIG.shop || {}, PAY = SH.pay || {};
const qMode = new URLSearchParams(location.search).get('shoptest');
const MODE = qMode != null ? (qMode === 'toss' ? 'toss' : '1') : (() => { try { return sessionStorage.getItem('nebula-shoptest') || ''; } catch (e) { return ''; } })();
if (MODE) { try { sessionStorage.setItem('nebula-shoptest', MODE); } catch (e) {} }
const TEST_KEY = /^test_/.test(PAY.clientKey || '');
export const WIDGET = /^(test|live)_gck_/.test(PAY.clientKey || ''); // 결제위젯 키면 위젯, ck면 결제창
export const SHOP_SIM = MODE === '1';                        // 기기 안 흉내
export const TOSS_TEST = MODE === 'toss' && TEST_KEY;          // 토스 테스트 결제창
export const SHOP_TEST = SHOP_SIM || TOSS_TEST || (!!PAY.enabled && TEST_KEY); // 화면에 '시험 모드' 표시
export const PAY_ON = SHOP_SIM || (!!PAY.clientKey && !!PAY.api && (!!PAY.enabled || TOSS_TEST));
export const LOGIN_ON = AUTH_ON;                               // 로그인 기능이 있으면 소장은 로그인 필수
export const needsLogin = () => !SHOP_SIM && LOGIN_ON && !cachedUser();
export { currentUser };
export const SHIPPING_KRW = Number(SH.shippingKrw) || 0;

// 기기에 남기는 주문 기록(화면 표시용. 진짜 기록은 서버 orders 표)
const OKEY = 'nebula-shop-orders';
export const orders = () => { try { return JSON.parse(localStorage.getItem(OKEY)) || []; } catch (e) { return []; } };
export function saveOrder(o) { const a = orders().filter((x) => x.orderId !== o.orderId); a.unshift({ ...orders().find((x) => x.orderId === o.orderId), ...o }); try { localStorage.setItem(OKEY, JSON.stringify(a.slice(0, 50))); } catch (e) {} }

export const buyable = (w) => PAY_ON && w.status === 'available' && !w.price_request && w.price_krw > 0 && (!w.sample || SHOP_SIM || TOSS_TEST);
export const back = () => new URL('checkout.html', location.href).href;
export const CLIENT_KEY = PAY.clientKey || '';

export async function api(path, body) {
  const token = await accessToken();
  if (!token) throw Object.assign(new Error('login'), { code: 'LOGIN_REQUIRED' });
  const anon = (CONFIG.auth || {}).supabaseAnonKey || '';
  const r = await fetch(PAY.api.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, apikey: anon }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.message || 'server'), { code: j.code || r.status });
  return j;
}
export function loadToss() {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v2/standard'; s.onload = () => ok(window.TossPayments); s.onerror = () => no(new Error('sdk')); document.head.appendChild(s); });
}
const rid = () => 'N' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase(); // 6~64자, 영문·숫자만

// 결제 시작. buyer = { name, phone, email, zip, addr1, addr2, memo }
// mount: 결제위젯 키일 때 결제수단을 그릴 칸(화면 쪽에서 넘김), payLabel: 그 아래 결제 버튼 글자
export async function checkout(work, buyer, { artistName, lang, mount, payLabel }) {
  try { sessionStorage.setItem('nebula-shop-back', location.pathname.split('/').pop() || 'app.html'); } catch (e) {}
  const record = { test: SHOP_TEST || undefined, work_id: work.id, title: work.title, artist: artistName, cell: work.cell || '', at: Date.now(), status: 'pending' };
  if (SHOP_SIM) { // 서버·결제창 없이 흉내: 바로 성공 페이지로
    const orderId = rid(), amount = work.price_krw + SHIPPING_KRW;
    saveOrder({ ...record, orderId, amount, currency: 'KRW', buyer: { name: buyer.name } });
    location.href = `${back()}?result=success&test=1&orderId=${orderId}&paymentKey=test_${orderId}&amount=${amount}`;
    return;
  }
  // ① 주문 만들기: 금액은 서버가 작품 표에서 계산해서 돌려줌(화면 금액을 믿지 않음)
  const o = await api('/create-order', { work_id: work.id, cell: work.cell || null, buyer, lang });
  saveOrder({ ...record, orderId: o.orderId, amount: o.amount, currency: 'KRW', buyer: { name: buyer.name }, test: o.test || undefined });
  // ② 토스 결제 (성공하면 successUrl 로 paymentKey·orderId·amount 가 붙어 돌아옴)
  const Toss = await loadToss(), tp = Toss(PAY.clientKey);
  const req = {
    orderId: o.orderId, orderName: o.orderName, successUrl: `${back()}?result=success`, failUrl: `${back()}?result=fail`,
    customerName: buyer.name, customerEmail: buyer.email, customerMobilePhone: buyer.phone.replace(/\D/g, ''),
  };
  if (WIDGET) { // 결제위젯 키(…_gck_…): 화면 안에 결제수단·약관을 그리고, 그 아래 버튼으로 결제
    if (!mount) throw Object.assign(new Error('mount'), { code: 'NO_MOUNT' });
    mount.innerHTML = `<div class="tw-box"><div id="tw-methods"></div><div id="tw-agree"></div></div><p class="sp-err" role="alert"></p><button class="btn black" type="button" data-twpay>${payLabel || '결제하기'}</button>`;
    const w = tp.widgets({ customerKey: o.customerKey || Toss.ANONYMOUS });
    await w.setAmount({ currency: 'KRW', value: o.amount });
    await Promise.all([w.renderPaymentMethods({ selector: '#tw-methods', variantKey: 'DEFAULT' }), w.renderAgreement({ selector: '#tw-agree', variantKey: 'AGREEMENT' })]);
    const btn = mount.querySelector('[data-twpay]'), err = mount.querySelector('.sp-err');
    btn.addEventListener('click', async () => {
      btn.disabled = true; err.textContent = '';
      try { await w.requestPayment(req); } catch (x) { err.textContent = (x && x.message) || ''; } finally { btn.disabled = false; }
    });
    return { widget: true, orderId: o.orderId };
  }
  await tp.payment({ customerKey: o.customerKey || Toss.ANONYMOUS }).requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: o.amount }, ...req });
}
// ③ checkout.html 에서 부름: 서버가 승인하고 금액을 확인
export async function confirm({ paymentKey, orderId, amount }) {
  if (SHOP_SIM) { saveOrder({ orderId, status: 'paid', paidAt: Date.now() }); return { orderId, status: 'paid' }; }
  const r = await api('/confirm-payment', { paymentKey, orderId, amount: Number(amount) });
  saveOrder({ orderId, status: r.status || 'paid', paidAt: Date.now() });
  return r;
}
