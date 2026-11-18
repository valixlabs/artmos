// ARTMOS 멤버십 — 유료화 뼈대 (결제는 아직 꺼져 있음)
// 구성: 로그인 → 구매 기록(서버) → 전시 잠금. 앱 결제(애플·구글 인앱결제)와 웹 결제가 같은 구매 기록을 씀.
// 지금은 CONFIG.paywall.enabled = false 라서 모든 전시가 열려 있고, 멤버십 화면은 '준비 중' 안내만 함.
// 주소에 ?paytest=1 을 붙이면 이 기기에서만 결제를 흉내 내어 잠금·구매·복원 흐름을 시험할 수 있음(실제 결제 아님).
// 실제 결제를 붙일 때는 아래 provider 를 서버(Supabase)·RevenueCat·웹 결제 구현으로 바꾸면 됨 → docs/paid/README.md
import { CONFIG } from './config.js?v=38';
import { lang } from './i18n.js?v=7';
import { web } from './web-base.js?v=1';

const PW = CONFIG.paywall || {};
// 시험 결제: ?paytest=1(이 탭 동안) 또는 앱 마이 → '버전'을 7번 눌러 켠 기기(artmos-paytest, 끌 때까지 유지). 실제 결제는 아님.
export const TEST = new URLSearchParams(location.search).has('paytest') || (() => { try { return sessionStorage.getItem('nebula-paytest') === '1' || localStorage.getItem('artmos-paytest') === '1'; } catch (e) { return false; } })();
if (TEST) { try { sessionStorage.setItem('nebula-paytest', '1'); } catch (e) {} }
export const ENABLED = !!PW.enabled || TEST;
const QS = new URLSearchParams(location.search);
const APP_ENT = QS.get('app') === '1' && QS.get('ent') === '1'; // 앱 화면이 결제(멤버십·입장권)를 확인하고 연 전시
export const IN_APP_FRAME = QS.get('app') === '1' && window !== window.top;

// 상품: 스토어 상품 ID 와 가격(한국 원화 / 해외 달러). 앱은 웹보다 조금 높게 잡을 수 있음(스토어 수수료)
export const PRODUCTS = {
  // 하루 입장권: 구매 후 startDays일 안에 입장, 처음 입장한 때부터 hours시간 동안 몇 번이든 다시 입장. 소장 아님(VOD 대여처럼)
  pass: { id: 'artmos.pass.day', kind: 'pass', krw: 2900, usd: 1.99, hours: 24, startDays: 30 },
  monthly: { id: 'artmos.member.monthly', kind: 'sub', krw: 5900, usd: 4.99 },
  yearly: { id: 'artmos.member.yearly', kind: 'sub', krw: 59000, usd: 49.99 },
  ...(PW.products || {}),
};
const storePrice = {}; // 스토어에서 받은 가격 문구(상품 id → '₩2,900' 등)
export const price = (p) => storePrice[p.id] || (lang === 'ko' ? `${p.krw.toLocaleString('ko-KR')}원` : `$${p.usd.toFixed(2)}`);

const W = {
  ko: { title: '멤버십', lead: '모든 전시와 매달 태어나는 새 행성을 자유롭게.', monthly: '월 구독', yearly: '연 구독', ticket: '하루 입장권', perMonth: '매달', perYear: '매년 · 두 달 무료', once: '처음 입장 후 24시간 · 구매 후 30일 안에 입장',
    b1: '모든 전시 전체 관람', b2: '매달 새 전시', b3: '언제든 해지', start: '시작하기', buy: '이 전시 하루 입장권', restore: '구매 복원', manage: '구독 관리', soon: '결제는 준비 중이에요. 지금은 모든 전시가 열려 있어요.',
    active: '멤버십 이용 중', none: '아직 멤버십이 없어요', owned: '입장권 {n}장', free: '무료', paid: '멤버십', locked: '여기까지 무료로 보셨어요', lockedT: '이어서 보려면 멤버십을 시작하거나 이 전시 하루 입장권을 구매하세요.',
    done: '구매가 완료됐어요. 이어서 감상하세요.', restored: '구매 내역을 되찾았어요.', nothing: '되찾을 구매 내역이 없어요.', test: '테스트 모드 — 실제 결제가 아니에요', terms: '이용약관', privacy: '개인정보처리방침',
    legal: '구독은 해지하기 전까지 자동으로 갱신돼요. 해지는 스토어의 구독 관리에서 언제든 할 수 있어요.', reset: '테스트 구매 지우기', open: '멤버십 보기', inApp: 'ARTMOS 앱에서 멤버십을 시작할 수 있어요.' , passLeft: '입장권 · {t} 남음', passReady: '입장권이 있어요 · 입장하면 24시간이 시작돼요', passEnd: '입장권 시간이 끝났어요. 지금 보던 관람은 끝까지 볼 수 있어요.', passOver: '입장권 시간이 끝났어요.', passDone: '입장권을 샀어요. 지금부터 24시간 동안 볼 수 있어요.', passLegal: '하루 입장권은 처음 입장한 때부터 24시간 동안 몇 번이든 다시 들어올 수 있고, 구매 후 30일 안에 입장하지 않으면 사라져요. 소장하는 상품이 아니에요.', h: '시간', m: '분' },
  en: { title: 'Membership', lead: 'Every exhibition, and a new planet born each month.', monthly: 'Monthly', yearly: 'Yearly', ticket: 'Day pass', perMonth: 'per month', perYear: 'per year · 2 months free', once: '24 hours from first entry · enter within 30 days',
    b1: 'Full access to every exhibition', b2: 'A new exhibition every month', b3: 'Cancel anytime', start: 'Start', buy: 'Day pass for this exhibition', restore: 'Restore purchases', manage: 'Manage subscription', soon: 'Payments are coming soon. For now, every exhibition is open.',
    active: 'Membership active', none: 'No membership yet', owned: '{n} pass(es)', free: 'Free', paid: 'Members', locked: 'You’ve reached the end of the free preview', lockedT: 'Start a membership or get a day pass for this exhibition to keep going.',
    done: 'Purchase complete. Enjoy the rest.', restored: 'Your purchases were restored.', nothing: 'No purchases to restore.', test: 'Test mode — no real payment', terms: 'Terms of Use', privacy: 'Privacy Policy',
    legal: 'Subscriptions renew automatically until cancelled. You can cancel anytime in your store’s subscription settings.', reset: 'Clear test purchases', open: 'See membership', inApp: 'You can start a membership in the ARTMOS app.' , passLeft: 'Day pass · {t} left', passReady: 'You have a day pass · 24 hours start when you enter', passEnd: 'Your day pass has ended. You can finish the visit you’re in.', passOver: 'Your day pass has ended.', passDone: 'Day pass bought. You can visit for the next 24 hours.', passLegal: 'A day pass lets you re-enter as often as you like for 24 hours from your first entry, and expires if not used within 30 days of purchase. It is not a permanent purchase.', h: 'h', m: 'm' },
  zh: { title: '会员', lead: '畅享全部展览，以及每月诞生的新行星。', monthly: '月度订阅', yearly: '年度订阅', ticket: '一日通行证', perMonth: '每月', perYear: '每年 · 免两个月', once: '首次进入后24小时 · 购买后30天内进入',
    b1: '完整观看全部展览', b2: '每月新展览', b3: '随时取消', start: '开始', buy: '这场展览的一日通行证', restore: '恢复购买', manage: '管理订阅', soon: '支付功能即将开放。目前所有展览均可观看。',
    active: '会员使用中', none: '尚未开通会员', owned: '通行证 {n} 张', free: '免费', paid: '会员', locked: '免费试看到此结束', lockedT: '开通会员或购买这场展览的一日通行证即可继续观看。',
    done: '购买完成，请继续欣赏。', restored: '已恢复购买记录。', nothing: '没有可恢复的购买记录。', test: '测试模式 — 并非真实支付', terms: '使用条款', privacy: '隐私政策',
    legal: '订阅在取消前会自动续订。可随时在应用商店的订阅管理中取消。', reset: '清除测试购买', open: '查看会员', inApp: '可在 ARTMOS 应用中开通会员。' , passLeft: '通行证 · 剩余 {t}', passReady: '你有一张通行证 · 进入后开始计时24小时', passEnd: '通行证时间已结束。正在观看的这一次可以看完。', passOver: '通行证时间已结束。', passDone: '已购买通行证。接下来24小时内可以观看。', passLegal: '一日通行证自首次进入起24小时内可多次重新进入；购买后30天内未使用则失效。这不是永久收藏的商品。', h: '小时', m: '分' },
  ja: { title: 'メンバーシップ', lead: 'すべての展示と、毎月生まれる新しい惑星を自由に。', monthly: '月額プラン', yearly: '年額プラン', ticket: '1日入場券', perMonth: '毎月', perYear: '毎年 · 2か月分無料', once: '初回入場から24時間 · 購入後30日以内に入場',
    b1: 'すべての展示を最後まで', b2: '毎月あたらしい展示', b3: 'いつでも解約', start: 'はじめる', buy: 'この展示の1日入場券', restore: '購入を復元', manage: 'サブスクリプション管理', soon: '決済は準備中です。現在はすべての展示をご覧いただけます。',
    active: 'メンバーシップ利用中', none: 'まだメンバーシップがありません', owned: '入場券 {n}枚', free: '無料', paid: 'メンバー', locked: '無料でご覧いただけるのはここまでです', lockedT: '続きをご覧になるには、メンバーシップを始めるか、この展示の1日入場券をご購入ください。',
    done: '購入が完了しました。続きをお楽しみください。', restored: '購入履歴を復元しました。', nothing: '復元できる購入履歴がありません。', test: 'テストモード — 実際の決済ではありません', terms: '利用規約', privacy: 'プライバシーポリシー',
    legal: 'サブスクリプションは解約するまで自動更新されます。解約はストアのサブスクリプション管理からいつでもできます。', reset: 'テスト購入を消す', open: 'メンバーシップを見る', inApp: 'ARTMOS アプリでメンバーシップをはじめられます。' , passLeft: '入場券 · 残り {t}', passReady: '入場券があります · 入場すると24時間がはじまります', passEnd: '入場券の時間が終わりました。いま見ている観覧は最後まで見られます。', passOver: '入場券の時間が終わりました。', passDone: '入場券を購入しました。これから24時間ご覧いただけます。', passLegal: '1日入場券は、初回入場から24時間のあいだ何度でも再入場でき、購入後30日以内に入場しないと失効します。所蔵する商品ではありません。', h: '時間', m: '分' },
};
const W2 = {
  ko: { mMon: '멤버십 · 월', mYear: '멤버십 · 1년', payAll: '모든 전시 자유 관람 · 매달 자동 결제', payAllY: '모든 전시 자유 관람 · 1년 · 두 달 무료', infoT: '이용 안내', i1: '이 전시만, 처음 입장한 때부터 24시간 동안 몇 번이든 다시 볼 수 있어요.', i2: '구매 후 30일 안에 입장하면 돼요. 보던 관람은 시간이 끝나도 끝까지 볼 수 있어요.', i3: '결제는 앱스토어·구글 플레이 계정으로 돼요.', m1: '모든 전시를 기간 동안 자유롭게 볼 수 있어요. 새 전시도 포함돼요.', m2: '해지하기 전까지 자동으로 갱신돼요. 해지는 스토어의 구독 관리에서 언제든 할 수 있어요.', m3: '로그인한 계정으로 웹·앱 어디서나 이어서 볼 수 있어요.', total: '결제 금액', payNow: '{p} 결제하기', payOpen: '결제하고 이어 보기', payBtn: '결제하기', preview: '먼저 미리 보기', needLogin: '결제는 로그인한 뒤에 할 수 있어요.', fail: '결제를 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.' },
  en: { mMon: 'Membership · Monthly', mYear: 'Membership · Yearly', payAll: 'All exhibitions · billed monthly', payAllY: 'All exhibitions · 1 year · 2 months free', infoT: 'Details', i1: 'This exhibition only — watch as often as you like for 24 hours from first entry.', i2: 'Enter within 30 days of purchase. A visit in progress won’t be cut off when time runs out.', i3: 'Charged to your App Store / Google Play account.', m1: 'Watch every exhibition freely, including new ones.', m2: 'Renews automatically until cancelled. Cancel anytime in your store subscription settings.', m3: 'Continue on web or app with the same account.', total: 'Total', payNow: 'Pay {p}', payOpen: 'Pay to continue', payBtn: 'Pay', preview: 'Preview first', needLogin: 'Please log in to pay.', fail: 'Payment didn’t go through. Please try again shortly.' },
  zh: { mMon: '会员 · 月', mYear: '会员 · 年', payAll: '畅看全部展览 · 每月自动续费', payAllY: '畅看全部展览 · 1年 · 赠两个月', infoT: '使用说明', i1: '仅限本展览，自首次入场起24小时内可反复观看。', i2: '购买后30天内入场即可。时间结束时正在观看的内容可看完。', i3: '通过 App Store / Google Play 账户付款。', m1: '会员期间可自由观看全部展览，包括新展览。', m2: '在取消前自动续订，可随时在商店订阅管理中取消。', m3: '使用同一账户在网页和应用中继续观看。', total: '支付金额', payNow: '支付 {p}', payOpen: '支付后继续观看', payBtn: '支付', preview: '先试看', needLogin: '请登录后再支付。', fail: '支付未完成，请稍后再试。' },
  ja: { mMon: 'メンバーシップ · 月', mYear: 'メンバーシップ · 年', payAll: 'すべての展示が見放題 · 毎月自動更新', payAllY: 'すべての展示が見放題 · 1年 · 2か月分お得', infoT: 'ご利用案内', i1: 'この展示のみ、初回入場から24時間何度でもご覧いただけます。', i2: '購入後30日以内にご入場ください。時間が終わっても観覧中の展示は最後までご覧いただけます。', i3: 'お支払いは App Store / Google Play アカウントで行われます。', m1: '期間中すべての展示を自由にご覧いただけます。新しい展示も含みます。', m2: '解約するまで自動更新されます。ストアのサブスクリプション管理からいつでも解約できます。', m3: '同じアカウントでウェブ・アプリどちらでも続きが見られます。', total: 'お支払い金額', payNow: '{p} を支払う', payOpen: '支払って続きを見る', payBtn: '支払う', preview: '先にプレビュー', needLogin: 'お支払いにはログインが必要です。', fail: 'お支払いを完了できませんでした。しばらくしてからもう一度お試しください。' },
};
Object.keys(W2).forEach((l) => { W[l] = { ...(W[l] || {}), ...W2[l] }; });
export const mt = (k, o) => { let s = (W[lang] || W.ko)[k] ?? W.ko[k] ?? k; if (o) Object.entries(o).forEach(([a, b]) => { s = s.replace(`{${a}}`, b); }); return s; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 구매 기록 제공자 ----------
// 실제 서비스: getState() 는 서버의 구매 기록을, purchase() 는 인앱결제/웹 결제를, restore() 는 스토어 복원을 부름.
const KEY = 'nebula-paytest-state';
const HOUR = 36e5;
// 입장권 하나의 상태: unused(아직 입장 전, 30일 안) · active(입장 후 24시간 안) · over(끝)
function passStatus(p, now = Date.now()) {
  if (p.entered) return now < p.entered + PRODUCTS.pass.hours * HOUR ? 'active' : 'over';
  return now - p.bought < PRODUCTS.pass.startDays * 864e5 ? 'unused' : 'over';
}
function passLive(p) { return passStatus(p) !== 'over'; }
const testProvider = {
  name: 'test',
  getState() { let s; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} s = s || {}; return { member: s.member || null, passes: Array.isArray(s.passes) ? s.passes : [] }; },
  save(s) { localStorage.setItem(KEY, JSON.stringify(s)); },
  async enter(cellId, at) { const s = this.getState(), p = s.passes.find((x) => x.cell === cellId && !x.entered && Date.now() - x.bought < PRODUCTS.pass.startDays * 864e5); if (p) { p.entered = at; this.save(s); } return !!p; },
  async purchase(product, cellId) { const s = this.getState(); if (product.kind === 'sub') s.member = { plan: product.id, since: Date.now() }; else if (cellId) s.passes.push({ cell: cellId, bought: Date.now(), entered: null }); this.save(s); return true; },
  async restore() { const s = this.getState(); return !!(s.member || s.passes.some(passLive)); },
  reset() { localStorage.removeItem(KEY); },
};
const offProvider = { name: 'off', getState: () => ({ member: null, passes: [] }), async purchase() { return false; }, async restore() { return false; }, async enter() { return false; } };
let provider = TEST ? testProvider : offProvider;

// ---------- 앱 인앱결제 (RevenueCat, @revenuecat/purchases-capacitor) ----------
// 켜지는 조건: 앱 껍데기 안 + 플러그인 설치됨 + config.iap 키 있음 + paywall.enabled(또는 ?paytest=store).
// 멤버십 = RevenueCat 권한(entitlement) config.iap.entitlement('members'), 하루 입장권 = 소모성 상품(산 전시는 이 기기에 기록 → 나중에 Supabase로).
const IAP = CONFIG.iap || {};
let rcPlugin = null;
const RC = () => { // 앱 껍데기의 RevenueCat 플러그인(이름 'Purchases', 예전 이름 'CapacitorPurchases')
  const C = window.Capacitor; if (!C || rcPlugin) return rcPlugin;
  for (const n of ['Purchases', 'CapacitorPurchases']) {
    if (C.Plugins && C.Plugins[n]) return (rcPlugin = C.Plugins[n]);
    if (C.isPluginAvailable && C.isPluginAvailable(n) && C.registerPlugin) return (rcPlugin = C.registerPlugin(n));
  }
  return null;
};
const IAP_KEY = 'artmos-iap-state';
const iapState = () => { let s; try { s = JSON.parse(localStorage.getItem(IAP_KEY)); } catch (e) {} s = s || {}; return { member: s.member || null, passes: Array.isArray(s.passes) ? s.passes : [] }; };
const iapSave = (s) => { try { localStorage.setItem(IAP_KEY, JSON.stringify(s)); } catch (e) {} };
const memberFrom = (ci) => { const en = ci && ci.entitlements && ci.entitlements.active && ci.entitlements.active[IAP.entitlement || 'members']; return en ? { plan: en.productIdentifier, until: en.expirationDate || null } : null; };
const isCancel = (err) => !!(err && (err.userCancelled || err.code === '1' || err.code === 1 || /cancel/i.test(String(err.message || err))));
const storeProvider = {
  name: 'store',
  getState: iapState,
  save: iapSave,
  async enter(cellId, at) { const s = iapState(), p = s.passes.find((x) => x.cell === cellId && !x.entered && Date.now() - x.bought < PRODUCTS.pass.startDays * 864e5); if (p) { p.entered = at; iapSave(s); } return !!p; },
  async purchase(product, cellId) {
    const P = RC(); if (!P) return false;
    try {
      const { products } = await P.getProducts({ productIdentifiers: [product.id], type: product.kind === 'sub' ? 'SUBSCRIPTION' : 'NON_SUBSCRIPTION' });
      if (!products || !products[0]) throw new Error('no product ' + product.id);
      const r = await P.purchaseStoreProduct({ product: products[0] });
      const s = iapState(); s.member = memberFrom(r && r.customerInfo) || s.member;
      if (product.kind !== 'sub' && cellId) s.passes.push({ cell: cellId, bought: Date.now(), entered: null, tx: (r && r.transaction && r.transaction.transactionIdentifier) || '' });
      iapSave(s); return true;
    } catch (err) { if (isCancel(err)) return false; lastError = String((err && err.message) || err); return false; }
  },
  async restore() { const P = RC(); if (!P) return false; try { const { customerInfo } = await P.restorePurchases(); const s = iapState(); s.member = memberFrom(customerInfo); iapSave(s); return !!(s.member || s.passes.some(passLive)); } catch (e) { return false; } },
};
let lastError = '';
export const purchaseError = () => lastError;
export const STORE_READY = () => provider === storeProvider;
// 앱 화면(app.js)이 시작할 때 부름. userId = Supabase 회원 id(로그인했으면) — 웹·앱 어디서 사도 같은 회원으로 묶임
export async function initStore(userId) {
  const P = RC(); if (!P) return false;
  const plat = window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : '';
  const key = plat === 'ios' ? IAP.iosKey : plat === 'android' ? IAP.androidKey : '';
  if (!key || !(PW.enabled || QS.get('paytest') === 'store')) return false;
  try {
    if (!storeProvider._on) { await P.configure({ apiKey: key, appUserID: userId || undefined }); storeProvider._on = true; }
    else if (userId) await P.logIn({ appUserID: userId });
    provider = storeProvider;
    const { customerInfo } = await P.getCustomerInfo(); const s = iapState(); s.member = memberFrom(customerInfo); iapSave(s);
    for (const [kind, ids] of [['SUBSCRIPTION', [PRODUCTS.monthly.id, PRODUCTS.yearly.id]], ['NON_SUBSCRIPTION', [PRODUCTS.pass.id]]]) {
      try { const { products } = await P.getProducts({ productIdentifiers: ids, type: kind }); (products || []).forEach((x) => { if (x.priceString) storePrice[x.identifier] = x.priceString; }); } catch (e) {}
    }
    emit(); return true;
  } catch (e) { lastError = String((e && e.message) || e); return false; }
}
export function setProvider(p) { provider = p; emit(); } // 실제 결제 구현을 끼우는 자리
const listeners = []; const emit = () => listeners.forEach((f) => f(state()));
export const onChange = (f) => { listeners.push(f); };
export const state = () => provider.getState();
export const isMember = () => !!state().member;
// 전시가 유료인지: 데이터의 paid 칸(시트 cells 의 paid = 1/true/yes) 또는 config.paywall.paid 목록
const TEST_PAID = TEST ? (new URLSearchParams(location.search).get('paid') || (() => { try { return sessionStorage.getItem('nebula-paytest-paid') || ''; } catch (e) { return ''; } })()).split(',').filter(Boolean) : []; // 시험용: ?paytest=1&paid=c004
if (TEST && TEST_PAID.length) { try { sessionStorage.setItem('nebula-paytest-paid', TEST_PAID.join(',')); } catch (e) {} }
export const isPaid = (c) => !!c && ENABLED && (TEST_PAID.includes(c.id) || /^(1|true|yes|y|o)$/i.test(String(c.paid ?? '').trim()) || (PW.paid || []).includes(c.id));
export const passOf = (c) => { const ps = state().passes.filter((p) => p.cell === c.id && passLive(p)); return ps.find((p) => passStatus(p) === 'active') || ps[0] || null; };
export const hadPass = (c) => state().passes.some((p) => p.cell === c.id);
export const canView = (c) => APP_ENT || !isPaid(c) || isMember() || !!passOf(c);
// 전시에 들어올 때 부름: 입장 전 입장권이면 지금부터 24시간 시작. 남은 시간(ms) 돌려줌, 해당 없으면 null
export async function enter(c) {
  if (!isPaid(c) || isMember()) return null;
  let p = passOf(c); if (!p) return null;
  if (passStatus(p) === 'unused') { await provider.enter(c.id, Date.now()); p = passOf(c); }
  return p && p.entered ? p.entered + PRODUCTS.pass.hours * HOUR - Date.now() : null;
}
const fmtLeft = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? `${h}${mt('h')} ${m % 60}${mt('m')}` : `${m}${mt('m')}`; };
// 전시 화면 위 작은 남은 시간 표시. 시간이 끝나도 지금 보는 관람은 끊지 않음
export function passChip(leftMs) {
  if (leftMs == null) return;
  const el = document.createElement('div'); el.className = 'mb-chip'; document.body.appendChild(el);
  const end = Date.now() + leftMs;
  const tick = () => { const l = end - Date.now(); if (l > 0) { el.textContent = mt('passLeft', { t: fmtLeft(l) }); el.classList.toggle('low', l < 30 * 60000); } else { el.textContent = mt('passEnd'); el.classList.add('low', 'over'); clearInterval(timer); setTimeout(() => el.classList.add('fade'), 8000); } };
  const timer = setInterval(tick, 30000); tick();
}
export const passLine = (c) => { const p = c && passOf(c); if (!p) return ''; return passStatus(p) === 'active' ? mt('passLeft', { t: fmtLeft(p.entered + PRODUCTS.pass.hours * HOUR - Date.now()) }) : mt('passReady'); };
export const previewCount = (c) => Number(c.preview) || PW.previewBlocks || 3; // 무료로 보여 줄 블록 수(표지 포함)
export async function purchase(key, cellId) { if (!ENABLED) return false; const ok = await provider.purchase(PRODUCTS[key], cellId); if (ok) emit(); return ok; }
export async function restore() { const ok = await provider.restore(); emit(); return ok; }
export function resetTest() { if (provider.reset) { provider.reset(); emit(); } }

// ---------- 화면 조각 ----------
export const badge = (c) => (ENABLED && c ? `<span class="mb-badge${isPaid(c) ? ' paid' : ''}">${isPaid(c) ? (canView(c) ? '✓ ' : '') + mt('paid') : mt('free')}</span>` : '');
const legalLinks = () => `<p class="mb-legal">${mt('legal')} ${mt('passLegal')}</p><p class="mb-links"><a href="${web(`terms.html?lang=${lang}`)}" target="_blank" rel="noopener">${mt('terms')}</a> · <a href="${web(`privacy.html?lang=${lang}`)}" target="_blank" rel="noopener">${mt('privacy')}</a></p>`;
// 멤버십 화면(시트 안에 들어감). cell 을 주면 '이 전시만 구매'도 보여 줌
export function membershipHTML(cell) {
  const s = state(), plan = (k, sub, hot) => `<button class="mb-plan${hot ? ' hot' : ''}" data-mb-buy="${k}"><span><b>${mt(k)}</b><small>${mt(sub)}</small></span><em>${price(PRODUCTS[k])}</em></button>`;
  return `<div class="mb">
    ${TEST ? `<p class="mb-test">${mt('test')}</p>` : ''}
    <h3>${mt('title')}</h3><p class="mb-lead">${mt('lead')}</p>
    <p class="mb-state${s.member ? ' on' : ''}">${s.member ? mt('active') : mt('none')}${s.passes.filter(passLive).length ? ` · ${mt('owned', { n: s.passes.filter(passLive).length })}` : ''}</p>
    <ul class="mb-benefits"><li>${mt('b1')}</li><li>${mt('b2')}</li><li>${mt('b3')}</li></ul>
    ${!ENABLED ? `<p class="mb-soon">${mt('soon')}</p>` : ''}
    <div class="mb-plans">${plan('yearly', 'perYear', true)}${plan('monthly', 'perMonth')}${cell && isPaid(cell) && !canView(cell) ? `<button class="mb-plan" data-mb-buy="pass" data-mb-cell="${esc(cell.id)}"><span><b>${mt('buy')}</b><small>${mt('once')}</small></span><em>${price(PRODUCTS.pass)}</em></button>` : ''}</div>
    <button class="mb-restore" data-mb-restore>${mt('restore')}</button>${TEST ? `<button class="mb-restore" data-mb-reset>${mt('reset')}</button>` : ''}
    ${legalLinks()}</div>`;
}
// 결제 시트: 전시 상세의 '결제하기' → 이 전시 하루 입장권 / 멤버십(월·연) 고르기 → 결제
export function paySheetHTML(cell, sel = 'pass', thumb = '') {
  const opts = [['pass', 'buy', 'once'], ['monthly', 'mMon', 'payAll'], ['yearly', 'mYear', 'payAllY']];
  const opt = ([k, label, sub]) => `<button class="pay-opt${k === sel ? ' on' : ''}" data-pay-opt="${k}" aria-pressed="${k === sel}"><i aria-hidden="true"></i><span><b>${mt(label)}</b><small>${mt(sub)}</small></span><em>${price(PRODUCTS[k])}</em></button>`;
  const info = sel === 'pass' ? ['i1', 'i2', 'i3'] : ['m1', 'm2', 'm3'];
  return `<div class="pay">
    ${TEST ? `<p class="mb-test">${mt('test')}</p>` : ''}
    <div class="pay-hd">${thumb ? `<img src="${esc(thumb)}" alt="" draggable="false">` : ''}<div><b>${esc(cell.title || '')}</b><small>${esc([cell.code, cell.artist].filter(Boolean).join(' · '))}</small></div></div>
    <div class="pay-opts">${opts.map(opt).join('')}</div>
    <h4>${mt('infoT')}</h4><ul class="pay-info">${info.map((k) => `<li>${mt(k)}</li>`).join('')}</ul>
    <button class="mb-restore" data-mb-restore>${mt('restore')}</button>${TEST ? `<button class="mb-restore" data-mb-reset>${mt('reset')}</button>` : ''}
    ${legalLinks()}
    <div class="pay-bar"><p><span>${mt('total')}</span><b>${price(PRODUCTS[sel])}</b></p><button class="pay-go" data-pay-go="${sel}" data-mb-cell="${esc(cell.id)}">${mt('payNow', { p: price(PRODUCTS[sel]) })}</button></div>
  </div>`;
}
// 멤버십 화면 안의 버튼 처리. 처리했으면 true. notify(문구), refresh() 는 부르는 쪽에서 줌
export async function handleMembershipClick(e, { notify = () => {}, refresh = () => {} } = {}) {
  const buy = e.target.closest('[data-mb-buy]'), rs = e.target.closest('[data-mb-restore]'), rst = e.target.closest('[data-mb-reset]');
  if (buy) { if (!ENABLED) { notify(mt('soon')); return true; } const ok = await purchase(buy.dataset.mbBuy, buy.dataset.mbCell); notify(ok ? mt(buy.dataset.mbBuy === 'pass' ? 'passDone' : 'done') : mt('soon')); if (ok) refresh(); return true; }
  if (rs) { const ok = ENABLED && await restore(); notify(ok ? mt('restored') : mt('nothing')); if (ok) refresh(); return true; }
  if (rst) { resetTest(); refresh(); return true; }
  return false;
}
// 전시 페이지의 잠금 블록 (무료 앞부분 뒤에 놓임)
export function paywallHTML(cell) {
  const inApp = /ARTMOSApp|NEBULAApp|VALIXApp/.test(navigator.userAgent) || window !== window.top;
  // 앱 안 전시 틀: 결제는 앱 화면에서만(인앱결제) → 앱에 결제 시트를 열어 달라고 알림
  if (IN_APP_FRAME) return `<section class="b-paywall" id="paywall"><div class="pw-in">
    <p class="eyebrow">ARTMOS</p><h2>${hadPass(cell) ? mt('passOver') : mt('locked')}</h2><p>${mt('lockedT')}</p>
    <button class="pay-go" onclick="parent.postMessage({type:'artmos:pay',cell:${JSON.stringify(String(cell.id)).replace(/"/g, '&quot;')}},'*')">${mt('payOpen')}</button>
  </div></section>`;
  return `<section class="b-paywall" id="paywall"><div class="pw-in">
    <p class="eyebrow">ARTMOS MEMBERSHIP</p><h2>${hadPass(cell) ? mt('passOver') : mt('locked')}</h2><p>${mt('lockedT')}</p>
    ${membershipHTML(cell)}${inApp ? '' : `<p class="mb-legal">${mt('inApp')}</p>`}
  </div></section>`;
}

// 공용 스타일 (한 번만)
if (!document.getElementById('mb-style')) {
  const st = document.createElement('style'); st.id = 'mb-style';
  st.textContent = `.mb{padding:6px 22px 18px;text-align:left;color:#f1f1f1}.mb h3{font-size:24px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}.mb-lead{font-size:15px;line-height:1.6;color:#c1c1c1;margin:0 0 14px}
.mb-test{display:inline-block;margin:0 0 12px;padding:5px 10px;border-radius:999px;background:rgba(197,197,197,.16);color:#d4d4d4;font-size:12px}
.mb-state{font-size:13px;color:#989898;margin:0 0 12px}.mb-state.on{color:#d2d2d2}
.mb-benefits{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:8px}.mb-benefits li{position:relative;padding-left:22px;font-size:14px;color:#dedede}.mb-benefits li::before{content:'';position:absolute;left:2px;top:6px;width:9px;height:5px;border-left:1.5px solid #d2d2d2;border-bottom:1.5px solid #d2d2d2;transform:rotate(-45deg)}
.mb-soon{margin:0 0 14px;padding:12px 14px;border-radius:14px;background:rgba(210,210,210,.08);border:1px solid rgba(210,210,210,.22);font-size:13.5px;line-height:1.55;color:#dedede}
.mb-plans{display:grid;gap:10px;margin-bottom:12px}.mb-plan{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:64px;padding:12px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:rgba(21,21,21,.7);color:inherit;text-align:left;cursor:pointer;font:inherit}
.mb-plan.hot{border-color:#d2d2d2;background:rgba(210,210,210,.1)}.mb-plan span{display:flex;flex-direction:column;gap:3px}.mb-plan b{font-size:15.5px;font-weight:600}.mb-plan small{font-size:12px;color:#a3a3a3}.mb-plan em{font-style:normal;font-size:17px;font-weight:600;white-space:nowrap}
.mb-restore{display:block;width:100%;min-height:44px;margin-top:2px;color:#c1c1c1;font-size:13.5px;text-decoration:underline;text-underline-offset:3px;background:none;border:0;cursor:pointer;font-family:inherit}
.mb-legal{font-size:12px;line-height:1.6;color:#878787;margin:10px 0 6px}.mb-links{font-size:12px;margin:0}.mb-links a{color:#c1c1c1;text-decoration:underline;text-underline-offset:3px}
.mb-badge{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.2);font-size:11px;letter-spacing:.04em;color:#c1c1c1;vertical-align:middle}.mb-badge.paid{border-color:#d2d2d2;color:#d2d2d2}
.b-paywall{position:relative;padding:110px 16px 120px;background:linear-gradient(180deg,rgba(6,6,6,0),#090909 22%);margin-top:-22vh;z-index:3}.b-paywall .pw-in{max-width:520px;margin:0 auto;text-align:center}.b-paywall h2{font-size:clamp(24px,5vw,34px);font-weight:700;margin:12px 0 10px;word-break:keep-all}.b-paywall .pw-in>p{color:#c1c1c1;font-size:15px;line-height:1.7;margin-bottom:18px}
.mb-chip{position:fixed;z-index:30;left:50%;top:calc(env(safe-area-inset-top,0px) + 62px);transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:rgba(15,15,15,.88);border:1px solid rgba(210,210,210,.4);color:#dedede;font-size:12.5px;white-space:nowrap;pointer-events:none;transition:opacity .8s}.mb-chip.low{border-color:#d4d4d4;color:#d4d4d4}.mb-chip.over{white-space:normal;max-width:86vw;text-align:center}.mb-chip.fade{opacity:0}
.b-paywall .mb{border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(15,15,15,.9);padding:20px 18px 16px}
.pay{padding:4px 20px 0;color:#f1f1f1;text-align:left}.pay-hd{display:flex;gap:14px;align-items:center;margin:4px 0 18px}.pay-hd img{width:64px;aspect-ratio:2/3;object-fit:cover;border-radius:8px;flex:none;background:#151515}.pay-hd b{display:block;font-size:19px;font-weight:700;letter-spacing:-.02em}.pay-hd small{display:block;margin-top:4px;font-size:13px;color:#9a9a9a}
.pay-opts{display:grid;gap:10px}.pay-opt{display:flex;align-items:center;gap:14px;width:100%;min-height:66px;padding:12px 16px;border-radius:16px;border:1px solid transparent;background:#1c1c1e;color:#f1f1f1;text-align:left;font-family:inherit;cursor:pointer}
.pay-opt.on{border-color:#fff;background:#1c1c1e}.pay-opt i{flex:none;width:24px;height:24px;border-radius:50%;border:2px solid #555;position:relative}.pay-opt.on i{border-color:#fff;background:#fff}.pay-opt.on i::after{content:'';position:absolute;left:7px;top:3px;width:6px;height:11px;border:solid #000;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.pay-opt span{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}.pay-opt b{font-size:16px;font-weight:700}.pay-opt small{font-size:12px;color:#9a9a9a;line-height:1.4}.pay-opt em{font-style:normal;font-size:16px;font-weight:700;white-space:nowrap}
.pay h4{margin:22px 0 8px;font-size:14px;font-weight:600;color:#bdbdbd}.pay-info{margin:0 0 10px;padding:0;list-style:none;display:grid;gap:6px}.pay-info li{position:relative;padding-left:12px;font-size:13px;line-height:1.55;color:#9a9a9a}.pay-info li::before{content:'·';position:absolute;left:0}
.pay-bar{position:sticky;bottom:0;margin:14px -20px 0;padding:14px 20px calc(14px + env(safe-area-inset-bottom,0px));background:#111;border-top:1px solid rgba(255,255,255,.08)}.pay-bar p{display:flex;justify-content:space-between;margin:0 0 12px;font-size:15px}.pay-bar p span{color:#bdbdbd}.pay-bar p b{font-size:17px}
.pay-go{display:block;width:100%;min-height:54px;border-radius:999px;border:0;background:#fff;color:#000;font-size:16.5px;font-weight:700;font-family:inherit;cursor:pointer}.pay-go:disabled{opacity:.5}.b-paywall .pay-go{margin-top:18px}`;
  document.head.appendChild(st);
}
