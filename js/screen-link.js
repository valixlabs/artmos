// ARTMOS SCREEN 연결 — 큰 화면(screen.html)과 휴대폰(remote.html)을 잇는 통로.
// 기본: Supabase Realtime(브로드캐스트, 서버에 저장 안 함, 공개 publishable 키만 씀).
// ?local=1 이면 같은 브라우저 안 BroadcastChannel(인터넷 없이 창 두 개로 시험).
//
// 통로 이름
//   artmos-scr-<코드>        : 휴대폰 → '들어갈게요'(join), 화면 → 모두에게 알림(드묾)
//   artmos-scr-<코드>-<pid>  : 휴대폰 한 대 ↔ 화면 (조이스틱 입력·결과는 여기만, 다른 휴대폰에게 가지 않음)
import { CONFIG } from './config.js?v=38';

const LOCAL = /[?&]local=1/.test(location.search) || !(CONFIG.auth && CONFIG.auth.supabaseUrl);
let sbP = null;
function supa() {
  if (!sbP) sbP = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
    createClient(CONFIG.auth.supabaseUrl, CONFIG.auth.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 40 } },
    }));
  return sbP;
}

export const linkMode = LOCAL ? 'local' : 'realtime';
export const room = (code) => `artmos-scr-${code}`;

// open(이름, 받는 함수, { presence }) → { send(메시지), track(상태), close(), ready: Promise }
export function open(name, onMsg, opt = {}) {
  if (LOCAL) {
    const bc = new BroadcastChannel(name);
    bc.onmessage = (e) => onMsg(e.data);
    return { send: (m) => bc.postMessage(m), track() {}, close: () => bc.close(), ready: Promise.resolve(true), others: () => [] };
  }
  let ch = null, closed = false, ok = false;
  const queue = [];
  const api = {
    send(m) { if (ok && ch) ch.send({ type: 'broadcast', event: 'm', payload: m }).catch(() => {}); else if (queue.length < 20) queue.push(m); },
    track(s) { if (ch) ch.track(s).catch(() => {}); },
    others: () => (ch ? Object.values(ch.presenceState()).flat() : []),
    close() { closed = true; if (ch) supa().then((sb) => sb.removeChannel(ch)).catch(() => {}); },
  };
  api.ready = supa().then((sb) => new Promise((res) => {
    if (closed) return res(false);
    ch = sb.channel(name, { config: { broadcast: { self: false, ack: false }, presence: opt.presence ? { key: opt.presence } : undefined } });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload));
    if (opt.onPresence) ch.on('presence', { event: 'sync' }, () => opt.onPresence(api.others()));
    let done = false;
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') { ok = true; queue.splice(0).forEach((m) => api.send(m)); if (!done) { done = true; res(true); } }
      else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !done) { done = true; res(false); }
    });
    setTimeout(() => { if (!done) { done = true; res(false); } }, 9000);
  })).catch(() => false);
  return api;
}

export const newCode = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
export const newId = () => Math.random().toString(36).slice(2, 10);
