'use strict';

/* A show travels in the URL fragment; the server never receives its contents. */
function mountShow({key, read, apply, validate, interpolate, seconds=4}) {
  const box=document.getElementById('show');
  box.innerHTML=`
    <div class="show-top"><div><h2>Show presets</h2><p>Set the shot, name it, and click <strong>Save preset</strong>. Click any preset to recall it. Select one before sharing to make it the opening shot.</p></div>
    <div class="show-actions"><button id="showRun" type="button">Run show</button><button id="showShare" type="button">Share show</button></div></div>
    <div id="showCues" class="show-cues" aria-label="Saved camera presets"></div>
    <div class="show-edit"><input id="cueName" maxlength="36" placeholder="Name this shot" aria-label="Preset name"><button id="cueSave" type="button">Save preset</button><button id="cueUpdate" type="button">Update selected</button><button id="cueRemove" type="button">Remove selected</button></div>
    <div class="show-timeline"><label for="showPosition">Run position</label><input id="showPosition" type="range" min="0" max="1000" value="0"><output id="showStep"></output></div>
    <input id="showLink" aria-label="Copyable show link" readonly hidden><span id="showStatus" role="status"></span>`;
  const get=id=>box.querySelector('#'+id);
  let cues=[],active=-1,raf=0,progress=0;
  function decode() {
    try {
      const hash=location.hash.startsWith('#show=')?decodeURIComponent(location.hash.slice(6)):null;
      const stored=hash??localStorage.getItem(key);
      if(!stored||stored.length>32000)return;
      const data=JSON.parse(stored);
      if(!Array.isArray(data.cues))return;
      cues=data.cues.slice(0,16).filter(c=>c&&typeof c.name==='string'&&validate(c.shot))
        .map(c=>({name:c.name.trim().slice(0,36)||'Camera preset',shot:c.shot}));
      active=Number.isInteger(data.active)&&data.active>=0&&data.active<cues.length?data.active:-1;
      if(active>=0){apply(cues[active].shot);progress=active;}
      else if(validate(data.initial))apply(data.initial);
    }catch{/* Invalid or unavailable saved show leaves the default camera in place. */}
  }
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({cues,active,initial:read()}));}catch{}};
  const report=msg=>get('showStatus').textContent=msg;
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
  function refresh(){
    const row=get('showCues');row.replaceChildren();
    if(!cues.length){const empty=document.createElement('span');empty.textContent='No show presets saved yet.';row.append(empty);}
    cues.forEach((cue,i)=>{
      const b=document.createElement('button');b.type='button';b.textContent=(i+1)+' / '+cue.name;
      b.setAttribute('aria-pressed',String(i===active));
      b.addEventListener('click',()=>{stop();active=i;progress=i;apply(cue.shot);persist();refresh();});
      row.append(b);
    });
    get('cueUpdate').disabled=get('cueRemove').disabled=active<0;
    get('cueSave').disabled=cues.length>=16;
    get('showRun').disabled=get('showPosition').disabled=cues.length<2;
    updateRun();
  }
  function updateRun(){
    const end=Math.max(0,cues.length-1);
    get('showRun').textContent=raf?'Pause':'Run show';
    get('showPosition').value=end?Math.round(progress/end*1000):0;
    get('showStep').textContent=cues.length?Math.min(cues.length,Math.floor(progress)+1)+' / '+cues.length:'—';
  }
  get('cueSave').onclick=()=>{
    if(cues.length>=16)return;
    stop();const input=get('cueName');
    cues.push({name:input.value.trim()||'Cam '+(cues.length+1),shot:read()});input.value='';
    active=cues.length-1;progress=active;persist();refresh();report('Preset saved.');
  };
  get('cueUpdate').onclick=()=>{
    if(active<0)return;
    stop();const input=get('cueName');
    cues[active]={name:input.value.trim()||cues[active].name,shot:read()};input.value='';
    persist();refresh();report('Selected preset updated.');
  };
  get('cueRemove').onclick=()=>{
    if(active<0)return;
    stop();cues.splice(active,1);active=-1;progress=0;persist();refresh();report('Preset removed.');
  };
  function seek(p){
    progress=p;
    const i=Math.floor(p),j=Math.min(cues.length-1,i+1);
    const changed=i!==active;active=i;
    apply(interpolate&&i!==j?interpolate(cues[i].shot,cues[j].shot,p-i):cues[i].shot);
    if(changed)refresh();else updateRun();
  }
  get('showPosition').oninput=e=>{stop();seek(Number(e.target.value)/1000*(cues.length-1));};
  get('showRun').onclick=()=>{
    if(raf){stop();refresh();return;}
    const end=cues.length-1,start=progress>=end?0:progress,t0=performance.now();
    const tick=now=>{
      const p=Math.min(end,start+(now-t0)/(seconds*1000));
      raf=p<end?requestAnimationFrame(tick):0;seek(p);
    };
    raf=requestAnimationFrame(tick);updateRun();
  };
  get('showShare').onclick=async()=>{
    const url=new URL(location.href);
    url.hash='show='+encodeURIComponent(JSON.stringify({cues,active,initial:active>=0?cues[active].shot:read()}));
    const field=get('showLink');field.value=url.href;field.hidden=false;field.select();
    try{await navigator.clipboard.writeText(url.href);report('Show link copied.');}
    catch{report('Copy the selected link to share this show.');}
  };
  decode();refresh();
  return {stop(){if(raf){stop();updateRun();}}};
}
