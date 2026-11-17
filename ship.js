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

  if (!document.getElementById('matrix-table')) return;
  const worksheet = document.querySelector('.ws-section');
  const original = document.createElement('details');
  original.className = 'matrix-details';
  const summary = document.createElement('summary');
  summary.textContent = 'View matrix';
  original.append(summary);
  [...worksheet.children].forEach(child => original.append(child));
  worksheet.append(original);
  const form = document.createElement('form');
  form.className = 'experience-form';
  form.innerHTML = '<h2>Add your experience</h2><div class="experience-fields">' +
    [['role', 'Role / Context', 'e.g. Operations coordinator'], ['work', 'Repeated work', 'e.g. Organized client onboarding'], ['skill', 'Underlying skill', 'e.g. Process design'], ['result', 'Business outcome', 'e.g. Faster client handoffs']].map(([id, label, hint]) =>
      '<label for="experience-' + id + '">' + label + '<input id="experience-' + id + '" placeholder="' + hint + '" required></label>').join('') +
    '</div><div class="experience-actions"><p class="experience-status" role="status"></p><button type="submit">Add to matrix</button></div>';
  worksheet.prepend(form);
  const status = form.querySelector('.experience-status');
  let quickSkillTarget = false;
  let skillNoticeTimer;
  window.showToast = function (message) {
    const notice = document.getElementById('st-toast');
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    clearTimeout(skillNoticeTimer);
    skillNoticeTimer = setTimeout(() => { notice.textContent = ''; }, 3000);
  };
  const skillTools = document.createElement('div');
  skillTools.className = 'skill-tools';
  const findSkills = document.createElement('button');
  findSkills.type = 'button';
  findSkills.textContent = 'Find skills';
  skillTools.append(findSkills);
  document.getElementById('experience-skill').after(skillTools);
  findSkills.addEventListener('click', () => {
    quickSkillTarget = true;
    window.openSkillPanel();
    document.getElementById('st-active-label').textContent = 'Choose skills for your new experience.';
    document.getElementById('st-row-indicator').textContent = 'Adding to your experience form';
    document.getElementById('st-search').focus();
  });
  const selectMatrixRow = window.setActiveRow;
  window.setActiveRow = function (number) { quickSkillTarget = false; return selectMatrixRow(number); };
  const addMatrixSkill = window.injectSkill;
  window.injectSkill = function (skill) {
    if (!quickSkillTarget) return addMatrixSkill(skill);
    const input = document.getElementById('experience-skill');
    const selected = input.value.split(',').map(value => value.trim()).filter(Boolean);
    if (selected.includes(skill)) { window.showToast('That skill is already selected.'); return; }
    if (selected.length >= 5) { window.showToast('Choose up to five skills for this experience.'); return; }
    selected.push(skill);
    input.value = selected.join(', ');
    status.textContent = 'Skill selected. Add the experience to save it to your matrix.';
    window.showToast('Skill added to your experience form.');
  };

  const fieldIds = ['role', 'work', 'skill', 'result'];
  const columns = ['a', 'b', 'c', 'd'];
  const matrixBody = document.getElementById('matrix-body');
  function updateEntryCount() {
    const count = [...matrixBody.querySelectorAll('tr')].filter(row => [...row.querySelectorAll('textarea')].some(input => input.value.trim())).length;
    summary.textContent = 'View matrix · ' + count + (count === 1 ? ' entry' : ' entries');
  }
  matrixBody.addEventListener('input', updateEntryCount);
  new MutationObserver(updateEntryCount).observe(matrixBody, { childList: true });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = fieldIds.map(id => document.getElementById('experience-' + id).value.trim());
    if (values.some(value => !value)) { status.textContent = 'Complete all four fields.'; return; }
    if (!matrixBody.children.length) { status.textContent = 'Your worksheet is still loading. Try again in a moment.'; return; }
    let row = [...matrixBody.querySelectorAll('tr')].find(candidate => [...candidate.querySelectorAll('textarea')].every(input => !input.value.trim()));
    if (!row) { window.addRow(); row = matrixBody.lastElementChild; }
    if (!row) { status.textContent = 'Your worksheet is still loading. Try again in a moment.'; return; }
    const rowNumber = row.id.replace('row-', '');
    columns.forEach((column, index) => { document.getElementById('r' + rowNumber + column).value = values[index]; });
    window.autosave();
    updateEntryCount();
    form.reset();
    quickSkillTarget = false;
    window.closeSkillPanel();
    status.textContent = 'Added to your matrix.';
    document.getElementById('experience-role').focus();
  });
  original.addEventListener('toggle', updateEntryCount);
  // Saved rows populate asynchronously. Refresh the count after their values are restored.
  if (typeof window.populate === 'function') {
    const restore = window.populate;
    window.populate = function (saved) { restore(saved); updateEntryCount(); };
  }
  updateEntryCount();
})();
