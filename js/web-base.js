// 앱 껍데기(valixlabs/valixlab)에 넣어 둔 앱 틀에서는 <meta name="artmos-web" content="https://…/artmos/"> 가 붙어 있음.
// 그때는 자주 바뀌는 것(전시 페이지·데이터·포스터·약관)을 웹 주소에서 불러옴.
// 웹(GitHub Pages)에서는 이 meta가 없으니 아무것도 바뀌지 않음.
const m = typeof document !== 'undefined' && document.querySelector('meta[name="artmos-web"]');
export const WEB = (m && m.content) || '';
export const IN_SHELL = !!WEB;
// 'cell.html?id=c005' → 앱 안이면 'https://valixlabs.github.io/artmos/cell.html?id=c005', 웹이면 그대로
export const web = (p) => (WEB && p && !/^(?:[a-z][\w+.-]*:|\/\/|#|\/)/i.test(p) ? new URL(p, WEB).href : p);
