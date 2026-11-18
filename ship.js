/* Shared shipboard environment. All worksheet data stays in the existing fields. */
(function () {
  'use strict';
  document.documentElement.classList.add('ship-mode');
  const header = document.querySelector('body > nav');
  const banner = document.createElement('div');
  banner.className = 'lab-window';
  banner.setAttribute('aria-label', 'Jupiter outside the lab window');
  banner.innerHTML = '<button class="motion-toggle" type="button" aria-pressed="false">Pause motion</button>';
  if (header) header.after(banner);
  else document.body.prepend(banner);
  const orbitScript = document.createElement('script');
  orbitScript.src = 'orbit.js?v=2';
  document.head.append(orbitScript);
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

  const page = location.pathname.split('/').pop();
  const modules = { 'orientation.html':'Orientation', 'bonus.html':'Bonus Module' };
  for (let n = 1; n <= 6; n++) modules['module' + n + '.html'] = 'Module ' + n;
  const sidePages = ['portfolio.html', 'certificate.html', 'skill-translator.html', 'admin.html'];
  const key = 'hella-return-module';
  const knownModule = value => Object.hasOwn(modules, value);
  let originModule = new URLSearchParams(location.search).get('from');
  if (knownModule(page)) originModule = page;
  if (!knownModule(originModule)) {
    try { originModule = sessionStorage.getItem(key); } catch (_) {}
  }
  if (knownModule(originModule)) {
    try { sessionStorage.setItem(key, originModule); } catch (_) {}
    document.querySelectorAll('a[href]').forEach(link => {
      const dest = new URL(link.href, location.href);
      if (sidePages.some(path => dest.pathname === new URL(path, location.href).pathname) && dest.origin === location.origin) {
        dest.searchParams.set('from', originModule);
        link.href = dest.href;
      }
    });
  }
  if (page === 'login.html') {
    try { sessionStorage.removeItem(key); } catch (_) {}
  }
  if (sidePages.includes(page)) {
    const target = knownModule(originModule) ? originModule : page === 'skill-translator.html' ? 'module1.html' : 'orientation.html';
    const existing = header?.querySelector('.back-btn') || document.querySelector('.admin-nav-right a');
    const back = existing || document.createElement('a');
    back.textContent = '← Back to ' + modules[target];
    back.href = target;
    back.classList.add('course-return');
    if (!existing) banner.after(back);
  }

  const accountLabel = header?.querySelector('#nav-user, #admin-signout');
  if (accountLabel && typeof sb !== 'undefined') {
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'course-settings-button';
    settings.textContent = 'Settings';
    settings.setAttribute('aria-haspopup', 'dialog');
    accountLabel.after(settings);
    settings.hidden = true;
    getSession().then(session => { settings.hidden = !session; }).catch(() => {});
    const dialog = document.createElement('dialog');
    dialog.className = 'course-settings';
    dialog.setAttribute('aria-labelledby', 'course-settings-title');
    dialog.innerHTML = `<header><h2 id="course-settings-title">Account settings</h2><button type="button" data-close>Close</button></header>
      <form data-email><h3>Email address</h3><p data-current></p>
      <label>New email<input name="email" type="email" autocomplete="email" required></label>
      <button>Update email</button><p role="status"></p></form>
      <form data-password><h3>Password</h3>
      <label>New password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" required></label>
      <label hidden>Verification code<input name="nonce" autocomplete="one-time-code"></label>
      <button>Change password</button><p role="status"></p></form>`;
    document.body.append(dialog);
    const current = dialog.querySelector('[data-current]');
    const nonce = dialog.querySelector('[name=nonce]');
    let pending = false;
    settings.onclick = async () => {
      if (pending) return;
      dialog.showModal();
      const session = await getSession();
      current.textContent = session?.user.email || '';
    };
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      dialog.querySelectorAll('form').forEach(form => form.reset());
      dialog.querySelectorAll('[role=status]').forEach(status => status.textContent = '');
      nonce.parentElement.hidden = true;
      nonce.required = false;
    });
    dialog.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending) return;
      const form = event.target;
      const emailForm = form.hasAttribute('data-email');
      const fields = form.elements;
      const status = form.querySelector('[role=status]');
      if (!emailForm && fields.password.value !== fields.confirm.value) {
        status.textContent = 'Your passwords need to match.';
        fields.confirm.focus();
        return;
      }
      pending = true;
      const buttons = dialog.querySelectorAll('button');
      buttons.forEach(button => button.disabled = true);
      status.textContent = 'Saving…';
      try {
        const updates = emailForm ? {email:fields.email.value.trim()} : {password:fields.password.value};
        if (!emailForm && nonce.required) updates.nonce = nonce.value.trim();
        const {data,error} = await sb.auth.updateUser(updates);
        if (error?.code === 'reauthentication_needed' && !emailForm) {
          const sent = await sb.auth.reauthenticate();
          if (sent.error) throw sent.error;
          nonce.parentElement.hidden = false;
          nonce.required = true;
          status.textContent = 'Enter the code sent to your account, then choose Change password.';
          nonce.focus();
        } else {
          if (error) throw error;
          if (emailForm) {
            current.textContent = data.user.email;
            status.textContent = data.user.email === updates.email ? 'Email updated.' : 'Check your inboxes for confirmation links to finish changing your email.';
          } else {
            status.textContent = 'Password updated.';
            nonce.required = false;
            nonce.parentElement.hidden = true;
          }
          form.reset();
        }
      } catch (error) {
        status.textContent = error.message || 'The change could not be saved. Try again.';
      } finally {
        pending = false;
        buttons.forEach(button => button.disabled = false);
      }
    });
  }

})();
