// 전시 들어갈 때 착륙 화면 — 흑백 링 로딩(행성·우주인 없음), 취소 가능한 생명주기.
export function createAppLanding({ planetBitmap, hasRing, name, translate: t, motionQuery, onFinished, onRetry }) {
  const element = document.querySelector('#landing'), canvas = document.querySelector('#land-cv');
  const ctx = canvas.getContext('2d');
  const code = document.querySelector('#land-code'), title = document.querySelector('#land-title');
  const state = document.querySelector('#land-state'), retry = document.querySelector('#land-retry');
  let raf = 0, timeout = 0, hideTimer = 0, generation = 0;
  let started = 0, progress = 0, loaded = false, loadedAt = 0, cell = null;
  let width = 0, height = 0, stars = [], active = true, pausedAt = 0, lastDraw = 0, percent = -1;
  const minimum = 900, finishDuration = 420, interval = 1000 / 30;

  function size() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    width = innerWidth; height = innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function finish() {
    if (!cell || element.classList.contains('out')) return;
    cancelAnimationFrame(raf); raf = 0; clearTimeout(timeout); timeout = 0;
    state.textContent = t('착륙 완료'); element.classList.add('out');
    const token = generation;
    hideTimer = setTimeout(() => {
      if (token !== generation) return;
      hideTimer = 0; element.hidden = true; onFinished();
    }, motionQuery.matches ? 0 : 360);
  }
  function draw(now) {
    const calm = motionQuery.matches, elapsed = now - started;
    const target = loaded && elapsed > minimum ? Math.min(1, .82 + .18 * Math.min(1, (now - Math.max(loadedAt, started + minimum)) / finishDuration)) : Math.min(.82, elapsed / minimum * .82);
    progress += (target - progress) * .20;
    if (target === 1 && progress > .995) progress = 1;
    const eased = calm ? 0 : progress * progress * (3 - 2 * progress);
    // 흑백·심플(2026-11-16): 검은 화면, 흰 별이 살짝 퍼지고, 가운데 얇은 링이 차오름 (행성·우주인 없음)
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
    const cx = width / 2, cy = height * .42, R = Math.min(width, height) * .11;
    for (const star of stars) {
      const k = 1 + eased * .7 * star.depth;
      ctx.fillStyle = `rgba(255,255,255,${.18 + .3 * star.depth / 2.3})`;
      ctx.fillRect(cx + (star.x - cx) * k, cy + (star.y - cy) * k, star.depth * .7, star.depth * .7);
    }
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    const waiting = !loaded && progress > .8 && !calm;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.beginPath();
    if (waiting) { const a = now / 520; ctx.arc(cx, cy, R, a, a + Math.PI * 1.6); } else ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.002, progress));
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 2.2 + 1.6 * eased, 0, Math.PI * 2); ctx.fill();
    const nextPercent = Math.round(progress * 100);
    if (nextPercent !== percent) { percent = nextPercent; state.textContent = calm ? t('착륙하는 중') : `${t('대기권 진입')} ${percent}%`; }
    if (loaded && (calm || progress >= 1)) finish();
  }
  function schedule() {
    if (active && !document.hidden && cell && !element.hidden && !element.classList.contains('out') && !motionQuery.matches && !raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (!active || document.hidden || !cell || element.hidden) return;
    if (now - lastDraw >= interval) { lastDraw = now; draw(now); }
    schedule();
  }
  function stop() {
    ++generation; cancelAnimationFrame(raf); clearTimeout(timeout); clearTimeout(hideTimer);
    raf = timeout = hideTimer = 0; cell = null; pausedAt = 0; element.hidden = true;
  }
  function setActive(value) {
    if (active === value) return;
    active = value;
    if (!active) { pausedAt = performance.now(); cancelAnimationFrame(raf); raf = 0; }
    else if (cell && !element.hidden) {
      if (pausedAt) { const pause = performance.now() - pausedAt; started += pause; if (loadedAt) loadedAt += pause; }
      pausedAt = 0; lastDraw = 0; draw(performance.now()); schedule();
    }
  }
  retry.addEventListener('click', onRetry);
  addEventListener('resize', () => { if (cell && !element.hidden && active && !document.hidden) { size(); draw(performance.now()); } }, { passive: true });
  motionQuery.addEventListener('change', () => { if (cell && !element.hidden && active && !document.hidden) { cancelAnimationFrame(raf); raf = 0; draw(performance.now()); schedule(); } });
  return {
    start(next) {
      stop(); cell = next; size(); stars = Array.from({ length: 120 }, () => ({ x: Math.random() * width, y: Math.random() * height, depth: Math.random() * 2 + .3 }));
      progress = 0; loaded = false; loadedAt = 0; started = performance.now(); percent = -1; lastDraw = 0;
      active = !document.hidden; pausedAt = active ? 0 : started;
      element.hidden = false; element.classList.remove('out', 'bright');
      code.textContent = next.code || ''; title.textContent = `${name(next)} — ${t('착륙하는 중')}`;
      retry.hidden = true; retry.textContent = t('다시 시도');
      const token = generation;
      timeout = setTimeout(() => { if (token === generation && !loaded) { retry.hidden = false; title.textContent = t('신호가 약해요. 연결을 확인해 주세요.'); } }, 12000);
      if (active) { draw(started); schedule(); }
    },
    loaded() {
      if (!cell || loaded) return;
      loaded = true; loadedAt = performance.now(); clearTimeout(timeout); timeout = 0; retry.hidden = true;
      if (active && !document.hidden && motionQuery.matches) draw(performance.now());
    },
    stop, setActive,
  };
}
