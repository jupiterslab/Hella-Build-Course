async function openStackBuilder(userId) {
  const byId = id => document.getElementById(id);
  const status = byId('stack-status'), retry = byId('retry-stack');
  async function read(name) {
    const {data,error} = await sb.from('worksheets').select('data').eq('user_id',userId).eq('worksheet_name',name).maybeSingle();
    if (error) throw error;
    return data?.data || {};
  }
  let harvest, saved;
  retry.hidden = true;
  try {
    [harvest,saved] = await Promise.all([read('harvest-matrix'),read('skill-stack-builder')]);
  } catch {
    status.textContent = 'Your work could not be loaded. Try again.';
    retry.hidden = false;
    retry.onclick = () => openStackBuilder(userId);
    return;
  }
  const lead = byId('lead'), support = byId('support'), audience = byId('audience'), result = byId('result');
  const confirm = byId('confirm-stack');
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const key = value => clean(value).toLowerCase();
  const rows = (Array.isArray(harvest.rows) ? harvest.rows : []).map(row => ({
    role:clean(row?.a), work:clean(row?.b), outcome:clean(row?.d),
    skills:clean(row?.c).split(/[,;+\n]/).map(clean).filter(Boolean)
  }));
  const skills = new Map();
  function add(value) { if (clean(value) && !skills.has(key(value))) skills.set(key(value),clean(value)); }
  const old = saved.guidedStack || {};
  const legacy = saved.previousStacks || (!saved.guidedStack && Object.keys(saved).length ? {...saved} : {});
  const previous = byId('previous-stacks');
  for (const [field,value] of Object.entries(legacy)) {
    if (!clean(value)) continue;
    const line = document.createElement('p');
    line.textContent = field.replace(/^s(\d)-/, 'Stack $1 · ').replace('primaryStack','Primary stack') + ' · ' + value;
    previous.lastElementChild.append(line);
    previous.hidden = false;
  }
  [old.lead,saved['s1-primary'],harvest.primary].forEach(add);
  rows.forEach(row => row.skills.forEach(add));
  [old.support,saved['s1-support']].forEach(add);
  function options(select, values, preferred) {
    select.replaceChildren(...values.map(value => new Option(value,value)));
    if (skills.has(key(preferred)) && values.includes(skills.get(key(preferred)))) select.value = skills.get(key(preferred));
  }
  options(lead,[...skills.values()],old.lead || saved['s1-primary'] || harvest.primary);
  function supports(preferred) {
    const sameRole = rows.filter(row => row.skills.some(s=>key(s)===key(lead.value))).flatMap(row=>row.skills);
    const choices = [...skills.values()].filter(s=>s!==lead.value);
    options(support,choices,preferred || sameRole.find(s=>key(s)!==key(lead.value)));
  }
  supports(old.support || saved['s1-support']);
  audience.value = clean(old.audience);
  const initialEvidence = rows.find(row => row.outcome && row.skills.some(s => key(s) === key(lead.value)));
  result.value = clean(old.result ?? saved['s1-advantage'] ?? initialEvidence?.outcome);
  function sentence() {
    return lead.value + ' + ' + support.value + ' helps ' + (audience.value.trim() || '[who you help]') + ' ' + (result.value.trim() || '[what they can do]') + '.';
  }
  function render() {
    const evidence = byId('evidence');
    evidence.replaceChildren();
    const matches = rows.filter(row=>row.skills.some(s=>[key(lead.value),key(support.value)].includes(key(s))));
    for (const row of matches) {
      if (!(row.role || row.work)) continue;
      const item = document.createElement('p'), title = document.createElement('strong');
      title.textContent = row.role;
      item.append(title,document.createTextNode((row.role && row.work ? ' · ' : '')+row.work));
      if (row.outcome) item.append(document.createElement('br'),document.createTextNode('Result: '+row.outcome));
      evidence.append(item);
    }
    if (evidence.childElementCount) {
      const source = document.createElement('details'), summary = document.createElement('summary');
      summary.textContent = 'See the work behind these skills';
      source.append(summary,...Array.from(evidence.children));
      evidence.append(source);
    }
    const pair = Boolean(lead.value && support.value);
    const shared = matches.find(row => row.role && [lead.value,support.value].every(skill => row.skills.some(s => key(s) === key(skill))));
    byId('pair-context').textContent = !pair ? '' : shared ? 'You identified both skills in this role: ' + shared.role + '.' : 'Try these together. Where could one skill make the other more useful?';
    byId('need-harvest').hidden = pair;
    byId('stack-details').hidden = !pair;
    byId('stack-preview').textContent = sentence();
  }
  byId('guided-work').hidden = false;
  status.textContent = skills.size < 2 ? 'Choose two skills in Harvest to build a pair here.' : old.lead ? 'Saved stack restored.' : 'Starting pair from your saved work';
  render();
  let queue = Promise.resolve(), revision = 0, timer;
  function snapshot() {
    const title = lead.value+' + '+support.value;
    return {...saved,previousStacks:legacy,guidedStack:{lead:lead.value,support:support.value,audience:audience.value.trim(),result:result.value.trim()},
      's1-primary':lead.value,'s1-support':support.value,'s1-name':title,'s1-context':audience.value.trim(),
      's1-advantage':result.value.trim(),'s1-sentence':sentence()};
  }
  function write(payload) {
    queue = queue.catch(()=>{}).then(async()=>{
      const {error} = await saveWorksheet('skill-stack-builder',payload);
      if (error) throw error;
    });
    return queue;
  }
  async function saveDraft(version) {
    try { await write(snapshot()); if(version===revision) {status.textContent='Draft saved.';retry.hidden=true;} }
    catch { if(version===revision) { status.textContent='Your draft could not be saved.';retry.hidden=false;retry.onclick=()=>saveDraft(revision); } }
  }
  function edited() {
    render(); retry.hidden=true;
    const version=++revision;
    clearTimeout(timer); status.textContent='Saving draft…';
    timer=setTimeout(()=>saveDraft(version),350);
  }
  lead.onchange=()=>{supports(support.value===lead.value ? '' : support.value);edited();};
  support.onchange=edited; audience.oninput=edited; result.oninput=edited;
  confirm.onclick=async()=>{
    for(const field of [audience,result]) {
      if(!field.value.trim()) { field.focus(); status.textContent=field===audience?'Add who you would help.':'Add what they could do with your help.';return; }
    }
    clearTimeout(timer); ++revision;
    byId('stack-details').disabled=true; lead.disabled=support.disabled=true; retry.hidden=true;
    try {
      const payload=snapshot(); payload.primaryStack=payload['s1-sentence'];payload['primary-stack']=payload.primaryStack;
      await write(payload); saved=payload;
      const {error}=await sb.from('progress').upsert({user_id:userId,module_id:'module-02',completed:true,completed_at:new Date().toISOString()},{onConflict:'user_id,module_id'});
      if(error) throw error;
      byId('ck-02').textContent='✓';byId('ck-02').classList.add('done');byId('next-btn').classList.add('unlocked');
      status.textContent='Stack saved. Module 2 complete.';
      byId('next-btn').focus();
    } catch { status.textContent='Could not finish saving. Try again.'; }
    finally {byId('stack-details').disabled=false;lead.disabled=support.disabled=false;}
  };
}
