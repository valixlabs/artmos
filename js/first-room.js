// A-001 최초의 방 — 고민 하나를 들고 우주 끝까지 (손끝 · 숨 · 눈 · 귀 · 혀)
// cell.js가 g001 기획전에 자기 블록(cell_id = g001)이 있을 때만 불러옵니다.
// 블록 type: sense(감각 표지) · worry(고민 적기·무게) · breath(숨 세 번) · zoom(10배씩 멀어지기) · sip(물 한 모금) · release(놓아 주기)
// 적은 고민은 이 화면의 메모리에만 있고, 저장·전송하지 않습니다.
import { IS_MOBILE, sensor, startMic } from './sensors.js?v=5';
import { DICT } from './i18n-dict.js?v=6';
import { tr } from './i18n.js?v=7';

// 이 파일의 화면 문구 번역 (한국어 = 키) [en, zh, ja]
const WORDS = {
  '오늘의 고민': ["Today's worry", '今天的烦恼', '今日の悩み'],
  '예: 내일 발표가 무서워요': ["e.g. I'm scared of tomorrow's presentation", '例如：明天的发表让我害怕', '例：明日の発表がこわい'],
  '일': ['Work', '工作', '仕事'],
  '사람': ['People', '人际', '人間関係'],
  '돈': ['Money', '钱', 'お金'],
  '몸과 마음': ['Body & mind', '身心', '体と心'],
  '내일': ['Tomorrow', '明天', '明日'],
  '나 자신': ['Myself', '我自己', '自分自身'],
  '이 고민을 들고 들어가기': ['Carry this worry in', '带着这个烦恼进去', 'この悩みを持って入る'],
  '이제 그 고민을 손끝으로 느껴 보세요.': ['Now feel that worry with your fingertip.', '现在，用指尖感受这个烦恼。', 'その悩みを指先で感じてみてください。'],
  '지금 느끼는 무게만큼 꾹 누르고 있다가 떼세요.': ['Press and hold for as long as it feels heavy, then let go.', '按住它，按到和你感受到的重量一样久，再松开。', '感じている重さの分だけ長押しして、離してください。'],
  '꾹 눌러 고민의 무게 정하기': ['Press and hold to set the weight of your worry', '按住来决定烦恼的重量', '長押しで悩みの重さを決める'],
  '무게 {n} / 10': ['Weight {n} / 10', '重量 {n} / 10', '重さ {n} / 10'],
  '무게 {n} / 10 — 이 무게를 기억해 두세요. 이제 천천히 내려가세요.': ['Weight {n} / 10 — remember this weight. Now scroll down slowly.', '重量 {n} / 10 — 记住这个重量。现在慢慢往下。', '重さ {n} / 10 — この重さを覚えておいてください。ゆっくり下へ。'],
  '적은 글은 이 화면에만 잠시 머물고, 저장하거나 보내지 않아요.': ['What you write stays on this screen only. It is never saved or sent.', '你写的内容只在这个画面里停留，不会保存或发送。', '書いた言葉はこの画面にだけとどまり、保存も送信もしません。'],
  '준비가 되면 눌러 주세요': ['Press when you are ready', '准备好了就按下', '準備ができたら押してください'],
  '숨 세 번 쉬기': ['Take three breaths', '呼吸三次', '三回、息をする'],
  '후 불기 켜기 (마이크)': ['Turn on blowing (mic)', '开启吹气（麦克风）', '息を吹く（マイク）'],
  '후 불기 켜짐 — 내쉴 때 화면에 후~': ['Blowing on — breathe out onto the screen', '吹气已开启 — 呼气时对着屏幕吹', 'オン — 吐くときに画面へふーっと'],
  '마이크를 쓸 수 없어요. 숨만 쉬어도 괜찮아요.': ["The mic isn't available. Just breathing is fine.", '无法使用麦克风。只是呼吸也可以。', 'マイクが使えません。息をするだけで大丈夫です。'],
  '들이쉬세요': ['Breathe in', '吸气', '吸って'],
  '잠깐 멈추세요': ['Hold', '停一下', '止めて'],
  '내쉬세요': ['Breathe out', '呼气', '吐いて'],
  '{n}번째 숨': ['Breath {n}', '第 {n} 次呼吸', '{n}回目の息'],
  '숨에는 냄새가 있어요. 지금 당신 방의 공기는 어떤 냄새인가요? 그 냄새를 잠깐 기억해 두세요.': ['Breath has a smell. What does the air in your room smell like right now? Hold on to it for a moment.', '呼吸是有气味的。此刻你房间里的空气是什么味道？记住它一会儿。', '息にはにおいがあります。いま、あなたの部屋の空気はどんなにおいですか？少しだけ覚えておいてください。'],
  '고민의 크기': ['Size of your worry', '烦恼的大小', '悩みの大きさ'],
  '화면의 {r}': ['{r} of the screen', '屏幕的 {r}', '画面の {r}'],
  '당신의 고민': ['your worry', '你的烦恼', 'あなたの悩み'],
  '여기 어딘가': ['somewhere here', '就在这里某处', 'このどこか'],
  '손바닥 위의 고민': ['A worry in your palm', '掌心里的烦恼', '手のひらの悩み'],
  '약 10cm': ['about 10 cm', '约 10 厘米', '約10cm'],
  '당신의 방': ['Your room', '你的房间', 'あなたの部屋'],
  '약 4m': ['about 4 m', '约 4 米', '約4m'],
  '동네': ['Your neighborhood', '街区', '町内'],
  '약 1km': ['about 1 km', '约 1 公里', '約1km'],
  '한반도': ['The Korean Peninsula', '朝鲜半岛', '朝鮮半島'],
  '약 1,000km': ['about 1,000 km', '约 1,000 公里', '約1,000km'],
  '지구': ['Earth', '地球', '地球'],
  '지름 12,742km': ['12,742 km across', '直径 12,742 公里', '直径12,742km'],
  '지구와 달': ['Earth and the Moon', '地球与月球', '地球と月'],
  '빛으로 1.3초': ['1.3 seconds at light speed', '光走 1.3 秒', '光で1.3秒'],
  '태양과 지구': ['The Sun and Earth', '太阳与地球', '太陽と地球'],
  '빛으로 8분 20초': ['8 min 20 s at light speed', '光走 8 分 20 秒', '光で8分20秒'],
  '태양계': ['The Solar System', '太阳系', '太陽系'],
  '해왕성까지 빛으로 약 4시간': ['about 4 hours of light to Neptune', '光到海王星约 4 小时', '海王星まで光で約4時間'],
  '태양계의 가장자리': ['The edge of the Solar System', '太阳系的边缘', '太陽系の果て'],
  '오르트 구름 — 빛으로 약 1년': ['The Oort cloud — about a year at light speed', '奥尔特云 — 光走约一年', 'オールトの雲 — 光で約1年'],
  '가까운 별들': ['The nearest stars', '邻近的恒星', '近くの星々'],
  '프록시마 센타우리까지 4.2광년': ['4.2 light-years to Proxima Centauri', '到比邻星 4.2 光年', 'プロキシマ・ケンタウリまで4.2光年'],
  '우리 은하': ['The Milky Way', '银河系', '天の川銀河'],
  '지름 약 10만 광년': ['about 100,000 light-years across', '直径约 10 万光年', '直径約10万光年'],
  '이웃 은하들': ['Neighboring galaxies', '邻近星系', '近くの銀河たち'],
  '안드로메다까지 250만 광년': ['2.5 million light-years to Andromeda', '到仙女座 250 万光年', 'アンドロメダまで250万光年'],
  '관측 가능한 우주': ['The observable universe', '可观测宇宙', '観測可能な宇宙'],
  '지름 약 930억 광년': ['about 93 billion light-years across', '直径约 930 亿光年', '直径約930億光年'],
  '관측 가능한 우주의 한가운데에는 언제나 보는 사람이 있어요. 지금은 당신이.': ['At the center of the observable universe there is always someone looking. Right now, it is you.', '可观测宇宙的正中央，永远是正在观看的人。此刻，是你。', '観測可能な宇宙の真ん中には、いつも見ている人がいます。いまは、あなたが。'],
  '더 이상 떨리지 않아요': ['It no longer trembles', '它不再颤动了', 'もう震えません'],
  '바퀴': ['laps', '圈', '周'],
  '마시는 동안 꾹 누르기': ['Hold while you sip', '喝水时按住', '飲むあいだ長押し'],
  '{s}초 동안 빛은 지구를 {n}바퀴 돌았어요. 그동안 당신은 물맛만 느꼈어요.': ['In {s} seconds, light circled Earth {n} times. All that while, you only tasted water.', '在 {s} 秒里，光绕地球转了 {n} 圈。这段时间里，你只尝到了水的味道。', '{s}秒のあいだに光は地球を{n}周しました。そのあいだ、あなたは水の味だけを感じていました。'],
  '꾹 눌러 놓아 주기': ['Press and hold to let go', '按住，放下它', '長押しで手放す'],
  '꾹 누르거나, 폰을 엎어 두기': ['Press and hold, or lay your phone face down', '按住，或把手机朝下放', '長押しするか、スマホを伏せる'],
  '놓아 주는 중…': ['Letting go…', '正在放下…', '手放しています…'],
  '어느 별이었는지, 이제 찾을 수 없어요.': ['You can no longer tell which star it was.', '已经找不到是哪一颗星了。', 'どの星だったのか、もう見つけられません。'],
  '별을 눌러 보세요': ['Tap the star', '点一下那颗星', '星を押してみてください'],
  '별을 눌러 보세요 · 기울이면 하늘이 움직여요': ['Tap the star · tilt to move the sky', '点一下那颗星 · 倾斜，天空会移动', '星を押してみてください · 傾けると空が動きます'],
  '오늘의 별자리': ["Today's constellation", '今天的星座', '今日の星座'],
  '여기 있어요': ['Here it is', '在这里', 'ここにあります'],
  '지금, 그 고민의 무게는 얼마인가요?': ['Right now, how heavy is that worry?', '现在，这个烦恼有多重？', 'いま、その悩みの重さはどれくらいですか？'],
  '들어올 때 {a} → 지금 {b}': ['When you came in {a} → now {b}', '进来时 {a} → 现在 {b}', '入ったとき {a} → いま {b}'],
  '지금 {b}': ['Now {b}', '现在 {b}', 'いま {b}'],
  '조금 가벼워졌다면, 고민이 작아져서가 아니라 당신이 본 세상이 커져서예요.': ['If it feels a little lighter, it is not because the worry shrank. The world you looked at grew larger.', '如果感觉轻了一点，不是烦恼变小了，而是你看到的世界变大了。', '少し軽くなったなら、それは悩みが小さくなったからではなく、あなたが見た世界が大きくなったからです。'],
  '그대로여도 괜찮아요. 무거운 고민은 천천히 작아져요. 오늘은 우주 끝까지 함께 다녀온 것으로 충분해요.': ['It is okay if it feels the same. Heavy worries shrink slowly. Today, traveling to the edge of the universe together is enough.', '没有变化也没关系。沉重的烦恼会慢慢变小。今天，一起去过宇宙的尽头，就已经足够。', '変わらなくても大丈夫。重い悩みはゆっくり小さくなります。今日は宇宙の果てまで一緒に行ってきた、それで十分です。'],
};
const IDX = { en: 0, zh: 1, ja: 2 };
Object.entries(WORDS).forEach(([ko, a]) => Object.entries(IDX).forEach(([l, i]) => { DICT[l][ko] = a[i]; }));

// 지금 들고 있는 고민 (메모리에만)
const W = { text: '', weight: 0 };
const worryText = () => W.text || tr('오늘의 고민');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const seen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

// 짧은 소리 (소리 끄기면 울리지 않음). 첫 터치 뒤에만 울림
let ac = null;
const muted = () => { try { return localStorage.getItem('xpace-sound') === 'off'; } catch (e) { return false; } };
function wake() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) {} }
function tone(f, { dur = 1.8, vol = 0.05, type = 'sine', glide = 0 } = {}) {
  if (!ac || ac.state !== 'running' || muted()) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
}
const thump = (k) => { tone(58, { dur: 0.35, vol: 0.08 + k * 0.03, glide: 0.6 }); setTimeout(() => tone(52, { dur: 0.3, vol: 0.05 + k * 0.02, glide: 0.6 }), 150); };
['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, wake, { capture: true, passive: true }));

function fillWords() { document.querySelectorAll('.fr-wordslot').forEach((el) => { el.textContent = worryText(); }); }

export function renderers({ esc, paras }) {
  const head = (b) => `<div class="q-head reveal">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${paras(b.body)}</div>`;
  const CHIPS = ['일', '사람', '돈', '몸과 마음', '내일', '나 자신'];
  return {
    // 감각 표지: caption = SENSE 01, title = 손끝, body = 촉각
    sense: (b) => `<section class="fr-sense"><div class="reveal"><span class="fr-num">${esc(b.caption || '')}</span><i class="fr-line"></i><strong>${esc(b.title || '')}</strong>${b.body ? `<em>${esc(b.body)}</em>` : ''}</div></section>`,
    worry: (b) => `<section class="b-worry fr-sec"><div class="fr-wrap">${head(b)}
      <form class="fr-form reveal" autocomplete="off">
        <label class="sr" for="fr-in">${tr('오늘의 고민')}</label>
        <input id="fr-in" class="fr-in" maxlength="40" enterkeyhint="done" placeholder="${esc(tr('예: 내일 발표가 무서워요'))}" />
        <div class="fr-chips">${CHIPS.map((c) => `<button type="button" data-w="${esc(tr(c))}">${esc(tr(c))}</button>`).join('')}</div>
        <button type="submit" class="fr-btn">${tr('이 고민을 들고 들어가기')}</button>
      </form>
      <div class="fr-hold" hidden>
        <p class="fr-say">${tr('이제 그 고민을 손끝으로 느껴 보세요.')}<br />${tr('지금 느끼는 무게만큼 꾹 누르고 있다가 떼세요.')}</p>
        <button class="fr-orb" type="button" aria-label="${esc(tr('꾹 눌러 고민의 무게 정하기'))}"><i class="fr-ring"></i><span class="fr-wordslot"></span></button>
        <p class="fr-meter" aria-live="polite">${tr('무게 {n} / 10', { n: 0 })}</p>
      </div>
      <p class="fr-note">${tr('적은 글은 이 화면에만 잠시 머물고, 저장하거나 보내지 않아요.')}</p>
    </div></section>`,
    breath: (b) => `<section class="b-breath fr-sec"><div class="fr-wrap">${head(b)}
      <div class="br-stage reveal"><div class="br-circle"><span class="br-word fr-wordslot"></span></div><p class="br-cue">${tr('준비가 되면 눌러 주세요')}</p></div>
      <div class="br-row"><button type="button" class="fr-btn br-go">${tr('숨 세 번 쉬기')}</button>${IS_MOBILE ? `<button type="button" class="fr-btn ghost br-mic">${tr('후 불기 켜기 (마이크)')}</button>` : ''}</div>
      <p class="br-after fr-say" hidden>${tr('숨에는 냄새가 있어요. 지금 당신 방의 공기는 어떤 냄새인가요? 그 냄새를 잠깐 기억해 두세요.')}</p>
    </div></section>`,
    zoom: (b) => `<section class="b-zoom"><div class="zm-sticky"><canvas class="zm-cv" aria-hidden="true"></canvas>
      <div class="zm-top">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${paras(b.body)}</div>
      <div class="zm-hud" aria-live="polite"><strong class="zm-name"></strong><span class="zm-note"></span><span class="zm-ratio"></span></div>
      <p class="zm-last">${tr('관측 가능한 우주의 한가운데에는 언제나 보는 사람이 있어요. 지금은 당신이.')}</p>
    </div></section>`,
    sip: (b) => `<section class="b-sip fr-sec"><div class="fr-wrap">${head(b)}
      <div class="sp-stage reveal"><canvas class="sp-cv" aria-hidden="true"></canvas><div class="sp-hud"><b class="sp-n">0</b> ${tr('바퀴')}</div></div>
      <div class="br-row"><button type="button" class="fr-btn sp-hold">${tr('마시는 동안 꾹 누르기')}</button></div>
      <p class="sp-msg fr-say" aria-live="polite"></p>
    </div></section>`,
    // 피날레: 손끝에 적은 고민이 밤하늘의 별 하나로 (별자리로 이어짐)
    finale: (b) => `<section class="b-finale"><div class="fn-sticky"><canvas class="fn-cv" aria-hidden="true"></canvas>
      <div class="fn-text">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${paras(b.body)}</div>
      <p class="fn-hint">${tr(IS_MOBILE ? '별을 눌러 보세요 · 기울이면 하늘이 움직여요' : '별을 눌러 보세요')}</p>
    </div></section>`,
    release: (b) => `<section class="b-release"><canvas class="rl-cv" aria-hidden="true"></canvas>
      <div class="rl-inner">${head(b)}
        <button type="button" class="fr-btn rl-hold"><i></i><span>${tr(IS_MOBILE ? '꾹 누르거나, 폰을 엎어 두기' : '꾹 눌러 놓아 주기')}</span></button>
        <p class="rl-msg fr-say" aria-live="polite"></p>
        <div class="rl-ask" hidden><p class="fr-say">${tr('지금, 그 고민의 무게는 얼마인가요?')}</p>
          <div class="rl-dots">${Array.from({ length: 10 }, (_, k) => `<button type="button" data-n="${k + 1}" aria-label="${k + 1}">${k + 1}</button>`).join('')}</div>
          <p class="rl-cmp fr-say" aria-live="polite"></p></div>
      </div></section>`,
  };
}

export function setup() {
  fillWords();
  setupWorry(); setupBreath(); setupZoom(); setupSip(); setupRelease(); setupFinale();
}

// 길게 누르기 공용: 버튼을 누르고 있는 동안 onTick(초), 떼면 onEnd(초). 스페이스·엔터 꾹도 됨
function holdable(btn, onStart, onTick, onEnd) {
  let t0 = 0, raf = 0;
  const loop = (now) => { if (!t0) return; onTick((now - t0) / 1000); raf = requestAnimationFrame(loop); };
  const down = (e) => { if (t0) return; if (e.type === 'pointerdown') { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) {} } wake(); t0 = performance.now(); btn.classList.add('holding'); onStart && onStart(); raf = requestAnimationFrame(loop); };
  const up = () => { if (!t0) return; const s = (performance.now() - t0) / 1000; t0 = 0; cancelAnimationFrame(raf); btn.classList.remove('holding'); onEnd(s); };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, up));
  btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(e); } });
  btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------- 손끝: 고민 적기 → 꾹 눌러 무게 ----------
function setupWorry() {
  document.querySelectorAll('.b-worry').forEach((sec) => {
    const form = sec.querySelector('.fr-form'), input = sec.querySelector('.fr-in'), hold = sec.querySelector('.fr-hold');
    const orb = sec.querySelector('.fr-orb'), meter = sec.querySelector('.fr-meter');
    sec.querySelectorAll('.fr-chips button').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.w; sec.querySelectorAll('.fr-chips button').forEach((x) => x.classList.toggle('on', x === b)); }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      W.text = input.value.trim().slice(0, 40); fillWords();
      input.blur(); form.classList.add('done'); hold.hidden = false;
      setTimeout(() => hold.classList.add('in'), 30);
      hold.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });
    let w = 0, beat = 0;
    holdable(orb, () => { w = 0; beat = 0; }, (s) => {
      w = Math.min(10, s / 0.55); // 5.5초면 10
      orb.style.setProperty('--w', w.toFixed(2));
      meter.textContent = tr('무게 {n} / 10', { n: Math.max(1, Math.round(w)) });
      const gap = 1.0 - w * 0.06; // 무거울수록 심장이 빨리
      if (s >= beat) { beat = s + gap; thump(w / 10); if (IS_MOBILE) sensor.vibrate([18 + w * 7, 90, 12 + w * 5]); }
    }, () => {
      W.weight = Math.max(1, Math.round(w));
      meter.textContent = tr('무게 {n} / 10 — 이 무게를 기억해 두세요. 이제 천천히 내려가세요.', { n: W.weight });
      orb.classList.add('set');
    });
  });
}

// ---------- 숨: 4초 들이쉬기 · 2초 멈춤 · 6초 내쉬기 × 3 ----------
function setupBreath() {
  document.querySelectorAll('.b-breath').forEach((sec) => {
    const circle = sec.querySelector('.br-circle'), word = sec.querySelector('.br-word'), cue = sec.querySelector('.br-cue');
    const go = sec.querySelector('.br-go'), micBtn = sec.querySelector('.br-mic'), after = sec.querySelector('.br-after');
    const PH = [[4, '들이쉬세요', 0.55, 1], [2, '잠깐 멈추세요', 1, 1], [6, '내쉬세요', 1, 0.55]];
    const ROUND = 12, TOTAL = ROUND * 3;
    let t0 = 0, loose = 0, lastPh = -1;
    if (micBtn) micBtn.addEventListener('click', async () => {
      try { await startMic(); micBtn.textContent = tr('후 불기 켜짐 — 내쉴 때 화면에 후~'); micBtn.disabled = true; } catch (e) { micBtn.textContent = tr('마이크를 쓸 수 없어요. 숨만 쉬어도 괜찮아요.'); micBtn.disabled = true; }
    });
    go.addEventListener('click', () => {
      if (t0) return; t0 = performance.now(); go.disabled = true; sec.classList.add('on'); loose = 0; lastPh = -1;
      requestAnimationFrame(step);
    });
    function step(now) {
      const e = (now - t0) / 1000;
      if (e >= TOTAL) {
        t0 = 0; go.disabled = false; sec.classList.remove('on'); circle.style.setProperty('--s', 0.8);
        cue.textContent = ''; after.hidden = false; requestAnimationFrame(() => after.classList.add('in'));
        if (IS_MOBILE) sensor.vibrate(40); return;
      }
      const round = Math.floor(e / ROUND), r = e - round * ROUND;
      let acc = 0, k = 0; while (k < 2 && r >= acc + PH[k][0]) { acc += PH[k][0]; k++; }
      const [dur, label, a, b] = PH[k], f = (r - acc) / dur, ease = 0.5 - Math.cos(f * Math.PI) / 2;
      const s = a + (b - a) * ease;
      circle.style.setProperty('--s', s.toFixed(3));
      const id = round * 3 + k;
      if (id !== lastPh) {
        lastPh = id;
        if (k === 0) tone(196, { dur: 3.8, vol: 0.035 }); if (k === 2) tone(147, { dur: 5.5, vol: 0.035 });
        if (IS_MOBILE && k !== 1) sensor.vibrate(k === 0 ? 12 : [8, 60, 8]);
      }
      cue.textContent = `${tr('{n}번째 숨', { n: round + 1 })} · ${tr(label)} ${Math.ceil(dur - (r - acc))}`;
      // 내쉴 때 고민 글자가 조금씩 풀림 (후 불면 더 많이)
      if (k === 2) loose = Math.min(1, loose + 0.0009 + (sensor.blow || 0) * 0.012);
      word.style.setProperty('--loose', loose.toFixed(3));
      requestAnimationFrame(step);
    }
  });
}

// ---------- 눈: 스크롤할 때마다 10배씩 멀어지기 ----------
const LY = 9.461e15, AU = 1.496e11;
const LEVELS = [ // [화면 폭(m), 이름, 설명]
  [0.3, '손바닥 위의 고민', '약 10cm'],
  [8, '당신의 방', '약 4m'],
  [2.5e3, '동네', '약 1km'],
  [2.2e6, '한반도', '약 1,000km'],
  [3.2e7, '지구', '지름 12,742km'],
  [1.1e9, '지구와 달', '빛으로 1.3초'],
  [4.5e11, '태양과 지구', '빛으로 8분 20초'],
  [1.1e13, '태양계', '해왕성까지 빛으로 약 4시간'],
  [6e15, '태양계의 가장자리', '오르트 구름 — 빛으로 약 1년'],
  [1.2e17, '가까운 별들', '프록시마 센타우리까지 4.2광년'],
  [1.3e21, '우리 은하', '지름 약 10만 광년'],
  [7e22, '이웃 은하들', '안드로메다까지 250만 광년'],
  [1.25e27, '관측 가능한 우주', '지름 약 930억 광년'],
];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((d) => SUP[d] || d).join('');
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function setupZoom() {
  document.querySelectorAll('.b-zoom').forEach((sec) => {
    const cv = sec.querySelector('.zm-cv'), g = cv.getContext('2d');
    const nameEl = sec.querySelector('.zm-name'), noteEl = sec.querySelector('.zm-note'), ratioEl = sec.querySelector('.zm-ratio');
    const top = sec.querySelector('.zm-top'), last = sec.querySelector('.zm-last');
    const dpr = Math.min(devicePixelRatio, IS_MOBILE ? 1.5 : 2);
    let w = 0, h = 0, visible = false, lvl = -1, view = LEVELS[0][0];
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(sec);
    // 세계 좌표(미터, 고민 = 0,0, 아래가 +y)
    const R = rng(7);
    const GROUND = 1.0, RE = 6.371e6, EC = { x: 0, y: GROUND + RE };
    const SUN = { x: EC.x - AU * 0.8, y: EC.y - AU * 0.6 };
    const GC = { x: SUN.x + 2.46e20 * 0.6, y: SUN.y - 2.46e20 * 0.8 };
    const AND = { x: GC.x - 2.37e22 * 0.7, y: GC.y + 2.37e22 * 0.71 };
    const houses = Array.from({ length: 260 }, () => { const a = R() * 6.283, d = 30 + Math.sqrt(R()) * 900; return { x: Math.cos(a) * d, y: GROUND - 0.001, s: 8 + R() * 14, a, d }; });
    const near = Array.from({ length: 160 }, () => { const a = R() * 6.283, d = Math.sqrt(R()) * 1.4e17; return { x: SUN.x + Math.cos(a) * d, y: SUN.y + Math.sin(a) * d, b: 0.3 + R() * 0.7 }; });
    const PROX = { x: SUN.x - 3.97e16 * 0.3, y: SUN.y + 3.97e16 * 0.95 };
    const arms = Array.from({ length: 2400 }, () => { const arm = R() < 0.5 ? 0 : Math.PI, r = Math.pow(R(), 0.7) * 4.7e20, a = arm + r / 1.1e20 + (R() - 0.5) * 0.9; return { x: GC.x + Math.cos(a) * r, y: GC.y + Math.sin(a) * r * 0.9, b: R(), c: R() < 0.3 }; });
    const andro = Array.from({ length: 700 }, () => { const r = Math.pow(R(), 0.8) * 1.1e21, a = R() * 6.283; return { x: AND.x + Math.cos(a) * r * Math.cos(0.6) - Math.sin(a) * r * 0.35 * Math.sin(0.6), y: AND.y + Math.cos(a) * r * Math.sin(0.6) + Math.sin(a) * r * 0.35 * Math.cos(0.6) }; });
    // 우주 거대 구조: 은하 무리를 실처럼 잇기
    const web = []; { let x = 0, y = 0; for (let i = 0; i < 3600; i++) { if (i % 120 === 0) { const a = R() * 6.283, d = Math.sqrt(R()) * 4.3e26; x = Math.cos(a) * d; y = Math.sin(a) * d; } const a = R() * 6.283; x += Math.cos(a) * 6e24; y += Math.sin(a) * 6e24; if (Math.hypot(x, y) < 4.4e26) web.push({ x, y, b: R() }); } }
    const oort = Array.from({ length: 900 }, () => { const a = R() * 6.283, d = 3e14 + Math.pow(R(), 0.6) * 1.5e16; return { x: SUN.x + Math.cos(a) * d, y: SUN.y + Math.sin(a) * d * 0.95, b: R() }; });
    const PLANETS = [0.39, 0.72, 1, 1.52, 5.2, 9.58, 19.2, 30.1];
    const bg = Array.from({ length: 220 }, () => ({ x: R(), y: R(), b: R() }));
    const progress = () => { const r = sec.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };
    function draw(now) {
      if (!visible) return;
      const p = progress(), t = now / 1000;
      const L0 = Math.log10(LEVELS[0][0]), L1 = Math.log10(LEVELS[LEVELS.length - 1][0]);
      const target = Math.pow(10, L0 + (L1 - L0) * p);
      view = reduced ? target : Math.pow(10, Math.log10(view) + (Math.log10(target) - Math.log10(view)) * 0.18);
      const k = w / view, cx = w / 2, cy = h * 0.46;
      const X = (x) => cx + x * k, Y = (y) => cy + y * k;
      g.fillStyle = '#04050b'; g.fillRect(0, 0, w, h);
      // 배경 별 (기울이면 살짝 움직임)
      const ox = IS_MOBILE && sensor.on ? sensor.tiltX * 14 : 0, oy = IS_MOBILE && sensor.on ? sensor.tiltY * 14 : 0;
      const bgA = clamp((Math.log10(view) - 7) / 3, 0, 1) * 0.9 + 0.1;
      for (const s of bg) { g.globalAlpha = bgA * (0.25 + s.b * 0.5) * (0.8 + Math.sin(t * 1.5 + s.b * 9) * 0.2); g.fillStyle = '#dfe6ff'; g.fillRect(s.x * w + ox * s.b, s.y * h + oy * s.b, 1.2, 1.2); }
      g.globalAlpha = 1;
      const ring = (x, y, r, col, lw = 1) => { const rp = r * k; if (rp < 1.5 || rp > 4e4) return; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(X(x), Y(y), rp, 0, 6.283); g.stroke(); };
      const label = (x, y, txt, a = 0.7) => { g.globalAlpha = a; g.fillStyle = '#e8ecff'; g.font = '500 12px Pretendard, sans-serif'; g.textAlign = 'left'; g.fillText(txt, X(x) + 8, Y(y) - 8); g.globalAlpha = 1; };
      // 관측 가능한 우주
      const uR = 4.4e26 * k;
      if (uR > 3 && uR < 4e4) {
        const grd = g.createRadialGradient(cx, cy, uR * 0.9, cx, cy, uR * 1.04);
        grd.addColorStop(0, 'rgba(255,170,120,0)'); grd.addColorStop(0.7, 'rgba(255,170,120,.18)'); grd.addColorStop(1, 'rgba(255,170,120,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, uR * 1.04, 0, 6.283); g.fill();
      }
      if (5e23 * k > 1) { for (const q of web) { const px = X(q.x), py = Y(q.y); if (px < -2 || px > w + 2 || py < -2 || py > h + 2) continue; g.globalAlpha = 0.25 + q.b * 0.5; g.fillStyle = q.b > 0.85 ? '#ffd6b0' : '#b9c8ff'; g.fillRect(px, py, 1.3, 1.3); } g.globalAlpha = 1; }
      // 안드로메다 · 우리 은하
      if (1.1e21 * k > 2) { g.fillStyle = '#dcd3ff'; for (const q of andro) { const px = X(q.x), py = Y(q.y); if (px < 0 || px > w || py < 0 || py > h) continue; g.globalAlpha = 0.35; g.fillRect(px, py, 1.2, 1.2); } g.globalAlpha = 1; if (view > 8e21) label(AND.x, AND.y, tr('이웃 은하들')); }
      const gR = 4.7e20 * k;
      if (gR > 2 && gR < 2e5) {
        const glow = g.createRadialGradient(X(GC.x), Y(GC.y), 0, X(GC.x), Y(GC.y), Math.max(2, gR * 0.35));
        glow.addColorStop(0, 'rgba(255,230,190,.55)'); glow.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = glow; g.beginPath(); g.arc(X(GC.x), Y(GC.y), Math.max(2, gR * 0.35), 0, 6.283); g.fill();
        for (const q of arms) { const px = X(q.x), py = Y(q.y); if (px < -2 || px > w + 2 || py < -2 || py > h + 2) continue; g.globalAlpha = 0.3 + q.b * 0.5; g.fillStyle = q.c ? '#9fb8ff' : '#fff0d6'; g.fillRect(px, py, 1.3, 1.3); }
        g.globalAlpha = 1;
      }
      // 가까운 별들
      if (1.4e17 * k > 20 && 1.4e17 * k < 3e5) { for (const q of near) { const px = X(q.x), py = Y(q.y); if (px < 0 || px > w || py < 0 || py > h) continue; g.globalAlpha = q.b; g.fillStyle = '#f4f1ff'; g.fillRect(px - 0.8, py - 0.8, 1.8, 1.8); } g.globalAlpha = 1; g.fillStyle = '#ffb59a'; g.beginPath(); g.arc(X(PROX.x), Y(PROX.y), 2.5, 0, 6.283); g.fill(); if (view > 3e16 && view < 3e18) label(PROX.x, PROX.y, 'Proxima Centauri'); }
      // 오르트 구름 (얼음 조각들이 태양계를 둥글게 감쌈)
      if (1.5e16 * k > 30 && 1.5e16 * k < 2e4) { g.fillStyle = '#cfe0ff'; for (const q of oort) { const px = X(q.x), py = Y(q.y); if (px < 0 || px > w || py < 0 || py > h) continue; g.globalAlpha = 0.12 + q.b * 0.25; g.fillRect(px, py, 1, 1); } g.globalAlpha = 1; }
      // 태양계
      PLANETS.forEach((a, i) => ring(SUN.x, SUN.y, a * AU, i === 2 ? 'rgba(140,190,255,.55)' : 'rgba(200,210,255,.18)'));
      { const sr = Math.max(2.5, 6.96e8 * k), sx = X(SUN.x), sy = Y(SUN.y); if (sr < 4e4 && view < 5e15) { const s = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3); s.addColorStop(0, 'rgba(255,240,200,1)'); s.addColorStop(0.3, 'rgba(255,200,110,.7)'); s.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = s; g.beginPath(); g.arc(sx, sy, sr * 3, 0, 6.283); g.fill(); } }
      // 달 궤도 · 달
      ring(EC.x, EC.y, 3.844e8, 'rgba(220,225,255,.2)');
      { const ma = -1.1, mx = EC.x + Math.cos(ma) * 3.844e8, my = EC.y + Math.sin(ma) * 3.844e8, mr = Math.max(1.2, 1.737e6 * k); if (view > 2e7 && view < 2e11) { g.fillStyle = '#cfcfd4'; g.beginPath(); g.arc(X(mx), Y(my), mr, 0, 6.283); g.fill(); } }
      // 지구 (가까우면 지평선, 멀면 둥근 별)
      const er = RE * k;
      if (view < 2e12) {
        if (er > 3e4) {
          const hy = Y(GROUND); const sky = g.createLinearGradient(0, hy - 60, 0, hy); sky.addColorStop(0, 'rgba(90,150,255,0)'); sky.addColorStop(1, 'rgba(90,150,255,.22)'); g.fillStyle = sky; g.fillRect(0, hy - 60, w, 60);
          g.fillStyle = '#0d1a2e'; g.fillRect(0, hy, w, Math.max(0, h - hy));
        } else {
          const ex = X(EC.x), ey = Y(EC.y), rr = Math.max(1.6, er);
          const atm = g.createRadialGradient(ex, ey, rr * 0.9, ex, ey, rr * 1.12); atm.addColorStop(0, 'rgba(110,170,255,.5)'); atm.addColorStop(1, 'rgba(110,170,255,0)'); g.fillStyle = atm; g.beginPath(); g.arc(ex, ey, rr * 1.12, 0, 6.283); g.fill();
          const eg = g.createRadialGradient(ex - rr * 0.35, ey - rr * 0.4, rr * 0.1, ex, ey, rr); eg.addColorStop(0, '#3f7fd0'); eg.addColorStop(0.7, '#1c4a8f'); eg.addColorStop(1, '#0b2147'); g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, rr, 0, 6.283); g.fill();
          // 한반도 (약도)
          if (rr > 30 && view > 4e5) { g.save(); g.globalAlpha = clamp((Math.log10(view) - 5.6) / 0.6, 0, 1); g.beginPath(); g.arc(ex, ey, rr, 0, 6.283); g.clip(); g.fillStyle = 'rgba(120,170,110,.55)'; g.beginPath(); g.ellipse(X(-1.2e5), Y(GROUND + 4.2e5), 1.5e5 * k, 4.8e5 * k, 0.25, 0, 6.283); g.fill(); g.globalAlpha = 1; g.restore(); }
        }
      }
      // 동네 집들 · 방
      if (view < 2e5) {
        g.fillStyle = `rgba(230,220,200,${0.3 * clamp((Math.log10(view) - 1.6) / 0.8, 0, 1)})`;
        for (const q of houses) { const s = q.s * k, hx = X(q.x); if (s < 0.6 || s > 26 || hx + s < 0 || hx - s > w) continue; g.fillRect(X(q.x) - s / 2, Y(GROUND) - s * 0.8, s, s * 0.8); }
        const rs = 4 * k; if (rs > 2) { g.strokeStyle = 'rgba(255,240,215,.7)'; g.lineWidth = 1.2; g.strokeRect(X(-2), Y(GROUND - 3), rs, 3 * k); g.fillStyle = 'rgba(255,220,160,.06)'; g.fillRect(X(-2), Y(GROUND - 3), rs, 3 * k); if (view > 3 && view < 400) label(2, GROUND - 3, tr('당신의 방')); }
      }
      // 고민 (가운데)
      const wp = 0.1 * k;
      if (wp > 8) {
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, wp * 0.9); glow.addColorStop(0, 'rgba(255,214,170,.45)'); glow.addColorStop(1, 'rgba(255,214,170,0)'); g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, wp * 0.9, 0, 6.283); g.fill();
        const txt = worryText(), fs = clamp(wp / Math.max(3, txt.length * 0.62), 2, 64);
        g.fillStyle = '#fff4e6'; g.font = `700 ${fs}px Pretendard, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cx, cy); g.textBaseline = 'alphabetic';
      } else {
        const pulse = 0.5 + Math.sin(t * 2.4) * 0.5;
        g.fillStyle = '#fff4e6'; g.beginPath(); g.arc(cx, cy, Math.max(0.8, wp / 2), 0, 6.283); g.fill();
        g.strokeStyle = `rgba(255,214,170,${0.25 + pulse * 0.45})`; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 10 + pulse * 6, 0, 6.283); g.stroke();
        g.globalAlpha = 0.85; g.fillStyle = '#ffe2c2'; g.font = '500 12px Pretendard, sans-serif'; g.textAlign = 'center'; g.fillText(view > 1e20 ? tr('여기 어딘가') : tr('당신의 고민'), cx, cy - 22 - pulse * 4); g.globalAlpha = 1;
      }
      // 화면 문구
      let li = 0; for (let i = 0; i < LEVELS.length; i++) if (view >= LEVELS[i][0] * 0.55) li = i;
      if (li !== lvl) {
        const first = lvl < 0; lvl = li;
        nameEl.textContent = tr(LEVELS[li][1]); noteEl.textContent = tr(LEVELS[li][2]);
        sec.querySelector('.zm-hud').classList.remove('pop'); void sec.offsetWidth; sec.querySelector('.zm-hud').classList.add('pop');
        if (!first) {
          // 멀어질수록 소리도 낮고 작게, 떨림도 약하게 (은하부터는 떨리지 않음)
          const f = 880 * Math.pow(0.86, li), v = 0.06 * Math.pow(0.82, li);
          tone(f, { dur: 2.6, vol: v }); tone(f * 1.5, { dur: 2.2, vol: v * 0.4 });
          if (IS_MOBILE && li < 10) sensor.vibrate(Math.round(60 * Math.pow(0.65, li)) + 4);
        }
      }
      const ratio = view / 0.1;
      ratioEl.textContent = `${tr('고민의 크기')} · ${li >= 10 ? tr('더 이상 떨리지 않아요') : tr('화면의 {r}', { r: ratio < 1000 ? `1/${Math.max(3, Math.round(ratio))}` : `1/10${sup(Math.round(Math.log10(ratio)))}` })}`;
      if (li >= 10) ratioEl.textContent = `${tr('고민의 크기')} · ${tr('화면의 {r}', { r: `1/10${sup(Math.round(Math.log10(ratio)))}` })} · ${tr('더 이상 떨리지 않아요')}`;
      top.style.opacity = String(clamp(1 - p * 18, 0, 1));
      last.classList.toggle('in', p > 0.965);
      requestAnimationFrame(draw);
    }
  });
}

// ---------- 혀: 물 한 모금 마시는 동안 꾹 → 빛이 지구를 몇 바퀴 ----------
function setupSip() {
  document.querySelectorAll('.b-sip').forEach((sec) => {
    const cv = sec.querySelector('.sp-cv'), g = cv.getContext('2d'), nEl = sec.querySelector('.sp-n'), msg = sec.querySelector('.sp-msg');
    const btn = sec.querySelector('.sp-hold');
    const dpr = Math.min(devicePixelRatio, 2);
    let w = 0, h = 0, run = 0, laps = 0, visible = false, trail = 0;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(sec);
    let ang = 0, last = 0;
    function draw(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.26;
      g.fillStyle = 'rgba(4,5,11,.35)'; g.fillRect(0, 0, w, h);
      const eg = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r); eg.addColorStop(0, '#3f7fd0'); eg.addColorStop(0.7, '#1c4a8f'); eg.addColorStop(1, '#0b2147');
      g.fillStyle = eg; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill();
      // 빛은 1초에 7.5바퀴 — 화면에서는 너무 빨라 고리로 보임
      const speed = run ? 7.49 * 6.283 : 0.6;
      ang += speed * dt * (run ? 0.12 : 1); // 눈에 보이게 느리게 그리되 숫자는 실제 속도
      trail += ((run ? 1 : 0) - trail) * 0.08;
      g.strokeStyle = `rgba(255,248,220,${0.08 + trail * 0.5})`; g.lineWidth = 1 + trail * 2; g.beginPath(); g.arc(cx, cy, r * 1.18, 0, 6.283); g.stroke();
      const lx = cx + Math.cos(ang) * r * 1.18, ly = cy + Math.sin(ang) * r * 1.18;
      const lg = g.createRadialGradient(lx, ly, 0, lx, ly, 14); lg.addColorStop(0, 'rgba(255,252,235,1)'); lg.addColorStop(1, 'rgba(255,252,235,0)'); g.fillStyle = lg; g.beginPath(); g.arc(lx, ly, 14, 0, 6.283); g.fill();
      requestAnimationFrame(draw);
    }
    holdable(btn, () => { run = 1; msg.textContent = ''; msg.classList.remove('in'); tone(523, { dur: 4, vol: 0.03 }); }, (s) => {
      laps = s * 7.49; nEl.textContent = laps.toFixed(1);
      if (IS_MOBILE && Math.floor(laps) !== Math.floor(laps - 0.13)) sensor.vibrate(6);
    }, (s) => {
      run = 0; if (s < 0.3) return;
      msg.textContent = tr('{s}초 동안 빛은 지구를 {n}바퀴 돌았어요. 그동안 당신은 물맛만 느꼈어요.', { s: s.toFixed(1), n: Math.round(s * 7.49) });
      requestAnimationFrame(() => msg.classList.add('in'));
    });
  });
}

// ---------- 놓아 주기: 고민이 별 하나가 되어 별들 사이로 ----------
function setupRelease() {
  document.querySelectorAll('.b-release').forEach((sec) => {
    const cv = sec.querySelector('.rl-cv'), g = cv.getContext('2d');
    const btn = sec.querySelector('.rl-hold'), msg = sec.querySelector('.rl-msg'), ask = sec.querySelector('.rl-ask'), cmp = sec.querySelector('.rl-cmp');
    const dpr = Math.min(devicePixelRatio, IS_MOBILE ? 1.5 : 2);
    let w = 0, h = 0, visible = false, hold = 0, done = 0; // done = 놓아 준 시각
    const R = rng(11);
    const N = IS_MOBILE ? 900 : 1500;
    const stars = Array.from({ length: N }, () => ({ a: R() * 6.283, r: Math.sqrt(R()), b: 0.2 + R() * 0.8, s: R() < 0.06 ? 1.8 : 1.1 }));
    const mine = stars[(R() * N) | 0];
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(sec);
    let rot = 0, last = 0;
    function draw(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const cx = w / 2, cy = h * 0.5, RR = Math.hypot(w, h) * 0.55;
      const since = done ? (now - done) / 1000 : 0;
      rot += dt * (done ? 0.02 + Math.min(0.06, since * 0.02) : 0.006);
      g.fillStyle = '#03040a'; g.fillRect(0, 0, w, h);
      for (const s of stars) {
        const a = s.a + rot, x = cx + Math.cos(a) * s.r * RR, y = cy + Math.sin(a) * s.r * RR * 0.8;
        if (x < -2 || x > w + 2 || y < -2 || y > h + 2) continue;
        g.globalAlpha = s.b * (0.75 + Math.sin(now / 700 + s.a * 13) * 0.25); g.fillStyle = '#eef1ff'; g.fillRect(x, y, s.s, s.s);
      }
      g.globalAlpha = 1;
      // 내 고민 별: 놓기 전엔 가운데 밝은 별 + 글자, 놓으면 4초에 걸쳐 별 하나의 자리로
      const a = mine.a + rot, tx = cx + Math.cos(a) * mine.r * RR, ty = cy + Math.sin(a) * mine.r * RR * 0.8;
      const f = done ? clamp(since / 4, 0, 1) : 0, e = f * f * (3 - 2 * f);
      const x = cx + (tx - cx) * e, y = (cy - 40) + (ty - (cy - 40)) * e;
      const glowR = (26 + hold * 30) * (1 - e) + 2 * e;
      if (f < 1) {
        const gl = g.createRadialGradient(x, y, 0, x, y, glowR); gl.addColorStop(0, `rgba(255,226,190,${0.9 - e * 0.7})`); gl.addColorStop(1, 'rgba(255,226,190,0)');
        g.fillStyle = gl; g.beginPath(); g.arc(x, y, glowR, 0, 6.283); g.fill();
        g.globalAlpha = 1 - clamp(f * 3, 0, 1); g.fillStyle = '#fff4e6'; g.font = '700 16px Pretendard, sans-serif'; g.textAlign = 'center'; g.fillText(worryText(), x, y - glowR - 6); g.globalAlpha = 1;
      }
      requestAnimationFrame(draw);
    }
    const letGo = () => {
      if (done) return; done = performance.now(); hold = 1;
      btn.classList.add('gone'); btn.disabled = true;
      tone(392, { dur: 5, vol: 0.04 }); tone(587, { dur: 5, vol: 0.03 }); setTimeout(() => tone(784, { dur: 6, vol: 0.025 }), 600);
      if (IS_MOBILE) sensor.vibrate([60, 50, 40, 60, 24, 80, 10]);
      msg.textContent = tr('놓아 주는 중…');
      setTimeout(() => { msg.textContent = tr('어느 별이었는지, 이제 찾을 수 없어요.'); msg.classList.add('in'); }, 4200);
      setTimeout(() => { ask.hidden = false; requestAnimationFrame(() => ask.classList.add('in')); }, 6200);
    };
    holdable(btn, () => { if (!done) msg.textContent = tr('놓아 주는 중…'); }, (s) => {
      if (done) return; hold = clamp(s / 3, 0, 1); btn.style.setProperty('--p', hold.toFixed(3));
      if (IS_MOBILE && Math.random() < 0.05) sensor.vibrate(Math.round(30 * (1 - hold)) + 4);
      if (hold >= 1) letGo();
    }, () => { if (!done) { hold = 0; btn.style.setProperty('--p', 0); msg.textContent = ''; } });
    if (IS_MOBILE) sensor.onFaceDown((down) => { if (down && seen(sec) && !done) letGo(); });
    sec.querySelectorAll('.rl-dots button').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.n);
      sec.querySelectorAll('.rl-dots button').forEach((x) => x.classList.toggle('on', x === b));
      const line = W.weight ? tr('들어올 때 {a} → 지금 {b}', { a: W.weight, b: n }) : tr('지금 {b}', { b: n });
      const say = W.weight && n < W.weight ? tr('조금 가벼워졌다면, 고민이 작아져서가 아니라 당신이 본 세상이 커져서예요.') : tr('그대로여도 괜찮아요. 무거운 고민은 천천히 작아져요. 오늘은 우주 끝까지 함께 다녀온 것으로 충분해요.');
      cmp.innerHTML = `<b>${line}</b><br />${say}`;
      cmp.classList.remove('in'); requestAnimationFrame(() => cmp.classList.add('in'));
    }));
  });
}

// ---------- 피날레: 당신의 별 ----------
function setupFinale() {
  document.querySelectorAll('.b-finale').forEach((sec) => {
    const cv = sec.querySelector('.fn-cv'), g = cv.getContext('2d'), text = sec.querySelector('.fn-text'), hint = sec.querySelector('.fn-hint');
    const dpr = Math.min(devicePixelRatio, IS_MOBILE ? 1.5 : 2);
    let w = 0, h = 0, visible = false, tap = 0, dragX = 0, dragY = 0;
    const R = rng(23), N = IS_MOBILE ? 1100 : 1800;
    const stars = Array.from({ length: N }, () => ({ x: R() * 1.3 - 0.15, y: R() * 1.3 - 0.15, z: 0.2 + R() * 0.8, b: 0.15 + R() * 0.75, s: R() < 0.05 ? 1.9 : 1.1, ph: R() * 6.283 }));
    const ME = { x: 0.6, y: 0.36, z: 0.7 };
    // 고민 별 둘레의 별 다섯 개로 작은 별자리
    let near = [], chain = [];
    const pick = () => { // 화면 비율에 맞춰 다섯 방향에서 하나씩, 조금 떨어진 별로 작은 별자리
      const m = Math.min(w, h), r0 = m * 0.16, r1 = m * 0.34, rm = m * 0.24;
      near.forEach((q) => { q.b = q.b0; q.s = q.s0; });
      near = [0, 1, 2, 3, 4].map((k) => {
        const a0 = k * 1.2566 - 1.2, cand = stars.filter((q) => { const dx = (q.x - ME.x) * w, dy = (q.y - ME.y) * h, d = Math.hypot(dx, dy), da = Math.abs(((Math.atan2(dy, dx) - a0) % 6.283 + 9.425) % 6.283 - 3.1416); q._d = d; return d > r0 && d < r1 && da < 0.45; });
        return cand.sort((x, y) => Math.abs(x._d - rm) - Math.abs(y._d - rm))[0];
      }).filter(Boolean);
      near.forEach((q) => { q.b0 = q.b0 ?? q.b; q.s0 = q.s0 ?? q.s; q.b = Math.max(q.b, 0.8); q.s = 1.7; });
      chain = near.length > 2 ? [...near, near[0]] : [];
    };
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); pick(); addEventListener('resize', () => { size(); pick(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(sec);
    const progress = () => { const r = sec.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };
    const pos = (q) => { const ox = (IS_MOBILE && sensor.on ? sensor.tiltX * 30 : 0) + dragX, oy = (IS_MOBILE && sensor.on ? sensor.tiltY * 30 : 0) + dragY; return [q.x * w + ox * q.z, q.y * h + oy * q.z]; };
    let mx = -1, my = -1, said = false;
    sec.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; if (!IS_MOBILE) { dragX = (mx / w - 0.5) * -24; dragY = (my / h - 0.5) * -24; } });
    sec.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect(), [sx, sy] = pos(ME);
      if (Math.hypot(e.clientX - r.left - sx, e.clientY - r.top - sy) < 60) {
        wake(); tap = performance.now(); hint.classList.add('hide');
        tone(784, { dur: 4, vol: 0.04 }); tone(1175, { dur: 3.5, vol: 0.025 }); setTimeout(() => tone(1568, { dur: 4, vol: 0.02 }), 260);
        if (IS_MOBILE) sensor.vibrate([20, 60, 10]);
      }
    });
    function draw(now) {
      if (!visible) return;
      const p = progress(), t = now / 1000;
      g.fillStyle = '#02030a'; g.fillRect(0, 0, w, h);
      const sky = clamp(p * 4, 0, 1); // 별이 먼저 돋고
      for (const q of stars) { const [x, y] = pos(q); if (x < -2 || x > w + 2 || y < -2 || y > h + 2) continue; g.globalAlpha = sky * q.b * (0.75 + Math.sin(t * 1.3 + q.ph) * 0.25); g.fillStyle = '#eef1ff'; g.fillRect(x, y, q.s, q.s); }
      g.globalAlpha = 1;
      const me = clamp((p - 0.15) * 4, 0, 1), line = clamp((p - 0.35) * 3, 0, 1); // 그다음 내 별, 별자리
      const [sx, sy] = pos(ME);
      if (line > 0 && chain.length > 3) {
        g.strokeStyle = 'rgba(255,226,190,.35)'; g.lineWidth = 1; g.beginPath();
        const segs = chain.length - 1, upto = line * segs;
        for (let i = 0; i < segs && i < upto; i++) { const [ax, ay] = pos(chain[i]), [bx, by] = pos(chain[i + 1]), f = Math.min(1, upto - i); g.moveTo(ax, ay); g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); }
        g.stroke();
        if (line >= 1) { g.globalAlpha = 0.55; g.fillStyle = '#ffe2c2'; g.font = '500 11px Pretendard, sans-serif'; g.textAlign = 'center'; const low = near.reduce((m, q) => (q.y > m.y ? q : m), near[0]), [lx, ly] = pos(low); g.fillText(tr('오늘의 별자리'), lx, ly + 22); g.globalAlpha = 1; }
      }
      if (me > 0) {
        const since = tap ? (now - tap) / 1000 : 9, burst = Math.max(0, 1 - since / 2.2);
        const pulse = 0.5 + Math.sin(t * 1.8) * 0.5, gr = (14 + pulse * 6 + burst * 50) * me;
        const gl = g.createRadialGradient(sx, sy, 0, sx, sy, gr); gl.addColorStop(0, `rgba(255,236,210,${0.95 * me})`); gl.addColorStop(0.25, `rgba(255,214,170,${0.45 * me})`); gl.addColorStop(1, 'rgba(255,214,170,0)');
        g.fillStyle = gl; g.beginPath(); g.arc(sx, sy, gr, 0, 6.283); g.fill();
        g.strokeStyle = `rgba(255,236,210,${0.5 * me})`; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - 9 - burst * 20, sy); g.lineTo(sx + 9 + burst * 20, sy); g.moveTo(sx, sy - 9 - burst * 20); g.lineTo(sx, sy + 9 + burst * 20); g.stroke();
        if (burst > 0) { g.strokeStyle = `rgba(255,236,210,${burst * 0.5})`; g.beginPath(); g.arc(sx, sy, 20 + (1 - burst) * 90, 0, 6.283); g.stroke(); }
        // 별 옆에 고민 글자 (누르면 잠깐 밝게)
        g.globalAlpha = me * (0.75 + burst * 0.25); g.fillStyle = '#fff4e6'; g.font = `600 ${15 + burst * 3}px Pretendard, sans-serif`; g.textAlign = 'center'; g.fillText(worryText(), sx, sy - 28 - burst * 10);
        g.globalAlpha = me * 0.6; g.font = '500 11px Pretendard, sans-serif'; g.fillStyle = '#ffe2c2'; g.fillText(tr('여기 있어요'), sx, sy + 34); g.globalAlpha = 1;
        if (me >= 1 && !said) { said = true; if (IS_MOBILE) sensor.vibrate(12); tone(659, { dur: 5, vol: 0.03 }); }
      }
      text.classList.toggle('in', p > 0.5);
      hint.classList.toggle('in', p > 0.25 && !tap);
      requestAnimationFrame(draw);
    }
  });
}
