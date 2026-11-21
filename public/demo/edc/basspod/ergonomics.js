'use strict';
(()=>{
 const get=id=>document.getElementById(id),layout=document.querySelector('.layout');
 const cards=[...document.querySelectorAll('.view-pair > .canvas')];
 const sections=[...document.querySelectorAll('.controls > section')];
 const toolbar=document.createElement('div');toolbar.className='workspace-toolbar';
 toolbar.innerHTML='<div class="mode-slot"></div><div class="tile-control"><span class="label">FRAME SIZE</span><button id="tileAuto" aria-pressed="true" type="button">AUTO</button><input id="tileSize" type="range" min="0" max="2" step="1" value="0" aria-label="Frame size"><output id="tileName">COMPACT</output></div>';
 toolbar.querySelector('.mode-slot').append(document.querySelector('.plan-mode'));
 const tiles=document.createElement('div');tiles.className='view-tiles';
 cards[0].classList.add('camera-tile');cards[1].classList.add('map-tile');
 const mapDetails=document.createElement('details');mapDetails.className='map-thumbnail';mapDetails.open=true;
 mapDetails.innerHTML='<summary>OVERHEAD MAP</summary>';mapDetails.append(cards[1]);
 tiles.append(cards[0],mapDetails);
 const dock=document.createElement('section');dock.className='live-dock';dock.setAttribute('aria-label','Active camera controls');
 const zoom=document.createElement('div');zoom.className='live-zoom';
 zoom.innerHTML='<label for="liveZoom" class="label">FOCAL LENGTH · <output id="liveZoomValue"></output></label><input id="liveZoom" type="range" min="1" max="600" step="1" aria-label="Active focal length"><label class="jog-choice">STEP <select id="motionStep" aria-label="Movement step"><option value=".1">0.1 ft</option><option value="1" selected>1 ft</option><option value="5">5 ft</option></select></label>';
 const lensLabel=document.createElement('label');lensLabel.className='inventory-choice label';lensLabel.textContent='LENS INVENTORY';
 const inventorySelect=document.createElement('select');inventorySelect.id='inventoryLens';inventorySelect.setAttribute('aria-label','Angenieux inventory lens');
 lensInventory.forEach((lens,i)=>inventorySelect.add(new Option(lens.name,String(i))));lensLabel.append(inventorySelect);zoom.prepend(lensLabel);
 inventorySelect.addEventListener('change',()=>{const lens=lensInventory[Number(inventorySelect.value)];state.lenses=[lens.min,Math.max(lens.min,Math.min(lens.max,state.lenses[1])),lens.max];viewfinderState.lens=1;render();});
 cards[0].querySelector('#frameLens').closest('label').hidden=true;
 const jog=document.createElement('div');jog.className='motion-pad';
 jog.innerHTML='<label class="label">MOVE <select id="motionTarget" aria-label="Movement target"><option value="camera">CAMERA</option><option value="aim">AIM</option></select></label><div class="jog-buttons" role="group" aria-label="Camera movement pad"><button type="button" data-jog="forward">FORWARD</button><button type="button" data-jog="left">LEFT</button><button type="button" data-jog="right">RIGHT</button><button type="button" data-jog="back">BACK</button></div>';
 const quick=document.createElement('div');quick.className='quick-controls';quick.append(jog,zoom);
 dock.append(quick,sections[0]);
 layout.append(toolbar,tiles,dock);
 sections[0].querySelector('h2').textContent='POSITION / AIM / HEIGHT';
 const more=document.createElement('div');more.className='secondary-controls';
 const group=(name,content)=>{const d=document.createElement('details');d.className='control-group';d.innerHTML='<summary>'+name+'</summary>';d.append(content);more.append(d);return d;};
 const calibration=document.createElement('section');
 for(const id of ['stageY','plotScale'])calibration.append(get(id).closest('label'));
 calibration.append(get('plotDimensions'),get('groundHint'));const scaleReference=document.querySelector('.scale-details');if(scaleReference)calibration.append(scaleReference);group('SITE SCALE / CALIBRATION',calibration);
 sections[1].hidden=true;more.append(sections[1]);group('SENSOR / OVERLAYS',sections[2]);
 for(const h of more.querySelectorAll('.section-top'))h.remove();
 const height=get('groundHeight');get('groundPosition').insertBefore(height,get('ax').closest('label'));
 const legacy=document.querySelector('.camera-presets');
 toolbar.querySelector('.mode-slot').append(legacy);
 legacy.querySelector('h2').hidden=true;
 legacy.querySelector('summary').textContent='CAMERA POSITIONS';
 layout.replaceChildren(toolbar,tiles,dock,more);
 const status=get('status');if(status)more.append(status);
 let preference='auto';try{preference=localStorage.getItem('kinetic-array-tile-layout')||'auto';}catch{}
 let previousLayout='';
 function tileLayout(){
  const chosen=preference==='auto'?(innerWidth<1450||innerHeight<850?'compact':'balanced'):preference;
  document.body.dataset.tileLayout=chosen;
  get('tileName').textContent=chosen.toUpperCase();get('tileSize').value=['compact','balanced','large'].indexOf(chosen);
  get('tileAuto').setAttribute('aria-pressed',String(preference==='auto'));
  if(chosen!==previousLayout){mapDetails.open=chosen!=='large';previousLayout=chosen;}
 }
 function remember(){try{localStorage.setItem('kinetic-array-tile-layout',preference);}catch{}tileLayout();}
 get('tileAuto').onclick=()=>{preference='auto';remember();};
 get('tileSize').oninput=e=>{preference=['compact','balanced','large'][Number(e.target.value)];remember();};
 addEventListener('resize',tileLayout);tileLayout();
 function setInput(id,value){const input=get(id);input.value=Math.max(Number(input.min),Math.min(Number(input.max),value));input.dispatchEvent(new Event('input',{bubbles:true}));}
 get('liveZoom').oninput=e=>{setInput('f1',Number(e.target.value));};
 function sync(){
  const value=Number(get('f'+get('frameLens').value).value);
  const lens=activeInventory();inventorySelect.value=String(lensInventory.indexOf(lens));get('liveZoom').min=lens.min;get('liveZoom').max=lens.max;get('liveZoom').value=value;get('liveZoomValue').textContent=value+' MM';
  const cable=get('cameraMode').value==='cable';jog.hidden=cable;
  get('motionStep').closest('label').hidden=cable;
  dock.querySelector('h2').textContent=cable?'TRAVEL / HEIGHT / PAN / TILT':'POSITION / AIM / HEIGHT';
 }
 new MutationObserver(sync).observe(get('frameReadout'),{childList:true,subtree:true,characterData:true});sync();
 let repeat=0,delay=0,held=null;
 function stop(){clearTimeout(delay);clearInterval(repeat);if(held){held.removeAttribute('data-held');held=null;}}
 function nudge(direction){
  const prefix=get('motionTarget').value==='aim'?'a':'c';
  const axis=['left','right'].includes(direction)?'x':'y';
  const sign=['right','back'].includes(direction)?1:-1;
  setInput(prefix+axis,Number(get(prefix+axis).value)+sign*Number(get('motionStep').value));
 }
 for(const button of jog.querySelectorAll('[data-jog]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();stop();button.focus();held=button;button.setAttribute('data-held','true');button.setPointerCapture(e.pointerId);nudge(button.dataset.jog);delay=setTimeout(()=>{repeat=setInterval(()=>nudge(button.dataset.jog),90);},320);});
  button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop);
  button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();nudge(button.dataset.jog);}});
 }
 addEventListener('blur',stop);
})();
