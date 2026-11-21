'use strict';
(()=>{
 const layout=document.querySelector('.layout'),views=document.querySelector('.view-tiles');
 const workspace=document.createElement('div');workspace.className='split-workspace';
 const divider=document.createElement('div');divider.className='view-divider';divider.id='viewDivider';divider.tabIndex=0;
 divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','horizontal');divider.setAttribute('aria-label','Resize camera and map views');divider.setAttribute('aria-controls','splitViews splitSettings');
 divider.title='Drag to resize views · Up/Down to adjust · Double-click to reset';
 divider.innerHTML='<span aria-hidden="true"></span><small>DRAG TO RESIZE VIEWS</small>';
 const settings=document.createElement('div');settings.className='split-settings';settings.id='splitSettings';settings.setAttribute('role','region');settings.setAttribute('aria-label','Scrollable camera settings');settings.tabIndex=0;
 views.id='splitViews';views.before(workspace);workspace.append(views,divider,settings);
 for(const selector of ['.live-dock','.secondary-controls','#show']){const node=document.querySelector(selector);if(node)settings.append(node);}
 let ratio=.52;try{const saved=Number(localStorage.getItem('kinetic-view-split'));if(saved>=.25&&saved<=.8)ratio=saved;}catch{}
 let start=null;
 function resize(){
  const height=Math.max(520,innerHeight-workspace.getBoundingClientRect().top-18);
  workspace.style.height=height+'px';
  const upper=Math.max(210,Math.min(height-175,ratio*(height-24)));
  workspace.style.setProperty('--views-height',upper+'px');
  divider.setAttribute('aria-valuemin','25');divider.setAttribute('aria-valuemax','80');divider.setAttribute('aria-valuenow',String(Math.round(upper/(height-24)*100)));
  divider.setAttribute('aria-valuetext',Math.round(upper)+' pixels for views');
 }
 function remember(){try{localStorage.setItem('kinetic-view-split',String(ratio));}catch{}}
 divider.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();divider.focus();start={y:event.clientY,height:views.getBoundingClientRect().height};divider.setPointerCapture(event.pointerId);divider.classList.add('dragging');});
 divider.addEventListener('pointermove',event=>{if(!start)return;ratio=Math.max(.25,Math.min(.8,(start.height+event.clientY-start.y)/(workspace.clientHeight-24)));resize();});
 function stop(){if(!start)return;start=null;divider.classList.remove('dragging');remember();}
 divider.addEventListener('pointerup',stop);divider.addEventListener('pointercancel',stop);divider.addEventListener('lostpointercapture',stop);addEventListener('blur',stop);
 divider.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();ratio=event.key==='Home'?.52:Math.max(.25,Math.min(.8,ratio+(event.key==='ArrowDown'?.04:-.04)));resize();remember();});
 divider.addEventListener('dblclick',()=>{ratio=.52;resize();remember();});
 const map=document.querySelector('.map-thumbnail');map.open=true;
 document.getElementById('tileSize').addEventListener('input',()=>{map.open=true;ratio=[.4,.52,.72][Number(document.getElementById('tileSize').value)];resize();remember();});
 document.getElementById('tileAuto').addEventListener('click',()=>{map.open=true;ratio=.52;resize();remember();});
 addEventListener('resize',resize);new ResizeObserver(resize).observe(document.querySelector('.workspace-toolbar'));resize();
})();
