/* Resume-first Harvest exercise. Existing worksheet fields remain the saved data source. */
(function () {
  'use strict';
  const matrixBody = document.getElementById('matrix-body');
  if (!matrixBody) return;
  const worksheet = document.querySelector('.ws-section');
  const upload = document.getElementById('resume-upload-section');
  worksheet.before(upload);
  const original = document.createElement('details');
  original.className = 'matrix-details';
  const matrixSummary = document.createElement('summary');
  matrixSummary.textContent = 'View matrix';
  original.append(matrixSummary);
  [...worksheet.children].forEach(child => original.append(child));
  worksheet.append(original);

  const next = document.createElement('details');
  next.className = 'harvest-next';
  const nextSummary = document.createElement('summary');
  nextSummary.textContent = 'Review patterns & choose your primary skill';
  next.append(nextSummary);
  const following = [];
  for (let element = worksheet.nextElementSibling; element && !element.classList.contains('mod-nav'); element = element.nextElementSibling) following.push(element);
  following.forEach(element => next.append(element));
  worksheet.after(next);

  const form = document.createElement('form');
  form.className = 'experience-form resume-review-form';
  form.innerHTML = '<p class="role-progress"></p><h2>Match this work to skills</h2>' +
    '<div class="experience-fields"><label for="experience-role">Role / Context<input id="experience-role" required readonly></label>' +
    '<label for="experience-work">Repeated work<textarea id="experience-work" rows="4" required readonly></textarea></label>' +
    '<label for="experience-skill">Skill or combination of skills<input id="experience-skill" placeholder="Name the skills these tasks use" required><span class="skill-tools"><button type="button" id="find-experience-skills">Explore skill examples</button></span></label></div>' +
    '<button type="button" class="edit-experience">Edit extracted details</button>' +
    '<div class="experience-actions"><p class="experience-status" role="status"></p><button type="submit">Save skills & next role</button></div>';
  worksheet.prepend(form);
  const done = document.createElement('div');
  done.className = 'resume-review-done';
  done.innerHTML = '<h2>Your roles have skills attached.</h2><p>Review the patterns and choose one primary skill to build around.</p><button type="button">Continue to the questions</button>';
  worksheet.prepend(done);
  done.hidden = true;
  done.querySelector('button').addEventListener('click', () => { next.open = true; next.scrollIntoView({behavior:'smooth',block:'start'}); });
  const manual = document.createElement('button');
  manual.type = 'button'; manual.className = 'manual-experience'; manual.textContent = 'Add experience manually';
  upload.append(manual);

  const role = document.getElementById('experience-role');
  const work = document.getElementById('experience-work');
  const skill = document.getElementById('experience-skill');
  const status = form.querySelector('.experience-status');
  const progress = form.querySelector('.role-progress');
  const edit = form.querySelector('.edit-experience');
  const submit = form.querySelector('button[type=submit]');
  const findSkills = document.getElementById('find-experience-skills');
  let queue = [];
  let activeRow = null;
  let quickSkillTarget = false;
  let skillNoticeTimer;
  let ready = false;

  function field(number,column) { return document.getElementById('r' + number + column); }
  function filledRows() {
    return [...matrixBody.querySelectorAll('tr')].map(row => Number(row.id.replace('row-',''))).filter(number => field(number,'a').value.trim());
  }
  function refreshCount() {
    const count = filledRows().length;
    matrixSummary.textContent = 'View matrix · ' + count + (count === 1 ? ' entry' : ' entries');
    manual.textContent = count ? 'Add another experience manually' : 'Add experience manually';
  }
  function setEditable(editable) {
    role.readOnly = !editable; work.readOnly = !editable;
    edit.textContent = editable ? 'Keep these details' : 'Edit extracted details';
  }
  function reviewRows(numbers) {
    queue = [...new Set(numbers)].filter(number => field(number,'a'));
    const target = queue.find(number => !field(number,'c').value.trim());
    worksheet.hidden = !queue.length;
    done.hidden = Boolean(target) || !queue.length;
    form.hidden = !target;
    if (!target) { activeRow = null; refreshCount(); return; }
    activeRow = target;
    progress.textContent = 'Role ' + (queue.indexOf(target) + 1) + ' of ' + queue.length;
    role.value = field(target,'a').value;
    work.value = field(target,'b').value;
    skill.value = field(target,'c').value;
    setEditable(!work.value.trim());
    edit.hidden = false;
    submit.textContent = 'Save skills & next role';
    status.textContent = work.value.trim() ? 'Name the skills used to do this work.' : 'This role has no tasks listed. Add what you did, then name the skills.';
    refreshCount();
  }
  manual.addEventListener('click', () => {
    if (!ready) return;
    activeRow = null;
    worksheet.hidden = false; form.hidden = false; done.hidden = true;
    form.reset(); setEditable(true); edit.hidden = true;
    role.placeholder = 'e.g. Operations coordinator'; work.placeholder = 'Describe work you did regularly';
    progress.textContent = 'Add experience';
    status.textContent = 'Include paid, volunteer, military, or other experience.';
    submit.textContent = 'Add to matrix';
    role.focus();
  });
  edit.addEventListener('click', () => { setEditable(role.readOnly); if (!role.readOnly) work.focus(); });

  window.showToast = function (message) {
    const notice = document.getElementById('st-toast');
    notice.setAttribute('role','status'); notice.textContent = message;
    clearTimeout(skillNoticeTimer);
    skillNoticeTimer = setTimeout(() => { notice.textContent = ''; },3000);
  };
  findSkills.addEventListener('click', () => {
    quickSkillTarget = true;
    window.openSkillPanel();
    document.getElementById('st-active-label').textContent = 'Explore examples, then choose skills that match these tasks.';
    document.getElementById('st-row-indicator').textContent = 'Adding to your skill answer';
    const search = document.getElementById('st-search');
    search.value = role.value.split(',')[0];
    window.stSearch(search.value);
    search.focus();
  });
  const selectMatrixRow = window.setActiveRow;
  window.setActiveRow = function (number) { quickSkillTarget = false; return selectMatrixRow(number); };
  const addMatrixSkill = window.injectSkill;
  window.injectSkill = function (value) {
    if (!quickSkillTarget) return addMatrixSkill(value);
    const selected = skill.value.split(',').map(text => text.trim()).filter(Boolean);
    if (selected.includes(value)) { window.showToast('That skill is already selected.'); return; }
    if (selected.length >= 5) { window.showToast('Choose up to five skills for this role.'); return; }
    selected.push(value); skill.value = selected.join(', ');
    window.showToast('Skill selected. Save your answer when you’re ready.');
  };
  matrixBody.addEventListener('input',refreshCount);
  new MutationObserver(refreshCount).observe(matrixBody,{childList:true});
  original.addEventListener('toggle',refreshCount);
  document.addEventListener('hella:worksheet-ready', () => { ready = true; manual.disabled = false; reviewRows(filledRows()); });
  document.addEventListener('hella:resume-imported', event => {
    reviewRows(event.detail.rowIds);
    if (!form.hidden) skill.focus();
  });
  document.addEventListener('hella:resume-loading', event => {
    const loading = event.detail.loading;
    manual.disabled = loading || !ready;
    form.querySelectorAll('input,textarea,button').forEach(control => { control.disabled = loading; });
    upload.classList.toggle('resume-loading',loading);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || submit.disabled) return;
    const values = [role.value.trim(),work.value.trim(),skill.value.trim()];
    if (values.some(value => !value)) { status.textContent = 'Include the role, tasks, and at least one skill.'; return; }
    let target = activeRow;
    if (!target) {
      const empty = [...matrixBody.querySelectorAll('tr')].find(row => [...row.querySelectorAll('textarea')].every(input => !input.value.trim()));
      if (!empty) window.addRow();
      target = Number((empty || matrixBody.lastElementChild).id.replace('row-',''));
    }
    ['a','b','c'].forEach((column,index) => { field(target,column).value = values[index]; });
    window.updateSkillCount(target);
    quickSkillTarget = false; window.closeSkillPanel();
    submit.disabled = true;
    status.textContent = 'Saving your skills…';
    try {
      const result = await window.doSave();
      if (result.error) throw new Error('Saving failed. Your answer is still on this page. Try again.');
      refreshCount();
      if (activeRow) { reviewRows(queue); if (!form.hidden) skill.focus(); }
      else { form.reset(); status.textContent = 'Added to your matrix.'; role.focus(); }
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  worksheet.hidden = true;
  manual.disabled = true;
  next.open = false;
  refreshCount();
})();
