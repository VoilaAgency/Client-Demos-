'use strict';
const $=id=>document.getElementById(id),map=$('map'),finder=$('finder'),ft=venue.feet;
const origin=[618,298],bounds=[60,30,1160,720],northYaw=Math.atan2(.696,.718)*180/Math.PI;
const colors=['#4ccdeb','#ffb85c','#bca2ef'],names=['Wide','Midrange','Tight'];
const state={p:[825,485],alt:360,stage:0,mode:'lock',height:0,yaw:0,tilt:0,sensor:36,lenses:[24,40,70],visible:[true,true,true],lens:0,opacity:.22,crowd:true,zoom:'full'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=scene.wrap;
const fmt=(v,n=1)=>v.toFixed(n),selected=()=>venue.stages[state.stage];
const limits=[0,1].map(i=>[Math.ceil((bounds[i]+9-origin[i])*ft),Math.floor((bounds[i+2]-9-origin[i])*ft)]);
const points=a=>a.map(p=>p.map(x=>fmt(x,2)).join(',')).join(' ');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const text=(x,y,s,color='#9eb3bf',size=12,anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" text-anchor="'+anchor+'">'+escape(s)+'</text>';
const line=(p,color,w=1,d='')=>'<polyline points="'+points(p)+'" fill="none" stroke="'+color+'" stroke-width="'+w+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
const poly=(p,fill,stroke,w=1,o=1)=>'<polygon points="'+points(p)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'" fill-opacity="'+o+'"/>';
const circle=(p,r,fill,stroke,w=1)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'"/>';
const stageLabel=(s,i)=>{
  const [x,y]=s.label,w=30+s.name.length*8.1,active=i===state.stage;
  return '<g data-stage="'+i+'"><title>Aim at '+escape(s.name)+'</title><rect x="'+(x-w/2)+'" y="'+(y-18)+'" width="'+w+'" height="27" rx="4" fill="'+(active?'#292c36':'#122932')+'" stroke="'+(active?'#ffb85c':'#396272')+'"/>'+text(x-w/2+7,y,s.id,active?'#ffb85c':'#4ccdeb',11)+text(x-w/2+26,y,s.name,'#e0edf2',14)+'</g>';
};
const base='<defs><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" stroke="#243846" fill="none"/></pattern><clipPath id="infield"><path d="'+venue.track.inner+'"/></clipPath><clipPath id="mapClip"><rect x="60" y="30" width="1100" height="690"/></clipPath></defs>'+
  '<rect x="60" y="30" width="1100" height="690" fill="#111e28"/><rect x="60" y="30" width="1100" height="690" fill="url(#grid)"/>'+
  '<path d="'+venue.track.outer+'" fill="#293c48" stroke="#78929f" stroke-width="1.9"/><path d="'+venue.track.inner+'" fill="#14242f" stroke="#6b939d" stroke-width="1.5"/>'+
  '<g clip-path="url(#infield)">'+venue.stages.map(s=>poly(s.zone,'#1c3c48','#427e8d',1.2)).join('')+venue.roads.map(p=>line(p,'#617e8b',2.8,'6 4')).join('')+poly(venue.garage,'#242e43','#8c78ad',1.4)+'</g>'+
  text(618,291,'DOWNTOWN EDC','#bca2ef',14,'middle')+text(618,310,'NEON GARAGE','#adb9c5',10,'middle')+
  text(580,105,'GRANDSTANDS / FRONTSTRETCH','#97b1bf',13,'middle')+text(622,654,'BACKSTRETCH','#97b1bf',12,'middle')+
  venue.extras.map(e=>'<g><title>'+escape(e.name)+'</title>'+circle(e.p,6,'#14242f','#ffb85c')+text(e.p[0],e.p[1]+3,e.id,'#ffb85c',8,'middle')+'</g>').join('')+
  venue.stages.map(s=>line(s.front,'#4ccdeb',2.2)).join('')+
  line([[1090,117],[1117,89]],'#dce7eb',1.7)+text(1125,89,'N','#dce7eb',15)+
  line([[93,690],[93+500/ft,690]],'#dce7eb',1.5)+line([[93,684],[93,696]],'#dce7eb')+line([[93+500/ft,684],[93+500/ft,696]],'#dce7eb')+text(93,710,'0')+text(93+500/ft,710,'500 FT','#9eb3bf',12,'end');
map.innerHTML='<g font-family="system-ui, sans-serif">'+base+'<g id="live"></g></g>';
$('stage').innerHTML=venue.stages.map((s,i)=>'<option value="'+i+'">'+s.id+' / '+escape(s.name)+'</option>').join('');
$('frameLens').innerHTML=names.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');
$('lenses').innerHTML=names.map((n,i)=>'<div class="lens" style="--lens:'+colors[i]+'"><div class="row"><label><input type="checkbox" id="vis'+i+'" checked> '+n+'</label><label>mm <input type="number" id="f'+i+'" min="8" max="200" step="1" aria-label="'+n+' focal length"></label></div><input type="range" id="zoom'+i+'" min="8" max="200" step="1" aria-label="'+n+' focal length slider"><output id="read'+i+'"></output></div>').join('');
let show,drag;
function position(p){state.p=p.map((v,i)=>origin[i]+clamp((v-origin[i])*ft,...limits[i])/ft);}
function lenses(){
  if(state.mode==='lock'){
    const [yaw,tilt]=scene.aim(state.p,state.alt,selected().aim,state.height,state.yaw);
    state.yaw=yaw;state.tilt=tilt;
  }
  return state.lenses.map(f=>scene.camera(state.p,state.alt,state.yaw,state.tilt,state.sensor,f));
}
function fit(){
  const [x,y]=selected().aim,w=225,h=141;
  map.setAttribute('viewBox',state.zoom==='full'?'60 30 1100 690':[clamp(x-w/2,60,1160-w),clamp(y-h/2,30,720-h),w,h].join(' '));
}
function redraw(cams){
  const aim=state.mode==='lock'?selected().aim:cams[state.lens].ground(0,0);
  let m='<g clip-path="url(#mapClip)">';
  cams.forEach((c,i)=>{if(state.visible[i]&&c.footprint.length>=3)m+=poly(c.footprint,colors[i],colors[i],i===state.lens?2.1:1.1,state.opacity);});
  if(aim){const [x,y]=aim;m+=line([state.p,aim],'#dce7eb',1.3,'5 5')+poly([[x,y-7],[x+7,y],[x,y+7],[x-7,y]],'#101820','#ffb85c',2);}
  m+=venue.stages.map(stageLabel).join('');
  const [x,y]=state.p,yaw=state.yaw*Math.PI/180;
  m+='<g data-drone="1"><title>Drag aircraft</title>'+circle(state.p,25,'transparent','none')+circle(state.p,10,'#101820','#e0edf2',2.2)+line([state.p,[x+21*Math.sin(yaw),y-21*Math.cos(yaw)]],'#e0edf2',2)+text(x+15,y+17,'AIRCRAFT','#e0edf2',12)+'</g></g>';
  $('live').innerHTML=m;
}
function readout(c){return fmt(c.hfov)+'° H / '+fmt(c.vfov)+'° V · '+fmt(state.alt)+' ft AGL · '+fmt(state.tilt)+'° tilt';}
function area(p){return Math.abs(p.reduce((a,[x,y],i)=>{const [u,v]=p[(i+1)%p.length];return a+x*v-y*u;},0))/2;}
function render(skip=''){
  const cams=lenses();
  redraw(cams);
  const values={x:Math.round((state.p[0]-origin[0])*ft),y:Math.round((state.p[1]-origin[1])*ft),alt:Math.round(state.alt*10)/10,altSlide:state.alt,
    stage:state.stage,heading:(Math.round(wrap(state.yaw-northYaw)*10)%3600)/10,tilt:Math.round(state.tilt*10)/10,aimHeight:state.height,sensor:state.sensor,
    mode:state.mode,frameLens:state.lens,format:[36,24].includes(state.sensor)?state.sensor:'custom',opacity:Math.round(state.opacity*100),mapZoom:state.zoom};
  for(const [k,v] of Object.entries(values))if(k!==skip)$(k).value=v;
  $('heading').disabled=$('tilt').disabled=state.mode==='lock';$('aimHeight').disabled=state.mode==='manual';
  $('crowd').checked=state.crowd;$('opacityRead').textContent=Math.round(state.opacity*100)+'%';
  cams.forEach((c,i)=>{
    if(skip!=='f'+i)$('f'+i).value=state.lenses[i];$('zoom'+i).value=state.lenses[i];$('vis'+i).checked=state.visible[i];
    $('frameLens').options[i].textContent=names[i]+' · '+state.lenses[i]+' mm';
    const acres=area(c.footprint)*ft*ft/43560;
    $('read'+i).textContent=fmt(c.hfov)+'° HFOV · '+(acres>.001?fmt(acres,2)+' acres in map'+(c.horizon?' · horizon clipped':''):'No ground footprint in map');
  });
  $('cameraRead').textContent=readout(cams[state.lens]);
  scene.draw(finder,cams[state.lens],state.stage,state.crowd,state.alt);
}
const stop=()=>show?.stop();
function change(id,fn){$(id).addEventListener('change',e=>{stop();fn(e.target.value,e.target);render();});}
function numeric(id,fn){
  const el=$(id);
  el.addEventListener('input',()=>{const v=el.valueAsNumber;if(!Number.isFinite(v)||v<Number(el.min)||v>Number(el.max))return;stop();fn(v);render(id);});
  el.addEventListener('change',()=>render());
}
for(const [i,id] of ['x','y'].entries()){
  $(id).min=limits[i][0];$(id).max=limits[i][1];
  numeric(id,v=>position(state.p.map((x,k)=>k===i?origin[i]+v/ft:x)));
}
numeric('alt',v=>state.alt=v);numeric('heading',v=>state.yaw=wrap(v+northYaw));numeric('tilt',v=>state.tilt=v);
numeric('sensor',v=>state.sensor=v);numeric('aimHeight',v=>state.height=v);
change('stage',v=>{state.stage=Number(v);state.mode='lock';fit();});
change('mode',v=>state.mode=v);change('frameLens',v=>state.lens=Number(v));change('crowd',(_,el)=>state.crowd=el.checked);
change('mapZoom',v=>{state.zoom=v;fit();});
$('format').addEventListener('change',e=>{if(e.target.value==='custom'){$('sensor').focus();return;}stop();state.sensor=Number(e.target.value);render();});
function slider(id,fn){$(id).addEventListener('input',e=>{stop();fn(Number(e.target.value));render();});}
slider('altSlide',v=>state.alt=v);slider('opacity',v=>state.opacity=v/100);
names.forEach((_,i)=>{numeric('f'+i,v=>state.lenses[i]=v);slider('zoom'+i,v=>state.lenses[i]=v);change('vis'+i,(_,e)=>state.visible[i]=e.checked);});
for(const id of ['aerial','fpv','deck'])$(id).addEventListener('click',()=>{
  stop();const {front,right}=scene.basis(selected());
  const [distance,offset,alt,height]=id==='aerial'?[660,95,320,0]:id==='fpv'?[64,13,5.5,11.4]:[7,7,7.8,11.4];
  position(selected().aim.map((v,i)=>v+(distance*front[i]+offset*right[i])/ft));
  state.alt=alt;state.height=height;state.mode='lock';state.zoom=id==='aerial'?'full':'detail';fit();render();
});
document.addEventListener('keydown',e=>{
  if(!['ArrowUp','ArrowDown'].includes(e.key)||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,select,textarea,[contenteditable=true]'))return;
  e.preventDefault();stop();const step=(state.alt<=30?1:5)*(e.shiftKey?5:1);
  state.alt=clamp(state.alt+(e.key==='ArrowUp'?step:-step),.5,800);render();
});
const pointer=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(map.getScreenCTM().inverse());
map.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-drone]'),stage=e.target.closest('[data-stage]');
  if(!handle){if(stage){stop();state.stage=Number(stage.dataset.stage);state.mode='lock';fit();render();}return;}
  if(drag)return;e.preventDefault();stop();map.focus({preventScroll:true});const p=pointer(e);
  drag={id:e.pointerId,offset:[state.p[0]-p.x,state.p[1]-p.y]};map.setPointerCapture(e.pointerId);
});
map.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const p=pointer(e);position([p.x+drag.offset[0],p.y+drag.offset[1]]);render();});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])map.addEventListener(ev,e=>{if(drag?.id===e.pointerId)drag=null;});
const numericRange=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const arr=(a,n,check)=>Array.isArray(a)&&a.length===n&&a.every(check);
function valid(s){return !!s&&arr(s.p,2,(v)=>numericRange(v,0,1220))&&numericRange(s.alt,.5,800)&&
  Number.isInteger(s.stage)&&s.stage>=0&&s.stage<9&&['lock','manual'].includes(s.mode)&&numericRange(s.height,0,150)&&numericRange(s.yaw,0,360)&&numericRange(s.tilt,-90,90)&&
  numericRange(s.sensor,1,100)&&arr(s.lenses,3,v=>numericRange(v,8,200))&&arr(s.visible,3,v=>typeof v==='boolean')&&
  Number.isInteger(s.lens)&&s.lens>=0&&s.lens<3&&numericRange(s.opacity,.05,.4)&&typeof s.crowd==='boolean'&&['full','detail'].includes(s.zoom);}
function applyShot(s){
  const fitNeeded=s.zoom!==state.zoom||s.stage!==state.stage;
  Object.assign(state,{...s,p:[...s.p],lenses:[...s.lenses],visible:[...s.visible]});
  if(fitNeeded)fit();render();
}
function between(a,b,t){
  if(t===0)return a;
  const p=scene.mix(a.p,b.p,t),alt=a.alt+(b.alt-a.alt)*t;
  const yaw=wrap(a.yaw+(((b.yaw-a.yaw+540)%360)-180)*t),tilt=a.tilt+(b.tilt-a.tilt)*t;
  const lens=scene.mix(a.lenses,b.lenses,t).map(Math.round);
  if(a.mode==='lock'&&b.mode==='lock'){
    const target=scene.mix(venue.stages[a.stage].aim,venue.stages[b.stage].aim,t);
    const aimHeight=a.height+(b.height-a.height)*t;
    const [heading,angle]=scene.aim(p,alt,target,aimHeight,yaw);
    return {...a,p,alt,lenses:lens,mode:'manual',yaw:heading,tilt:angle,zoom:'full'};
  }
  return {...a,p,alt,lenses:lens,mode:'manual',yaw,tilt,zoom:'full'};
}
$('export').addEventListener('click',async()=>{
  stop();const button=$('export'),status=$('status');button.disabled=true;status.textContent='Preparing PNG…';
  const snapshot={stage:selected().name,lens:state.lenses[state.lens],stats:$('cameraRead').textContent};
  const png=document.createElement('canvas');png.width=1920;png.height=1080;const ctx=png.getContext('2d');
  ctx.fillStyle='#101820';ctx.fillRect(0,0,1920,1080);
  ctx.drawImage(finder,1200,226,654,367.9);
  const xml='<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="702" viewBox="'+map.getAttribute('viewBox')+'">'+map.innerHTML+'</svg>';
  const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));
  try{
    const im=new Image();im.src=url;await im.decode();
    ctx.drawImage(im,66,226,1120,702);ctx.font='19px system-ui';ctx.fillStyle='#4ccdeb';ctx.fillText('LIVE PRODUCTION / AERIAL CAMERA PLANNING',66,68);
    ctx.font='44px system-ui';ctx.fillStyle='#e0edf2';ctx.fillText('EDC 2026 / SPEEDWAY DRONE PLOT',66,127);
    ctx.font='21px system-ui';ctx.fillText(snapshot.stage+' · '+snapshot.lens+' mm · '+snapshot.stats,66,172);
    ctx.font='17px system-ui';ctx.fillStyle='#9eb3bf';ctx.fillText('DESIGN STUDY 02 / ILLUSTRATIVE SCENE / FRAMING SIMULATION',66,1024);
    const blob=await new Promise(r=>png.toBlob(r,'image/png'));if(!blob)throw Error('PNG encoder');
    const out=URL.createObjectURL(blob),a=document.createElement('a');a.href=out;a.download='EDC_2026_Drone_1920x1080.png';a.click();
    setTimeout(()=>URL.revokeObjectURL(out),10000);status.textContent='1920 × 1080 PNG exported.';
  }catch{status.textContent='PNG export failed.';}finally{URL.revokeObjectURL(url);button.disabled=false;}
});
render();
show=mountShow({key:'edc-drone-show-v1',read:()=>({...state,p:[...state.p],lenses:[...state.lenses],visible:[...state.visible]}),apply:applyShot,validate:valid,interpolate:between,seconds:5});
