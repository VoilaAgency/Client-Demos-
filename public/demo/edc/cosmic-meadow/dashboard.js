'use strict';
(()=>{
 const get=id=>document.getElementById(id),zoom=document.querySelector('.live-zoom');
 const inventory=get('inventoryLens'),range=get('liveZoom'),value=get('liveZoomValue');
 const dashboard=document.createElement('div');dashboard.className='metric-dashboard';
 const lens=document.createElement('label');lens.className='dashboard-metric dashboard-lens';
 lens.innerHTML='<span class="dashboard-label">LENS</span><span class="dashboard-main"><output id="dashLensRange"></output><small>MM</small><span class="lens-chevron" aria-hidden="true">⌄</span></span>';
 lens.append(inventory);inventory.setAttribute('aria-label','Angénieux lens inventory');
 const focal=document.createElement('div');focal.className='dashboard-metric';focal.innerHTML='<span class="dashboard-label">FOCAL LENGTH</span><span class="dashboard-main"><small>MM</small></span>';
 focal.querySelector('.dashboard-main').prepend(value);
 function heightMetric(label,id){const box=document.createElement('label');box.className='dashboard-metric dashboard-height';box.innerHTML='<span class="dashboard-label">'+label+'</span><span class="dashboard-main"><output id="'+id+'Value"></output><small>FT</small></span><input id="'+id+'" class="height-fader" type="range" min="1" max="150" step="0.1" aria-label="'+label+' fader">';return box;}
 dashboard.append(lens,focal,heightMetric('CAMERA HEIGHT','dashCameraHeight'),heightMetric('AIM HEIGHT','dashAimHeight'));
 const track=document.createElement('div');track.className='dashboard-zoom-track';
 const floating=document.createElement('output');floating.id='zoomFloating';floating.className='zoom-floating';floating.setAttribute('aria-hidden','true');
 track.append(range,floating);
 const step=get('motionStep').closest('label');document.querySelector('.motion-pad').append(step);
 zoom.replaceChildren(dashboard,track);
 function setField(id,v){const field=get(id);field.value=v;field.dispatchEvent(new Event('input',{bubbles:true}));}
 get('dashCameraHeight').addEventListener('input',e=>{setField(get('cameraMode').value==='cable'?'cableHeight':'eye',e.target.value);sync();});
 get('dashAimHeight').addEventListener('input',e=>{if(get('cameraMode').value!=='cable')setField('targetHeight',e.target.value);sync();});
 function sync(){
  const chosen=activeInventory(),f=Number(range.value),fraction=(f-chosen.min)/(chosen.max-chosen.min);
  get('dashLensRange').textContent=chosen.min+'–'+chosen.max;
  value.textContent=String(f);floating.textContent=f+'mm';
  range.style.setProperty('--zoom-fill',Math.max(0,Math.min(1,fraction))*100+'%');
  const width=range.getBoundingClientRect().width,thumb=16,labelHalf=34;
  const position=thumb/2+fraction*Math.max(0,width-thumb);
  floating.style.left=Math.max(labelHalf,Math.min(width-labelHalf,position))+'px';
  const cable=get('cameraMode').value==='cable',cameraHeight=Number(get(cable?'cableHeight':'eye').value);
  const aimHeight=cable?activeCamera().targetHeight:Number(get('targetHeight').value);
  const camera=get('dashCameraHeight'),aim=get('dashAimHeight');
  camera.value=cameraHeight;camera.setAttribute('aria-valuetext',cameraHeight.toFixed(1)+' feet');
  aim.min=0;aim.value=Number.isFinite(aimHeight)?aimHeight:0;aim.disabled=cable;
  aim.title=cable?'Cable aim height follows the existing lock / tilt controls':'Adjust aim height';
  get('dashCameraHeightValue').textContent=cameraHeight.toFixed(1);
  get('dashAimHeightValue').textContent=Number.isFinite(aimHeight)?aimHeight.toFixed(1):'—';
 }
 new MutationObserver(sync).observe(get('frameReadout'),{childList:true,subtree:true,characterData:true});
 range.addEventListener('input',()=>requestAnimationFrame(sync));
 range.addEventListener('wheel',event=>{event.preventDefault();const step=event.shiftKey?5:1;range.value=Math.max(Number(range.min),Math.min(Number(range.max),Number(range.value)+(event.deltaY<0?step:-step)));range.dispatchEvent(new Event('input',{bubbles:true}));},{passive:false});
 new ResizeObserver(sync).observe(track);addEventListener('resize',sync);sync();
})();
