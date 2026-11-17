// 사업자 정보 표시(전자상거래법·카카오 비즈 앱 심사용) — 앱 마이·로그인 화면, 웹 컬렉트·주문 페이지 아래에 공통으로.
// 값은 사업자등록증과 같게. 통신판매업 신고번호·고객센터 연락처는 생기면 여기에 채움(빈 값은 표시하지 않음).
import { lang } from './i18n.js?v=6';

export const BIZ = {
  name: '주식회사 밸릭스랩', nameEn: 'VALIX LAB',
  ceo: '김승수', ceoEn: 'Kim Seungsu',
  bizNo: '877-86-03639',
  address: '전남광주통합특별시 동구 중앙로 358, 2층 292-13호(계림동, 금호계림주상복합)',
  mailOrderNo: '', // 통신판매업 신고번호(신고 후 채움)
  email: '', phone: '', // 고객센터(정해지면 채움)
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function bizHTML(base = '') {
  const ko = lang === 'ko';
  const rows = [
    [ko ? '상호' : 'Company', ko ? `${BIZ.name} (${BIZ.nameEn})` : `${BIZ.nameEn} (${BIZ.name})`],
    [ko ? '대표' : 'CEO', ko ? BIZ.ceo : BIZ.ceoEn],
    [ko ? '사업자등록번호' : 'Business reg. no.', BIZ.bizNo],
    BIZ.mailOrderNo && [ko ? '통신판매업 신고' : 'Mail-order reg.', BIZ.mailOrderNo],
    [ko ? '주소' : 'Address', BIZ.address],
    BIZ.email && [ko ? '이메일' : 'Email', BIZ.email],
    BIZ.phone && [ko ? '고객센터' : 'Support', BIZ.phone],
  ].filter(Boolean);
  const links = [['terms.html', ko ? '이용약관' : 'Terms'], ['privacy.html', ko ? '개인정보처리방침' : 'Privacy'], ['refund.html', ko ? '환불 정책' : 'Refunds']];
  return `<footer class="biz-info"><p class="biz-links">${links.map(([h, l]) => `<a href="${base}${h}" target="_blank" rel="noopener">${esc(l)}</a>`).join('<span>·</span>')}</p>
    <p class="biz-rows">${rows.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</p><p class="biz-copy">© ${new Date().getFullYear()} ${esc(BIZ.nameEn)}. ARTMOS</p></footer>`;
}
