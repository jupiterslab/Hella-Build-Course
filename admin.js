(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const modules = {
    'module-00':'Orientation', 'module-01':'Skill Clarity', 'module-02':'Skill Stacking',
    'module-03':'Direction', 'module-04':'Offer Design', 'module-05':'Workflow',
    'module-06':'Scope & Capacity', 'module-bonus':'Revenue Plan'
  };
  let role = null;
  let page = 0;
  let selectedLearner = null;
  let searchTimer;
  let learnerRequest = 0;
  let detailRequest = 0;
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function date(value) { return value ? new Date(value).toLocaleString() : '—'; }
  function status(message, error = false) { $('admin-status').textContent = message; $('admin-status').classList.toggle('error', error); }
  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args);
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') throw new Error('Admin setup is required. Run supabase/admin-setup.sql in this course’s Supabase project.');
      throw new Error(error.message || 'The request failed. Try again.');
    }
    return data;
  }
  async function run(button, action) {
    if (button.disabled) return;
    button.disabled = true;
    try { await action(); } catch (error) { status(error.message, true); }
    finally { button.disabled = false; }
  }
  async function authenticate() {
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return false;
    role = await rpc('hella_my_role');
    if (!role) { $('admin-dashboard').hidden = true; $('admin-access').hidden = false; throw new Error('Your account has no staff access. An owner can add your account from Team.'); }
    $('admin-access').hidden = true;
    $('admin-dashboard').hidden = false;
    $('admin-signout').hidden = false;
    $('staff-identity').textContent = data.user.email + ' · ' + role;
    $('team-tab').hidden = role !== 'owner';
    if (role !== 'owner' && !$('team-panel').hidden) {
      $('team-panel').hidden = true; $('overview-panel').hidden = false;
      document.querySelectorAll('[data-panel]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.panel === 'overview')));
    }
    $('staff-password').value = '';
    await loadOverview();
    return true;
  }
  $('admin-login').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    $('access-error').textContent = '';
    try {
      const { error } = await sb.auth.signInWithPassword({ email:$('staff-email').value.trim(), password:$('staff-password').value });
      if (error) throw new Error(error.message);
      await authenticate();
    } catch (error) { $('access-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('admin-signout').addEventListener('click', async () => {
    const { error } = await sb.auth.signOut();
    if (error) { status(error.message, true); return; }
    location.reload();
  });
  $('admin-refresh').addEventListener('click', event => run(event.currentTarget, loadOverview));
  document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.panel === 'team' && role !== 'owner') return;
    document.querySelectorAll('[data-panel]').forEach(tab => {
      const selected = tab === button;
      tab.setAttribute('aria-selected', String(selected));
      $(tab.dataset.panel + '-panel').hidden = !selected;
    });
    const load = button.dataset.panel === 'learners' ? loadLearners : button.dataset.panel === 'team' ? loadTeam : loadOverview;
    load().catch(error => status(error.message, true));
  }));
  async function loadOverview() {
    status('Loading course activity…');
    const summary = await rpc('hella_dashboard');
    $('admin-stats').replaceChildren();
    [['Learners','learners'],['Module completions','completions'],['Saved worksheets','worksheets'],['Team members','team']].forEach(([label,key]) => {
      const card = node('div', undefined, 'admin-stat');
      card.append(node('strong', String(summary[key])), node('span', label));
      $('admin-stats').append(card);
    });
    $('recent-activity').replaceChildren();
    (summary.recent || []).forEach(item => {
      const row = node('div', undefined, 'activity-row');
      row.append(node('span', item.email + ' · ' + (modules[item.module_id] || item.module_id)), node('time', date(item.completed_at)));
      $('recent-activity').append(row);
    });
    if (!summary.recent?.length) $('recent-activity').append(node('p', 'No module completions yet.'));
    status('Updated ' + new Date().toLocaleTimeString());
  }
  $('learner-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    learnerRequest++;
    searchTimer = setTimeout(() => { page = 0; loadLearners().catch(error => status(error.message, true)); }, 300);
  });
  $('learners-prev').addEventListener('click', () => { page = Math.max(0, page - 1); loadLearners().catch(error => status(error.message, true)); });
  $('learners-next').addEventListener('click', () => { page++; loadLearners().catch(error => status(error.message, true)); });
  async function loadLearners() {
    const request = ++learnerRequest;
    const learners = await rpc('hella_learners', { p_search:$('learner-search').value.trim(), p_offset:page * 50 });
    if (request !== learnerRequest) return;
    $('learner-rows').replaceChildren();
    learners.slice(0,50).forEach(learner => {
      const row = node('tr');
      row.append(node('td', learner.name + ' · ' + learner.email), node('td', String(learner.completed)), node('td', String(learner.worksheets)), node('td', date(learner.updated_at)));
      const cell = node('td');
      const button = node('button', 'Review'); button.type = 'button';
      button.addEventListener('click', () => run(button, () => showLearner(learner)));
      cell.append(button); row.append(cell); $('learner-rows').append(row);
    });
    if (!learners.length) { const row=node('tr');const cell=node('td','No matching learners.');cell.colSpan=5;row.append(cell);$('learner-rows').append(row); }
    $('learners-prev').disabled = page === 0;
    $('learners-next').disabled = learners.length <= 50;
    $('learners-page').textContent = 'Page ' + (page + 1);
    status('');
  }
  function showFields(parent, value, prefix = '') {
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => showFields(parent, item, prefix ? prefix + ' / ' + key : key));
      return;
    }
    const field = node('div', undefined, 'worksheet-field');
    field.append(node('strong', prefix.replaceAll('-', ' ')), node('span', String(value ?? '')));
    parent.append(field);
  }
  async function showLearner(learner) {
    const request = ++detailRequest;
    selectedLearner = learner;
    $('learner-title').textContent = learner.email;
    $('learner-detail').hidden = false;
    $('learner-progress').textContent = 'Loading…';
    $('learner-worksheets').replaceChildren(); $('learner-notes').replaceChildren();
    const detail = await rpc('hella_learner_detail', { p_user:learner.id });
    if (request !== detailRequest) return;
    $('learner-progress').replaceChildren(node('h3','Progress'));
    Object.entries(modules).forEach(([id,title]) => {
      const complete = detail.progress.some(item => item.module_id === id && item.completed);
      $('learner-progress').append(node('p', title + ' · ' + (complete ? 'Complete' : 'Not completed')));
    });
    if (role === 'owner' || role === 'manager') {
      $('learner-worksheets').append(node('h3','Saved worksheets'));
      detail.worksheets.forEach(worksheet => {
        const section = node('details'); section.append(node('summary', worksheet.worksheet_name));
        section.append(node('p', 'Last saved ' + date(worksheet.updated_at)));
        showFields(section, worksheet.data); $('learner-worksheets').append(section);
      });
      if (!detail.worksheets.length) $('learner-worksheets').append(node('p','No worksheets saved yet.'));
    }
    detail.notes.forEach(note => { const row=node('div',undefined,'note-row');row.append(node('p',note.note),node('time',date(note.created_at)));$('learner-notes').append(row); });
    if (!detail.notes.length) $('learner-notes').append(node('p','No support notes yet.'));
  }
  $('note-form').addEventListener('submit', event => {
    event.preventDefault();
    const learner = selectedLearner;
    run(event.currentTarget.querySelector('button'), async () => {
      await rpc('hella_add_note', { p_user:learner.id, p_note:$('support-note').value.trim() });
      $('support-note').value = '';
      if (selectedLearner?.id === learner.id) await showLearner(learner);
      status('Support note saved.');
    });
  });
  async function loadTeam() {
    const team = await rpc('hella_team');
    $('team-list').replaceChildren();
    team.forEach(member => {
      const row=node('div',undefined,'team-row');row.append(node('span',member.email + ' · ' + member.role));
      const button=node('button','Remove access');button.type='button';
      button.addEventListener('click', () => {
        if (!confirm('Remove staff access for ' + member.email + '?')) return;
        run(button, async () => { await rpc('hella_set_staff',{p_email:member.email,p_role:null});await authenticate();await loadTeam();status('Staff access removed.'); });
      });
      row.append(button);$('team-list').append(row);
    });
  }
  $('team-form').addEventListener('submit', event => {
    event.preventDefault();
    run(event.currentTarget.querySelector('button'), async () => {
      await rpc('hella_set_staff',{p_email:$('team-email').value.trim(),p_role:$('team-role').value});
      await authenticate();await loadTeam();status('Team access saved.');
    });
  });
  // Refresh authorization whenever the account changes.
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { role=null;$('admin-dashboard').hidden=true;$('admin-access').hidden=false;$('admin-signout').hidden=true; }
  });
  authenticate().catch(error => { $('access-error').textContent = error.message; });
})();
