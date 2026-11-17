// ARTMOS 주문 / 결제 페이지 (order.html?work=작품id)
// 한 화면에: 주문 작품 → 주문자 → 받는 분(주소 검색) → 결제 수단(토스 결제위젯) → 최종 금액 → 필수 동의 → 결제하기
// 로그인한 회원만. 금액은 서버(create-order)가 정함. 결제 성공·실패는 checkout.html 로 돌아감.
import { loadShop, workInfo } from './app-shop.js?v=18';
import { api, loadToss, back, CLIENT_KEY, WIDGET, SHOP_TEST, PAY_ON, SHIPPING_KRW, saveOrder } from './shop-pay.js?v=15';
import { currentUser } from './auth.js?v=13';
import { lang } from './i18n.js?v=7';
import { bizHTML } from './biz.js?v=2';
import { esc } from './data.js?v=34';

document.documentElement.lang = lang;
const T = {
  ko: { title: '주문 / 결제', test: '시험 모드 — 토스 테스트 결제라 실제로 돈이 나가지 않아요.', item: '주문 작품', buyer: '주문자 정보', name: '이름', phone: '연락처', email: '이메일', to: '받는 분 정보', same: '주문자와 동일', zip: '우편번호', find: '주소 검색', addr1: '주소', addr2: '상세 주소', memo: '배송 요청사항', memoPick: '선택해 주세요', memo1: '배송 전 연락 부탁드립니다', memo2: '부재 시 경비실에 맡겨 주세요', memo3: '설치 일정은 따로 연락 주세요', memoSelf: '직접 입력', domestic: '국내 배송만 결제로 받아요. 해외에서 받으시려면 소장 상담으로 문의해 주세요.', method: '결제 수단', methodCk: '결제하기를 누르면 토스 결제창이 열려요.', total: '최종 결제 금액', workP: '소장가', ship: '운송비', free: '무료', sum: '총 결제 금액', all: '전체 동의', a1: '[필수] 주문·배송을 위한 개인정보 수집·이용 동의', a1d: '항목: 주문자·받는 분 이름·연락처·이메일·주소 · 목적: 주문 처리·배송·안내 · 보유: 전자상거래법에 따라 5년', a2: '[필수] 개인정보 제3자 제공 동의', a2d: '받는 자: 미술품 운송 업체 · 항목: 받는 분 이름·연락처·주소 · 목적: 배송 · 보유: 배송 완료 후 3개월', a3: '[필수] 주문 내용·환불 정책 확인 및 결제 동의', policy: '환불 정책 보기', pay: '{p} 결제하기', paying: '결제를 준비하는 중…', needAll: '주문자와 받는 분 정보, 주소를 모두 적어 주세요.', badPhone: '연락처(휴대폰 번호)를 확인해 주세요.', badEmail: '이메일 주소를 확인해 주세요.', needAgree: '필수 동의 항목에 모두 체크해 주세요.', taken: '방금 다른 분이 소장을 시작한 작품이에요. 잠시 뒤 다시 확인해 주세요.', fail: '결제를 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.', login: '로그인이 필요해요', loginT: '작품 소장은 로그인한 회원만 할 수 있어요. 로그인한 뒤 다시 와 주세요.', loginGo: '로그인하러 가기', none: '작품을 찾을 수 없어요', noneT: '판매가 끝났거나 주소가 잘못되었어요.', closed: '아직 결제가 열리지 않았어요', closedT: '지금은 소장 상담으로 안내해 드려요.', backShop: '컬렉트로 돌아가기', sold: '이미 소장된 작품이에요' },
  en: { title: 'Checkout', test: 'Test mode — Toss test payment, no real money is charged.', item: 'Artwork', buyer: 'Your details', name: 'Name', phone: 'Mobile', email: 'Email', to: 'Deliver to', same: 'Same as above', zip: 'Postal code', find: 'Find address', addr1: 'Address', addr2: 'Address line 2', memo: 'Delivery notes', memoPick: 'Choose', memo1: 'Please call before delivery', memo2: 'Leave with the building office if I am out', memo3: 'Contact me separately about installation', memoSelf: 'Write my own', domestic: 'Checkout is for delivery within Korea. For other countries, please speak with a curator.', method: 'Payment method', methodCk: 'Pressing pay opens the Toss checkout window.', total: 'Total', workP: 'Price', ship: 'Shipping', free: 'Free', sum: 'Total to pay', all: 'Agree to all', a1: '[Required] Collection and use of personal data for this order', a1d: 'Items: name, phone, email and address of buyer and recipient · Purpose: order, delivery, notices · Kept: 5 years under e-commerce law', a2: '[Required] Sharing with third parties', a2d: 'Recipient: art shipping company · Items: recipient name, phone, address · Purpose: delivery · Kept: 3 months after delivery', a3: '[Required] I have checked the order and refund policy and agree to pay', policy: 'Refund policy', pay: 'Pay {p}', paying: 'Preparing payment…', needAll: 'Please fill in your details, the recipient and the address.', badPhone: 'Please check the mobile number.', badEmail: 'Please check the email address.', needAgree: 'Please tick all required agreements.', taken: 'Someone has just started collecting this work. Please check again shortly.', fail: 'Could not start payment. Please try again shortly.', login: 'Please sign in', loginT: 'Only signed-in members can collect works. Sign in and come back.', loginGo: 'Sign in', none: 'Work not found', noneT: 'It may have been collected, or the link is wrong.', closed: 'Checkout is not open yet', closedT: 'Please speak with a curator for now.', backShop: 'Back to Collect', sold: 'Already collected' },
};
const t = (k, o) => { let s = (T[lang] || T.en)[k] ?? T.ko[k] ?? k; if (o) s = s.replace(/\{(\w+)\}/g, (_, x) => o[x] ?? ''); return s; };
const won = (n) => lang === 'ko' ? `${Number(n || 0).toLocaleString('ko-KR')}원` : `₩${Number(n || 0).toLocaleString('en-US')}`;
const box = document.getElementById('od');
const q = new URLSearchParams(location.search), workId = q.get('work') || '';
const backTo = (() => { try { return sessionStorage.getItem('nebula-shop-back') || 'collect.html'; } catch (e) { return 'collect.html'; } })();
document.getElementById('od-back').href = backTo;
document.title = 'ARTMOS — ' + t('title');
box.insertAdjacentHTML('afterend', `<div class="od-biz">${bizHTML()}</div>`);

const center = (h, p, href, label) => { box.innerHTML = `<div class="od-center"><h1>${esc(h)}</h1><p>${esc(p)}</p><a class="btn black" href="${esc(href)}">${esc(label)}</a></div>`; };

await loadShop();
const info = workInfo(workId);
if (!PAY_ON) center(t('closed'), t('closedT'), backTo, t('backShop'));
else if (!info) center(t('none'), t('noneT'), backTo, t('backShop'));
else if (info.w.status !== 'available') center(t('sold'), t('noneT'), backTo, t('backShop'));
else {
  const user = await currentUser();
  if (!user) center(t('login'), t('loginT'), 'app.html?login=1&next=' + encodeURIComponent('order.html?work=' + encodeURIComponent(workId)), t('loginGo'));
  else start(user);
}

function field(n, label, type = 'text', extra = '') { return `<label>${esc(t(label))}<input name="${n}" type="${type}" ${extra}></label>`; }
function start(user) {
  const total = info.price + SHIPPING_KRW;
  box.innerHTML = `<h1>${esc(t('title'))}</h1>${SHOP_TEST ? `<p class="od-note">${esc(t('test'))}</p>` : ''}
  <form id="od-form" novalidate>
    <section class="od-sec"><h2>${esc(t('item'))}<small>1</small></h2>
      <div class="od-item"><img src="${esc(info.img)}" alt=""><div><b>${esc(info.title)}</b><span>${esc([info.artist, info.year].filter(Boolean).join(', '))}</span><span>${esc([info.material, info.size].filter(Boolean).join(' · '))}</span><strong>${esc(won(info.price))}</strong></div></div></section>
    <section class="od-sec"><h2>${esc(t('buyer'))}</h2><div class="od-grid">
      ${field('bname', 'name', 'text', 'autocomplete="name" maxlength="40"')}${field('bphone', 'phone', 'tel', 'autocomplete="tel" inputmode="tel" maxlength="20" placeholder="010-0000-0000"')}
      <label class="full">${esc(t('email'))}<input name="bemail" type="email" autocomplete="email" maxlength="80" value="${esc(user.email || '')}"></label></div></section>
    <section class="od-sec"><h2>${esc(t('to'))}<label class="od-same"><input type="checkbox" name="same" checked> ${esc(t('same'))}</label></h2><div class="od-grid">
      ${field('rname', 'name', 'text', 'maxlength="40"')}${field('rphone', 'phone', 'tel', 'inputmode="tel" maxlength="20" placeholder="010-0000-0000"')}
      <label class="full">${esc(t('zip'))}<div class="od-row"><input name="zip" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="10"><button type="button" class="od-btn2" data-find>${esc(t('find'))}</button></div></label>
      <label class="full">${esc(t('addr1'))}<input name="addr1" type="text" autocomplete="address-line1" maxlength="120"></label>
      <label class="full">${esc(t('addr2'))}<input name="addr2" type="text" autocomplete="address-line2" maxlength="120"></label>
      <label class="full">${esc(t('memo'))}<select name="memoPick"><option value="">${esc(t('memoPick'))}</option><option>${esc(t('memo1'))}</option><option>${esc(t('memo2'))}</option><option>${esc(t('memo3'))}</option><option value="self">${esc(t('memoSelf'))}</option></select></label>
      <label class="full" data-memoself hidden><input name="memo" type="text" maxlength="120"></label></div>
      <p class="od-note" style="margin:12px 0 0">${esc(t('domestic'))}</p></section>
    <section class="od-sec"><h2>${esc(t('method'))}</h2>${WIDGET ? '<div class="od-tw"><div id="tw-methods"></div><div id="tw-agree"></div></div>' : `<p class="od-note" style="margin:0">${esc(t('methodCk'))}</p>`}</section>
    <section class="od-sec"><h2>${esc(t('total'))}</h2><dl class="od-sum"><dt>${esc(t('workP'))}</dt><dd>${esc(won(info.price))}</dd><dt>${esc(t('ship'))}</dt><dd>${SHIPPING_KRW ? esc(won(SHIPPING_KRW)) : esc(t('free'))}</dd><dt class="tot">${esc(t('sum'))}</dt><dd class="tot">${esc(won(total))}</dd></dl></section>
    <section class="od-sec od-agree">
      <label class="all"><input type="checkbox" name="all"><span>${esc(t('all'))}</span></label>
      <label><input type="checkbox" name="a1"><span>${esc(t('a1'))}</span></label><p>${esc(t('a1d'))}</p>
      <label><input type="checkbox" name="a2"><span>${esc(t('a2'))}</span></label><p>${esc(t('a2d'))}</p>
      <label><input type="checkbox" name="a3"><span>${esc(t('a3'))}</span></label><p><a href="refund.html" target="_blank" rel="noopener">${esc(t('policy'))}</a> · <a href="terms.html" target="_blank" rel="noopener">${lang === 'ko' ? '이용약관' : 'Terms'}</a></p>
    </section>
    <p class="od-err" role="alert"></p>
    <div class="od-pay"><button class="btn black" type="submit">${esc(t('pay', { p: won(total) }))}</button></div>
  </form>`;
  const f = document.getElementById('od-form'), err = f.querySelector('.od-err'), btn = f.querySelector('[type=submit]');
  const sync = () => { if (f.same.checked) { f.rname.value = f.bname.value; f.rphone.value = f.bphone.value; } f.rname.readOnly = f.rphone.readOnly = f.same.checked; };
  f.addEventListener('input', (e) => { if (['bname', 'bphone'].includes(e.target.name) || e.target.name === 'same') sync(); });
  f.same.addEventListener('change', sync); sync();
  f.memoPick.addEventListener('change', () => { f.querySelector('[data-memoself]').hidden = f.memoPick.value !== 'self'; });
  f.addEventListener('change', (e) => {
    if (e.target.name === 'all') ['a1', 'a2', 'a3'].forEach((k) => { f[k].checked = e.target.checked; });
    else if (/^a\d$/.test(e.target.name)) f.all.checked = ['a1', 'a2', 'a3'].every((k) => f[k].checked);
  });
  f.querySelector('[data-find]').addEventListener('click', () => findAddress(f));

  // 결제 수단: 결제위젯 키면 화면에 바로 그림
  let widgets = null, tp = null;
  const ready = loadToss().then(async (Toss) => {
    tp = Toss(CLIENT_KEY);
    if (!WIDGET) return;
    widgets = tp.widgets({ customerKey: user.id });
    await widgets.setAmount({ currency: 'KRW', value: total });
    await Promise.all([widgets.renderPaymentMethods({ selector: '#tw-methods', variantKey: 'DEFAULT' }), widgets.renderAgreement({ selector: '#tw-agree', variantKey: 'AGREEMENT' })]);
  }).catch(() => { err.textContent = t('fail'); });

  let order = null; // 같은 화면에서 다시 누르면 같은 주문을 씀
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); sync();
    const v = (n) => (f[n].value || '').trim(), phoneOk = (p) => /^01\d[-\s]?\d{3,4}[-\s]?\d{4}$/.test(p);
    const memo = f.memoPick.value === 'self' ? v('memo') : f.memoPick.value;
    const buyer = { name: v('rname'), phone: v('rphone'), email: v('bemail'), zip: v('zip'), addr1: v('addr1'), addr2: v('addr2'), memo, orderer: { name: v('bname'), phone: v('bphone') }, country: 'KR' };
    if (!v('bname') || !v('bphone') || !buyer.name || !buyer.phone || !buyer.zip || !buyer.addr1 || !buyer.email) { err.textContent = t('needAll'); return; }
    if (!phoneOk(v('bphone')) || !phoneOk(buyer.phone)) { err.textContent = t('badPhone'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) { err.textContent = t('badEmail'); return; }
    if (!['a1', 'a2', 'a3'].every((k) => f[k].checked)) { err.textContent = t('needAgree'); return; }
    err.textContent = ''; btn.disabled = true; const label = btn.textContent; btn.textContent = t('paying');
    try {
      await ready;
      if (!order) {
        order = await api('/create-order', { work_id: info.id, cell: info.cell || null, buyer, lang });
        saveOrder({ orderId: order.orderId, amount: order.amount, currency: 'KRW', work_id: info.id, title: info.title, artist: info.artist, cell: info.cell, at: Date.now(), status: 'pending', buyer: { name: buyer.name }, test: order.test || undefined });
        if (widgets && order.amount !== total) await widgets.setAmount({ currency: 'KRW', value: order.amount }); // 서버 금액이 기준
      }
      const req = { orderId: order.orderId, orderName: order.orderName, successUrl: `${back()}?result=success`, failUrl: `${back()}?result=fail`, customerName: v('bname'), customerEmail: buyer.email, customerMobilePhone: v('bphone').replace(/\D/g, '') };
      if (widgets) await widgets.requestPayment(req);
      else await tp.payment({ customerKey: user.id }).requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: order.amount }, ...req });
    } catch (x) {
      const code = x && x.code;
      err.textContent = code === 'NOT_AVAILABLE' ? t('taken') : code === 'LOGIN_REQUIRED' ? t('loginT') : code === 'USER_CANCEL' ? '' : ((x && x.message) || t('fail'));
    } finally { btn.disabled = false; btn.textContent = label; }
  });
}

// 주소 검색: 다음(카카오) 우편번호 서비스를 화면 위 창으로
function findAddress(f) {
  const layer = document.getElementById('od-post'), inner = document.getElementById('od-post-box');
  const open = () => {
    layer.hidden = false; inner.innerHTML = '';
    new window.daum.Postcode({
      oncomplete: (d) => { f.zip.value = d.zonecode; f.addr1.value = d.roadAddress || d.jibunAddress; layer.hidden = true; f.addr2.focus(); },
      width: '100%', height: '100%',
    }).embed(inner);
  };
  layer.onclick = (e) => { if (e.target === layer || e.target.closest('[data-postclose]')) layer.hidden = true; };
  if (window.daum && window.daum.Postcode) return open();
  const s = document.createElement('script'); s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'; s.onload = open; document.head.appendChild(s);
}
