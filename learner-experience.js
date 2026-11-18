/* HELLA BUILD: low-friction learner controls. Progressive enhancement, no forced gates. */
(() => {
  'use strict';
  const modules = [
    ['Discover your real skills','Name abilities behind the roles you have held','Verified skills inventory'],
    ['Build your skill stack','Choose skills that support one another','Primary skill stack'],
    ['Find the problem worth solving','Identify who needs your skills and why','Audience and problem brief'],
    ['Turn skills into an offer','Define what the customer receives','Version 0 offer'],
    ['Price your work','Check costs, capacity and an initial price','Pricing decision'],
    ['Build a delivery system','Map how the work gets delivered','Delivery workflow'],
    ['Protect your time and scope','Set clear expectations and change rules','Scope guidelines'],
    ['Test your build','Prepare a real-world market test','Final Hella Build Blueprint']
  ];
  const match = location.pathname.match(/module(\d+)\.html$/i);
  if (!match) return;
  const index = Number(match[1])-1;
  if (index < 0 || index > 7) return;
  const STORE = 'hella-build:ux:v1';
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch {}
  const persistPref = () => { try { localStorage.setItem(STORE, JSON.stringify(pref)); } catch {} };
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if(cls) node.className = cls;
    if(text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, action, cls='') => {
    const b = el('button','hb-ux-btn '+cls,label); b.type='button'; b.addEventListener('click', action); return b;
  };
  const close = () => { document.getElementById('hb-ux-backdrop')?.remove(); };
  function openPanel(title, render) {
    close();
    const overlay = el('div','hb-ux-backdrop'); overlay.id='hb-ux-backdrop';
    const panel = el('section','hb-ux-dialog'); panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label',title);
    const heading = el('div','hb-ux-heading');
    heading.append(el('h2','',title),button('Close',close,'hb-ux-close'));
    panel.append(heading); render(panel);
    overlay.append(panel);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    document.body.append(overlay);
    overlay.querySelector('button')?.focus();
    const key=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',key);}};
    document.addEventListener('keydown',key,{once:false});
  }
  const controls = el('div','hb-ux-controls');
  const focus = button('Focus mode',()=>{pref.focus=!pref.focus;persistPref();applyFocus();close();toolsButton.focus();},'hb-ux-focus');
  function applyFocus(){
    document.documentElement.classList.toggle('hb-ux-focused',!!pref.focus);
    focus.textContent=pref.focus?'Show course menu':'Focus mode';
    focus.setAttribute('aria-pressed',String(!!pref.focus));
  }
  controls.append(
    button('Where am I?',()=>{
      openPanel('Your place in Hella Build',p=>{
        p.append(el('p','hb-ux-meta','MODULE '+String(index+1).padStart(2,'0')+' / '+modules.length));
        p.append(el('h3','',modules[index][0]));
        p.append(el('p','', 'Right now: '+modules[index][1]+'.'));
        p.append(el('p','', 'You are building: '+modules[index][2]+'.'));
        p.append(el('p','hb-ux-muted','Previously: '+(index?modules[index-1][2]:'You are starting your build')+'.'));
        p.append(el('p','hb-ux-muted','Next: '+(modules[index+1]?.[0]||'Review your finished blueprint')+'.'));
        p.append(button('Back to my work',close,'hb-ux-primary'));
      });
    }),
    button('Idea Vault',()=>{ void showVault(); }),
    focus
  );
  const toolsButton = button('Tools', () => {
    openPanel('Course tools', panel => panel.append(controls));
  });
  toolsButton.setAttribute('aria-haspopup', 'dialog');
  document.querySelector('nav .nav-right')?.prepend(toolsButton);
  applyFocus();
  // Idea Vault uses the existing authenticated worksheet table. Never place private
  // learner text in shared browser storage, and show failures rather than pretending to save.
  async function showVault(){
    openPanel('Idea Vault',p=>{
      p.append(el('p','hb-ux-muted','Put a new direction here. You can return to it later without changing your current build.'));
      const form=el('form','hb-ux-vault-form');
      const field=el('textarea','hb-ux-input'); field.rows=3;field.maxLength=2000;
      field.placeholder='A skill combination, audience, offer, or thought to revisit…';
      field.setAttribute('aria-label','Idea to save');
      const save=button('Save idea',()=>{},'hb-ux-primary');save.type='submit';
      const status=el('p','hb-ux-status','');
      const list=el('div','hb-ux-ideas');
      form.append(field,save,status);p.append(form,list);
      const valid=typeof loadWorksheet==='function'&&typeof saveWorksheet==='function';
      if(!valid){status.textContent='Your account storage is not ready. Ideas cannot be saved here yet.';save.disabled=true;return;}
      let ideas=[];
      const draw=()=>{
        list.replaceChildren();
        if(!ideas.length){list.append(el('p','hb-ux-muted','Nothing parked yet.'));return;}
        for(let i=ideas.length-1;i>=0;i--){
          const item=el('div','hb-ux-idea');item.append(el('p','',ideas[i].text));
          item.append(button('Remove',async()=>{
            const next=ideas.filter(x=>x.id!==ideas[i].id);
            const result=await saveWorksheet('hella-idea-vault-v1',{ideas:next});
            if(result?.error){status.textContent='Could not remove this idea. Check your connection.';return;}
            ideas=next;draw();status.textContent='Idea removed.';
          },'hb-ux-quiet'));list.append(item);
        }
      };
      save.disabled=true;status.textContent='Loading saved ideas…';
      Promise.resolve(loadWorksheet('hella-idea-vault-v1')).then(data=>{
        ideas=Array.isArray(data?.ideas)?data.ideas:[];save.disabled=false;status.textContent='';draw();
      }).catch(()=>{status.textContent='Could not load your ideas. Please try again.';});
      form.addEventListener('submit',async event=>{
        event.preventDefault();const text=field.value.trim();if(!text)return;
        save.disabled=true;status.textContent='Saving…';
        const next=[...ideas,{id:Date.now()+'-'+Math.random().toString(36).slice(2),text}];
        try{
          const result=await saveWorksheet('hella-idea-vault-v1',{ideas:next});
          if(result?.error) throw result.error;
          ideas=next;field.value='';status.textContent='Saved to your account.';draw();
        }catch{status.textContent='Not saved. Check your connection and try again.';}
        finally{save.disabled=false;}
      });
    });
  }
  // Checkpoints are for orientation, not a hard navigation lock.
  const label = el('div','hb-ux-checkpoint');
  label.append(el('span','hb-ux-dot','●'),el('span','', 'Module '+(index+1)+' · '+modules[index][2]));
  const content=document.querySelector('.main');
  if(content) content.prepend(label);
})();
