'use strict';

const $ = id => document.getElementById(id);
const defaults = {rail:0, height:DEFAULT_HEIGHT, pan:0, tilt:8, focal:20, aimLock:false, lightsLinked:false, tempA:3850, tempB:5600, levelA:50, levelB:42, back:22, backColor:'#7787ff'};
const state = {...defaults};
const groups = {
  cameraControls:[
    ['rail','Rail position',-23,23,.25,'in'],
    ['height','Lens height',30,70,.5,'in'],
    ['pan','Pan',-170,170,.5,'°'],
    ['tilt','Tilt',-30,90,.5,'°'],
    ['focal','Zoom',16,35,.1,'mm']
  ],
  controlsA:[['tempA','Temp',2700,7500,50,'K'],['levelA','Dimmer',0,100,1,'%']],
  controlsB:[['tempB','Temp',2700,7500,50,'K'],['levelB','Dimmer',0,100,1,'%']],
  controlsBack:[['back','Dimmer',0,100,1,'%']]
};
const settings = Object.fromEntries(Object.values(groups).flat().map(row=>[row[0],row]));
const inputs = {};
const pairedLight = {tempA:"tempB",tempB:"tempA",levelA:"levelB",levelB:"levelA"};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const radians=Math.PI/180;
const fov=(sensor,focal)=>2*Math.atan(sensor/(2*focal))/radians;
const sign=(value,places=1)=>(value>0?'+':'')+value.toFixed(places);
let show;
for (const [section, rows] of Object.entries(groups)) {
  for (const [key,name,min,max,step,unit] of rows) {
    const row=document.createElement('div');
    row.className='control';
    row.innerHTML='<label for="'+key+'">'+name+'</label><input id="'+key+'" type="range"><input type="number"><span class="unit">'+unit+'</span>';
    const [range,number]=row.querySelectorAll('input');
    for(const input of [range,number]) Object.assign(input,{min,max,step,value:defaults[key]});
    number.setAttribute('aria-label',name+' numeric value, '+unit);
    inputs[key]=[range,number];
    range.addEventListener('input',()=>change(key,range.valueAsNumber));
    number.addEventListener('change',()=>Number.isFinite(number.valueAsNumber)?change(key,number.valueAsNumber):paint());
    $(section).append(row);
  }
}

function change(key,value) {
  if(state.aimLock && (key==='pan'||key==='tilt'))return;
  show?.stop();
  const [, , min,max,step]=settings[key];
  state[key]=Math.round(clamp(value,min,max)/step)*step;
  state[key]=Number(state[key].toFixed(2));
  if(state.lightsLinked&&pairedLight[key])state[pairedLight[key]]=state[key];
  paint();
}

let feed;
try { feed=createFinder($('feed'),()=>paint()); }
catch (error) {
  console.warn('Perspective preview unavailable',error);
  const original=$('feed'),replacement=original.cloneNode(false);
  original.replaceWith(replacement);
  const originalContext=replacement.getContext.bind(replacement);
  replacement.getContext=(type,...args)=>type==='webgl'?null:originalContext(type,...args);
  feed=createFinder(replacement,()=>paint());
}
function paint() {
  if(state.aimLock) Object.assign(state,trackAngles(state.rail,state.height));
  if(state.lightsLinked){
    state.tempB=state.tempA;
    state.levelB=state.levelA;
  }
  $('lightLink').setAttribute('aria-pressed',String(state.lightsLinked));
  $('lightLinkStatus').textContent=state.lightsLinked?'Both bars move together':'Bars adjust independently';
  $('aimLock').setAttribute('aria-pressed',String(state.aimLock));
  $('aimStatus').textContent=state.aimLock?'Tracking DJ · zoom stays manual':'Manual pan and tilt';
  for(const key of ['pan','tilt']) {
    for(const field of inputs[key])field.disabled=state.aimLock;
  }
  for(const button of $('dpad').querySelectorAll('[data-axis=pan],[data-axis=tilt]'))button.disabled=state.aimLock;
  paintBackdrop();
  for(const [key, fields] of Object.entries(inputs)) {
    for(const field of fields) field.value=Number(state[key].toFixed(2));
  }
  $('backColor').value=state.backColor;
  const h=fov(36,state.focal), v=fov(20.25,state.focal);
  $('mFocal').textContent=state.focal.toFixed(1)+' mm';
  $('mFov').textContent=h.toFixed(1)+'° × '+v.toFixed(1)+'°';
  $('mAngles').textContent=sign(state.pan)+'° / '+sign(state.tilt)+'°';
  $('mRail').textContent=sign(state.rail,2)+' in';
  $('mHeight').textContent=state.height.toFixed(1)+' in';
  const x=300+state.rail*35/12;
  $('marker').setAttribute('transform','translate('+x+' 214) rotate('+state.pan+')');
  const [l,r]=[state.pan-h/2,state.pan+h/2].map(angle=>[
    x+Math.sin(angle*radians)*860,214-Math.cos(angle*radians)*860
  ]);
  $('cone').setAttribute('d','M'+x+' 214 L'+l.join(' ')+' L'+r.join(' ')+' Z');
  for(const [key,id,kelvin,level] of [['chipA','barA',state.tempA,state.levelA],['chipB','barB',state.tempB,state.levelB]]) {
    const color='rgb('+whitePoint(kelvin).map(c=>Math.round(c*255)).join(',')+')';
    $(key).style.background=color;$(id).setAttribute('stroke',color);$(id).setAttribute('opacity',.18+.82*level/100);
  }
  $('chipBack').style.background=state.backColor;
  feed?.(state);
}
$('aimLock').onclick=()=>{
  show?.stop();
  state.aimLock=!state.aimLock;
  paint();
};
const backdrop=createBackdrop($('backdrop'));
let hasBackdrop=false;
let pendingBackdrop;
const blend=(low,high,x)=>{
  const t=clamp((x-low)/(high-low),0,1);
  return t*t*(3-2*t);
};
function paintBackdrop(){
  const img=$('backdrop'),wash=$('backdropWash'),dimmer=state.back/100;
  const white=blend(.64,1,dimmer);
  backdrop.paint(state);
  img.style.filter='brightness('+dimmer*4.5+')';
  $('backdropTint').style.background=state.backColor;
  $('backdropTint').style.opacity=String(hasBackdrop?dimmer*.22:0);
  wash.style.background='rgba(255,255,255,'+white+')';
}
function useBlack(){
  pendingBackdrop=undefined;
  backdrop.setImage(null);
  hasBackdrop=false;
  $('backdropFile').value='';
  $('backdropReset').disabled=true;
  $('backdropStatus').textContent='Infinity black · PNG stays in this tab';
  paint();
}
$('backdropReset').onclick=useBlack;
$('backdropFile').onchange=async e=>{
  const file=e.target.files[0];
  if(!file)return;
  pendingBackdrop=file;
  const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
  if(pendingBackdrop!==file)return;
  if(signature.join()!=='137,80,78,71,13,10,26,10'){
    $('backdropStatus').textContent='Choose a valid PNG image.';
    e.target.value='';
    return;
  }
  const url=URL.createObjectURL(file);
  const sample=new Image();
  sample.src=url;
  try {
    await sample.decode();
    if(pendingBackdrop!==file)return;
    backdrop.setImage(sample);
  }catch{
    if(pendingBackdrop===file)$('backdropStatus').textContent='Could not open that PNG.';
    return;
  }finally{
    URL.revokeObjectURL(url);
  }
  hasBackdrop=true;
  $('backdropReset').disabled=false;
  $('backdropStatus').textContent=file.name+' · this tab only';
  paint();
};
$('backColor').oninput=e=>{show?.stop();state.backColor=e.target.value;paint();};
$('home').onclick=()=>{show?.stop();for(const key of ['rail','height','pan','tilt','focal'])state[key]=defaults[key];paint();};
$('lightLink').onclick=()=>{
  show?.stop();
  state.lightsLinked=!state.lightsLinked;
  paint();
};
$('lightsHome').onclick=()=>{show?.stop();for(const key of ['tempA','tempB','levelA','levelB','back','backColor'])state[key]=defaults[key];paint();};
$('dpad').onclick=e=>{
  const {axis,step}=e.target.dataset;
  if(axis)change(axis,state[axis]+Number(step)*(e.shiftKey?5:1));
};
const keys = {ArrowLeft:['pan',-1],ArrowRight:['pan',1],ArrowUp:['tilt',1],ArrowDown:['tilt',-1],'+':['focal',1],'=':['focal',1],'-':['focal',-1],a:['rail',-.5],d:['rail',.5]};
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable=true]')) return;
  const binding=keys[e.key]??keys[e.key.toLowerCase()];
  if(!binding)return;
  const [axis,delta]=binding;
  e.preventDefault();change(axis,state[axis]+delta*(e.shiftKey?5:1));
});
function moveRail(e) {
  const svg=$('map');
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  change('rail',(p.x-300)*12/35);
}
$('railDrag').onpointerdown=e=>{$('railDrag').setPointerCapture(e.pointerId);moveRail(e);};
$('railDrag').onpointermove=e=>{if($('railDrag').hasPointerCapture(e.pointerId))moveRail(e);};

show=mountShow({
  key:'kinetic-booth-foh-v1',
  read:()=>({...state}),
  apply:shot=>{Object.assign(state,{height:DEFAULT_HEIGHT},shot,{aimLock:shot.aimLock===true,lightsLinked:shot.lightsLinked===true});paint();},
  validate:shot=>shot&&typeof shot.backColor==='string'&&/^#[\da-f]{6}$/i.test(shot.backColor)&&
    ['aimLock','lightsLinked'].every(key=>shot[key]===undefined||typeof shot[key]==='boolean')&&
    Object.entries(settings).every(([key,[,,min,max]])=>
      (key==='height'&&shot[key]===undefined)||(Number.isFinite(shot[key])&&shot[key]>=min&&shot[key]<=max)),
  interpolate:(a,b,t)=>Object.fromEntries(Object.keys(defaults).map(key=>[key,
    (key==='aimLock'||key==='lightsLinked')?a[key]===true&&b[key]===true:key==='backColor'?'#'+rgb(a[key]).map((c,i)=>Math.round((c+(rgb(b[key])[i]-c)*t)*255).toString(16).padStart(2,'0')).join(''):
      (a[key]??defaults[key])+((b[key]??defaults[key])-(a[key]??defaults[key]))*t]))
});
paint();
