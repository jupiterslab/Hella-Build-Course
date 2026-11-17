/* Shared shipboard environment. All worksheet data stays in the existing fields. */
(function () {
  'use strict';
  document.documentElement.classList.add('ship-mode');
  const header = document.querySelector('body > nav');
  const banner = document.createElement('div');
  banner.className = 'lab-window';
  banner.setAttribute('aria-label', 'Jupiter outside the lab window');
  banner.innerHTML = '<div class="lab-window-light" aria-hidden="true"></div><button class="motion-toggle" type="button" aria-pressed="false">Pause motion</button>';
  if (header) header.after(banner);
  else document.body.prepend(banner);
  const toggle = banner.querySelector('button');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  try { paused = localStorage.getItem('hella-motion') === 'paused' || paused; } catch (_) {}
  function showMotionState() {
    banner.classList.toggle('motion-paused', paused);
    toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
    toggle.setAttribute('aria-pressed', String(paused));
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('hella-motion', paused ? 'paused' : 'playing'); } catch (_) {}
    showMotionState();
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) { paused = true; showMotionState(); } });
  showMotionState();
  document.querySelectorAll('.nav-brand').forEach(brand => {
    const mark = brand.querySelector('.nav-mark');
    const name = brand.querySelector('.nav-name');
    const sub = brand.querySelector('.nav-sub');
    if (mark) mark.textContent = 'J·LAB';
    if (name) name.textContent = 'HELLA BUILD';
    if (sub) sub.textContent = 'Jupiter’s Lab Creative Studio';
  });

  const main = document.querySelector('main.main');
  if (main) {
    const lessons = [...main.querySelectorAll(':scope > .lesson-details')];
    if (lessons.length) {
      const guide = document.createElement('details');
      guide.className = 'quick-guide';
      const summary = document.createElement('summary');
      summary.textContent = 'Quick guide';
      guide.append(summary);
      lessons[0].before(guide);
      lessons.forEach(lesson => guide.append(lesson));
    }
  }

})();
