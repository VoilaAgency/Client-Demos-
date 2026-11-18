'use strict';

const $=id=>document.getElementById(id);
const g=stageGeometry;
const cameraDefaults={
  slider:{rail:0,height:39,pan:0,tilt:8,focal:20,lock:false},
  reverse:{height:64,pan:0,tilt:-7,focal:16,lock:false},
  handheld:{x:-9.5,z:-.95,height:62,pan:60,tilt:0,focal:24,lock:false}
};
const cameraLabels={slider:'Front slider / FR7',reverse:'Reverse / FR7',handheld:'Handheld / Steady op'};
const defaults={
  camera:'slider',view:'survey',cameras:cameraDefaults,
  wall:true,panelSize:8,wallHeight:9,gap:8,wallBase:.6,wallLevel:74,
  lightsLinked:false,sidefillsLinked:false,tempA:3850,tempB:5600,levelA:50,levelB:42,
  tempL:4600,tempR:5600,levelL:27,levelR:22,tempBack:5600,back:0,backColor:'#7787ff'
};
const state=structuredClone(defaults);
const cameraFields={
  rail:['Rail position',-23,23,.25,'in'],height:['Lens height',24,108,.5,'in'],
  x:['Cross-stage',-10.2,10.2,.1,'ft'],z:['Depth',-g.deskDepth-.35,g.floorDepth-.25,.1,'ft'],
  pan:['Pan',-180,180,.5,'°'],tilt:['Tilt',-80,80,.5,'°'],focal:['Focal length',16,35,.1,'mm']
};
const wallFields={gap:['Center gap',2,24,.5,'in'],wallBase:['Wall bottom',0,5,.1,'ft'],wallLevel:['Display level',0,100,1,'%']};
const lightFields={};
const lightPairs=[
  {button:'lightLink',lock:'lightsLinked',left:'A',right:'B'},
  {button:'sidefillLink',lock:'sidefillsLinked',left:'L',right:'R'}
];
const stageControls=new Map();
let show,panels,background,frame,drag,scene;
const modeButtons=(section,key,value)=>{
  for(const button of $(section).querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset[key]===value));
};
function control(id, spec, onChange, registry=stageControls) {
  const [name,min,max,step,unit]=spec;
  const row=document.createElement('div');
  row.className='control';
  row.innerHTML='<label></label><input type="range"><input type="number"><span class="unit"></span>';
  const label=row.querySelector('label');
  const [range,number]=row.querySelectorAll('input');
  label.htmlFor=range.id=id;
  label.textContent=name;
  row.lastElementChild.textContent=unit;
  for(const input of [range,number])Object.assign(input,{min,max,step});
  number.setAttribute('aria-label',name+' numeric value, '+unit);
  range.oninput=()=>onChange(range.valueAsNumber);
  number.onchange=()=>Number.isFinite(number.valueAsNumber)?onChange(number.valueAsNumber):refreshControls();
  registry.set(id,[range,number]);
  return row;
}
function numeric(value,spec){
  const [,min,max,step]=spec;
  return Number(limit(Math.round(value/step)*step,min,max).toFixed(2));
}
function setStageValue(key,value,spec) {
  show?.stop();
  state[key]=numeric(value,spec);
  for(const {lock,left,right} of lightPairs){
    const side=key.at(-1);
    if(state[lock]&&(side===left||side===right))state[key.slice(0,-1)+(side===left?right:left)]=state[key];
  }
  refresh();
}
function setCameraValue(key,value) {
  const camera=state.cameras[state.camera];
  if(!(key in camera)||camera.lock&&(key==='pan'||key==='tilt'))return;
  show?.stop();
  const spec=state.camera==='handheld'&&key==='focal'?['Focal length',16,70,.1,'mm']:cameraFields[key];
  camera[key]=numeric(value,spec);
  if(state.camera==='handheld'&&(key==='x'||key==='z'))keepHandheldClear(camera,key);
  refresh();
}
function keepHandheldClear(camera,axis) {
  const x=Math.abs(camera.x),z=camera.z;
  const side=Math.sign(camera.x)||1;
  if(x<9.3&&z>-g.deskDepth-.25&&z<g.deskDepth+.28){
    if(axis==='x')camera.x=9.3*side;
    else camera.z=z<0?-g.deskDepth-.3:g.deskDepth+.3;
  }
  const clearanceX=g.monitorDepth/2+.30,clearanceZ=g.monitorWidth/2+.26;
  if(Math.abs(x-g.monitorX)<clearanceX&&Math.abs(z-g.monitorZ)<clearanceZ){
    if(axis==='x')camera.x=(g.monitorX+Math.sign(x-g.monitorX||1)*clearanceX)*side;
    else camera.z=g.monitorZ+Math.sign(z-g.monitorZ||1)*clearanceZ;
  }
  if(state.wall&&Math.abs(camera.x)<state.panelSize+.32&&Math.abs(camera.z-g.wallZ)<.33)camera.z=g.wallZ+Math.sign(camera.z-g.wallZ||1)*.35;
}
const cameraControls=new Map();
function setupCameraFields() {
  const rows=[];
  cameraControls.clear();
  for(const [key,spec] of Object.entries(cameraFields)){
    if(!(key in state.cameras[state.camera]))continue;
    const config=key==='focal'&&state.camera==='handheld'?['Focal length',16,70,.1,'mm']:spec;
    const row=control('cam-'+key,config,value=>setCameraValue(key,value),cameraControls);
    if(key==='focal'){
      const range=cameraControls.get('cam-focal')[0];
      range.addEventListener('wheel',event=>{
        if(document.activeElement!==range||!event.deltaY||event.ctrlKey||event.metaKey)return;
        event.preventDefault();
        setCameraValue('focal',state.cameras[state.camera].focal-Math.sign(event.deltaY)*(event.shiftKey?.1:1));
      },{passive:false});
      $('focalControls').replaceChildren(row);
    }else rows.push(row);
  }
  $('cameraControls').replaceChildren(...rows);
}
for(const [key,spec] of Object.entries(wallFields))$('wallControls').append(control(key,spec,v=>setStageValue(key,v,spec)));
for(const [key,name] of [['A','Front bar / frame left'],['B','Front bar / frame right'],['L','Sidefill / frame left'],['R','Sidefill / frame right'],['Back','Backlight']]){
  const fieldset=document.createElement('fieldset');
  const legend=document.createElement('legend');
  const chip=document.createElement('i');
  chip.id='chip'+key;
  legend.append(chip,name);
  const sliders=document.createElement('div');
  sliders.className='sliders';
  const temp='temp'+key, level=key==='Back'?'back':'level'+key;
  for(const [id,spec] of [[temp,['Temp',2700,7500,50,'K']],[level,['Dimmer',0,100,1,'%']]]){
    lightFields[id]=spec;
    sliders.append(control(id,spec,v=>setStageValue(id,v,spec)));
  }
  fieldset.append(legend,sliders);
  if(key==='Back'){
    const label=document.createElement('label');
    label.className='color-row';
    label.innerHTML='Color <input id="backColor" type="color">';
    fieldset.append(label);
  }
  $('lights').append(fieldset);
}
const meters=[
  ['FOCAL LENGTH','focal'],['H × V FIELD OF VIEW','fov'],['PAN / TILT','angles'],['POSITION','position'],['LENS HEIGHT / FLOOR','height']
];
$('meters').innerHTML=meters.map(([label,id])=>'<div><span>'+label+'</span><strong id="meter-'+id+'"></strong></div>').join('');
const surveyCamera={position:[13,13.8,-26],...aimAt([13,13.8,-26],[0,4.5,5.8]),focal:31};
function trackingTarget(name){
  return name==='reverse'?[0,3.5,-19]:[0,5.1,g.djZ];
}
function track(name,camera){
  const angles=aimAt(cameraPosition(name,camera),trackingTarget(name));
  camera.pan=((angles.pan+(name==='reverse'?0:180)+360)%360)-180;
  camera.tilt=angles.tilt;
}
function refreshControls(){
  const name=state.camera,camera=state.cameras[name];
  if(camera.lock)track(name,camera);
  for(const [id,fields] of cameraControls){
    const key=id.slice(4);
    for(const field of fields){
      field.value=Number(camera[key].toFixed(2));
      field.disabled=camera.lock&&(key==='pan'||key==='tilt');
    }
  }
  for(const [key,fields] of stageControls)for(const field of fields)field.value=state[key];
  for(const button of $('dpad').querySelectorAll('button:not([data-axis=focal])'))button.disabled=camera.lock;
  $('cameraInfo').textContent=(name==='handheld'?'FULL FRAME':'FR7 / FULL FRAME')+' / 16:9';
  $('controlsTitle').textContent=cameraLabels[name];
  $('aimLock').setAttribute('aria-pressed',String(camera.lock));
  $('aimStatus').textContent=camera.lock?(name==='reverse'?'Tracking crowd center':'Tracking DJ'):'Manual pan and tilt';
  for(const {button,lock} of lightPairs)$(button).setAttribute('aria-pressed',String(state[lock]));
  $('panelSize').value=state.panelSize;
  $('wallHeight').value=state.wallHeight;
  $('wallMeters').textContent=state.wall?(state.panelSize*2)+' × '+state.wallHeight+' FT':'WALL OFF';
  $('backColor').value=state.backColor;
  for(const key of ['A','B','L','R','Back']){
    const val=key==='Back'?rgbHex(state.backColor):whitePoint(state['temp'+key]);
    $('chip'+key).style.background='rgb('+val.map(c=>Math.round(c*255)).join(',')+')';
  }
  modeButtons('cameras','camera',name);
  modeButtons('views','view',state.view);
  modeButtons('wallModes','wall',state.wall?'on':'off');
  const fov=sensor=>(2*Math.atan(sensor/(2*camera.focal))/rad).toFixed(1)+'°';
  $('meter-focal').textContent=camera.focal.toFixed(1)+' mm';
  $('meter-fov').textContent=fov(36)+' × '+fov(20.25);
  $('meter-angles').textContent=camera.pan.toFixed(1)+'° / '+camera.tilt.toFixed(1)+'°';
  $('meter-position').textContent=name==='slider'?camera.rail.toFixed(1)+' in':name==='reverse'?'Center gap':camera.x.toFixed(1)+' / '+camera.z.toFixed(1)+' ft';
  $('meter-height').textContent=camera.height.toFixed(1)+' in';
  const plan=state.view==='plan';
  $('plot').toggleAttribute('hidden',!plan);
  $('plotHelp').hidden=!plan;
  $('survey').parentNode.hidden=plan;
}
const plotScale=22,plotCenterX=350,plotFrontY=312;
const plotX=x=>plotCenterX+x*plotScale;
const plotY=z=>plotFrontY-z*plotScale;
function refreshPlot(){
  const rect=(x,z,w,d,fill,stroke)=>'<rect x="'+plotX(x-w/2)+'" y="'+plotY(z+d/2)+'" width="'+w*plotScale+'" height="'+d*plotScale+'" rx="2" fill="'+fill+'" stroke="'+stroke+'"/>';
  const caption=(x,y,label)=>'<text x="'+plotX(x)+'" y="'+plotY(y)+'" text-anchor="middle">'+label+'</text>';
  const gap=state.gap/12, panelWidth=wallTileWidth(state);
  const active=state.cameras[state.camera];
  const [x,,z]=cameraPosition(state.camera,active);
  const angle=cameraHeading(state.camera,active);
  const span=Math.atan(18/active.focal)/rad;
  const ray=heading=>[plotX(x+Math.sin(heading*rad)*23),plotY(z+Math.cos(heading*rad)*23)].join(' ');
  const cone='M'+plotX(x)+' '+plotY(z)+' L'+ray(angle-span)+' L'+ray(angle+span)+' Z';
  const dots=Object.entries(state.cameras).map(([name,camera])=>{
    const [x,,z]=cameraPosition(name,camera);
    const label={slider:'SLIDER',reverse:'REVERSE',handheld:'HANDHELD'}[name];
    const color={slider:'#c4b9ff',reverse:'#80e4e9',handheld:'#ffc38f'}[name];
    const y=plotY(z),px=plotX(x);
    return '<g '+(name==='reverse'?'':'data-drag="'+name+'"')+' aria-label="'+label+'"><circle cx="'+px+'" cy="'+y+'" r="17" fill="transparent"/><circle cx="'+px+'" cy="'+y+'" r="'+(name===state.camera?8:6)+'" fill="'+color+'" stroke="#101620" stroke-width="2"/><text x="'+px+'" y="'+(y+(name==='reverse'?-12:23))+'" text-anchor="middle">'+label+'</text></g>';
  }).join('');
  $('plot').innerHTML='<defs><pattern id="gridPlot" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#233041"/></pattern></defs>'+
    '<rect width="700" height="440" fill="url(#gridPlot)"/>'+
    rect(0,g.floorDepth/2,g.deskWidth,g.floorDepth,'#141e2a','#33485e')+
    '<path d="'+cone+'" fill="#ae9aff26" stroke="#ae9aff85"/>'+
    rect(0,g.deskDepth/2,g.deskWidth,g.deskDepth,'#233343','#708397')+caption(0,2.0,'DJ EQUIPMENT TABLE / 18 × 4 FT')+
    rect(0,-g.deskDepth/2,g.deskWidth,g.deskDepth,'#29364a','#9daee0')+caption(0,-1.55,'NEW RAIL TABLE / 18 × 4 FT / −15 IN')+
    rect(0,g.sliderZ,4.58,.15,'#aa9cca','#a98dff')+
    rect(-g.monitorX,g.monitorZ,g.monitorDepth,g.monitorWidth,'#263843','#658780')+
    rect(g.monitorX,g.monitorZ,g.monitorDepth,g.monitorWidth,'#263843','#658780')+
    caption(0,6.95,'DJ + CREW / 10 FT DEPTH')+
    (state.wall?[-1,1].map(side=>rect(side*(panelWidth+gap)/2,g.wallZ,panelWidth,.22,'#695ca9','#c1abff')).join(''):'')+
    '<circle cx="'+plotX(0)+'" cy="'+plotY(g.djZ)+'" r="9" fill="#a3b2c2"/>'+caption(0,5.35,'DJ')+
    dots+caption(0,-5.45,'AUDIENCE')+
    '<text x="19" y="23">GRID / 1 FT</text>';
}
function renderer(id) {
  const canvas=$(id);
  try{return createStageRenderer(canvas);}
  catch {
    const replacement=canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    return createSoftwareRenderer(replacement);
  }
}
const feed=renderer('feed'),survey=renderer('survey');
feed.photo.onload=survey.photo.onload=()=>queueFrame();
const crowdMesh=stageMeshes(state).crowd;
function queueFrame(){if(!frame)frame=requestAnimationFrame(paint);}
function paint(){
  frame=0;
  const name=state.camera,camera=state.cameras[name];
  const args={media:panels?.element,background:background?.element};
  const meshes=scene??(scene=stageMeshes(state,crowdMesh));
  feed?.render(state,meshes,{position:cameraPosition(name,camera),pan:cameraHeading(name,camera),tilt:camera.tilt,focal:camera.focal},{...args,reverse:name==='reverse',rail:name==='slider'});
  if(state.view==='survey')survey?.render(state,meshes,surveyCamera,{...args,survey:true});
  if(state.wall&&panels?.element instanceof HTMLVideoElement&&!panels.element.paused)queueFrame();
}
function refresh(){
  refreshControls();
  refreshPlot();
  scene=null;
  queueFrame();
}
function chooseCamera(name){
  if(name===state.camera)return;
  state.camera=name;
  setupCameraFields();
  refresh();
}
$('cameras').onclick=e=>{if(e.target.dataset.camera){show?.stop();chooseCamera(e.target.dataset.camera);}};
$('views').onclick=e=>{if(e.target.dataset.view){state.view=e.target.dataset.view;refresh();}};
$('wallModes').onclick=e=>{
  if(!e.target.dataset.wall)return;
  show?.stop();
  state.wall=e.target.dataset.wall==='on';
  if(panels?.element instanceof HTMLVideoElement){
    if(state.wall)panels.element.play().catch(()=>{});
    else panels.element.pause();
  }
  refresh();
};
for(const key of ['panelSize','wallHeight'])$(key).onchange=e=>{show?.stop();state[key]=Number(e.target.value);refresh();};
$('aimLock').onclick=()=>{show?.stop();const camera=state.cameras[state.camera];camera.lock=!camera.lock;refresh();};
$('home').onclick=()=>{show?.stop();state.cameras[state.camera]={...cameraDefaults[state.camera]};refresh();};
for(const {button,lock,left,right} of lightPairs)$(button).onclick=()=>{
  show?.stop();
  state[lock]=!state[lock];
  if(state[lock])for(const key of ['temp','level'])state[key+right]=state[key+left];
  refresh();
};
$('lightsHome').onclick=()=>{
  show?.stop();
  for(const key of [...Object.keys(lightFields),'backColor','lightsLinked','sidefillsLinked'])state[key]=defaults[key];
  refresh();
};
$('backColor').oninput=e=>{show?.stop();state.backColor=e.target.value;refresh();};
function nudge(axis,delta){
  const camera=state.cameras[state.camera];
  if(axis==='travel')axis=state.camera==='handheld'?'x':'rail';
  if(!(axis in camera))return;
  setCameraValue(axis,camera[axis]+delta);
}
$('dpad').onclick=e=>{
  const {axis,step}=e.target.dataset;
  if(axis)nudge(axis,Number(step)*(e.shiftKey?5:1));
};
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable=true]'))return;
  const keys={ArrowLeft:['pan',-1],ArrowRight:['pan',1],ArrowUp:['tilt',1],ArrowDown:['tilt',-1],'+':['focal',1],'=':['focal',1],'-':['focal',-1],a:['travel',-.5],d:['travel',.5]};
  const binding=keys[e.key]??keys[e.key.toLowerCase()];
  if(!binding)return;
  e.preventDefault();
  nudge(binding[0],binding[1]*(e.shiftKey?5:1));
});
function moveOnPlot(e){
  const svg=$('plot');
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  if(drag.name==='slider')setCameraValue('rail',(p.x-plotCenterX)*12/plotScale);
  else {
    const camera=state.cameras.handheld;
    camera.x=numeric((p.x-plotCenterX)/plotScale,cameraFields.x);
    camera.z=numeric((plotFrontY-p.y)/plotScale,cameraFields.z);
    keepHandheldClear(camera,'z');
    refresh();
  }
}
$('plot').onpointerdown=e=>{
  const marker=e.target.closest('[data-drag]');
  if(!marker)return;
  show?.stop();
  drag={name:marker.dataset.drag,id:e.pointerId};
  $('plot').setPointerCapture(e.pointerId);
  chooseCamera(drag.name);
  moveOnPlot(e);
};
$('plot').onpointermove=e=>{if(drag?.id===e.pointerId)moveOnPlot(e);};
$('plot').onlostpointercapture=()=>{drag=null;};
function fileInput({prefix,panel,current,set}){
  const input=$(prefix+'File'),reset=$(prefix+'Reset'),status=$(prefix+'Status');
  const idle=()=>panel?'One canvas across all six panels. Media stays in this tab.':'Infinity black · PNG stays in this tab';
  let sequence=0,worker;
  function discard(item){
    if(!item)return;
    if(item.element instanceof HTMLVideoElement){
      item.element.pause();
      item.element.removeAttribute('src');
      item.element.load();
    }
    URL.revokeObjectURL(item.url);
  }
  function convert(file){
    return new Promise((resolve,reject)=>{
      worker=new Worker('media/convert.js');
      worker.onmessage=({data})=>{
        worker?.terminate();
        worker=null;
        if(data.error)reject(Error(data.error));
        else resolve(new Blob([data.bytes],{type:'video/mp4'}));
      };
      worker.onerror=()=>{
        worker?.terminate();
        worker=null;
        reject(Error('MPEG conversion is unavailable in this browser.'));
      };
      worker.postMessage(file);
    });
  }
  async function openVideo(url){
    const element=document.createElement('video');
    Object.assign(element,{muted:true,loop:true,playsInline:true,preload:'auto'});
    await new Promise((resolve,reject)=>{
      element.onloadeddata=resolve;
      element.onerror=()=>reject(Error('This video could not be played.'));
      element.src=url;
    });
    return element;
  }
  reset.onclick=()=>{
    sequence++;
    worker?.terminate();worker=null;
    discard(current());
    set(undefined);
    input.value='';
    reset.disabled=true;
    status.textContent=idle();
    queueFrame();
  };
  input.onchange=async()=>{
    const file=input.files[0];
    if(!file)return;
    worker?.terminate();worker=null;
    const request=++sequence;
    const png=/\.png$/i.test(file.name)||file.type==='image/png';
    const mpeg=/\.mpe?g$/i.test(file.name)||file.type==='video/mpeg';
    let url,element;
    reset.disabled=false;
    status.textContent='Opening '+file.name+'…';
    try{
      if(!panel&&!png)throw Error('Choose a PNG for the backdrop.');
      url=URL.createObjectURL(file);
      if(png){
        element=new Image();
        element.src=url;
        await element.decode();
      }else{
        try{element=await openVideo(url);}
        catch(error){
          if(!mpeg||request!==sequence)throw error;
          status.textContent='Converting MPEG in this tab…';
          const converted=await convert(file);
          if(request!==sequence)return;
          URL.revokeObjectURL(url);
          url=URL.createObjectURL(converted);
          element=await openVideo(url);
        }
      }
      if(request!==sequence)return;
      discard(current());
      set({url,element});
      url=undefined;
      if(panel&&state.wall&&element instanceof HTMLVideoElement){
        try{await element.play();}
        catch{if(request===sequence)status.textContent='Video loaded. Select 2027 / Panels to start playback.';return;}
      }
      if(request===sequence)status.textContent=file.name+' · this tab only';
    }catch(error){
      if(request===sequence){
        status.textContent=png?'Could not open that PNG.':error.message;
        input.value='';
        reset.disabled=!current();
      }
    }finally{
      if(url)URL.revokeObjectURL(url);
      queueFrame();
    }
  };
}
fileInput({prefix:'panel',panel:true,current:()=>panels,set:item=>{panels=item;}});
fileInput({prefix:'backdrop',panel:false,current:()=>background,set:item=>{
  background=item;
  if(item&&state.back===0){state.back=22;refresh();}
}});
function normalizedShot(shot) {
  if(shot.cameras)return {wallHeight:12,sidefillsLinked:false,...shot};
  return {...structuredClone(defaults),wall:false,
    ...Object.fromEntries(Object.keys(lightFields).concat('backColor','lightsLinked','sidefillsLinked').filter(k=>k in shot).map(k=>[k,shot[k]])),
    cameras:{...structuredClone(cameraDefaults),slider:{...cameraDefaults.slider,
      ...Object.fromEntries(['rail','height','pan','tilt','focal'].filter(k=>k in shot).map(k=>[k,shot[k]])),lock:shot.aimLock===true}}};
}
function valid(shot){
  if(!shot||typeof shot!=='object')return false;
  if(!shot.cameras&&!Number.isFinite(shot.focal))return false;
  const s=normalizedShot(shot);
  return Object.hasOwn(cameraDefaults,s.camera)&&['plan','survey'].includes(s.view)&&[6,8].includes(s.panelSize)&&[9,12].includes(s.wallHeight)&&
    typeof s.wall==='boolean'&&typeof s.lightsLinked==='boolean'&&typeof s.sidefillsLinked==='boolean'&&typeof s.backColor==='string'&&/^#[\da-f]{6}$/i.test(s.backColor)&&
    Object.entries({...wallFields,...lightFields}).every(([k,[,min,max]])=>Number.isFinite(s[k])&&s[k]>=min&&s[k]<=max)&&
    Object.entries(cameraDefaults).every(([name,c])=>{
      const a=s.cameras[name];
      return a&&typeof a.lock==='boolean'&&Object.keys(c).filter(k=>k!=='lock').every(k=>{
        const [,min,max]=cameraFields[k];
        return Number.isFinite(a[k])&&a[k]>=min&&a[k]<=(name==='handheld'&&k==='focal'?70:max);
      });
    });
}
function apply(shot){
  const s=normalizedShot(shot);
  const changed=state.camera!==s.camera;
  Object.assign(state,structuredClone(s));
  keepHandheldClear(state.cameras.handheld,'x');
  if(changed)setupCameraFields();
  if(panels?.element instanceof HTMLVideoElement){
    if(state.wall&&panels.element.paused)panels.element.play().catch(()=>{});
    else if(!state.wall)panels.element.pause();
  }
  refresh();
}
function blendShot(first,last,t) {
  const a=normalizedShot(first),b=normalizedShot(last);
  const mixed=structuredClone(a);
  const fade=(x,y)=>x+(y-x)*t;
  for(const k of Object.keys({...lightFields,...wallFields}))mixed[k]=fade(a[k],b[k]);
  for(const {lock} of lightPairs)mixed[lock]=a[lock]&&b[lock];
  mixed.backColor='#'+rgbHex(a.backColor).map((v,i)=>Math.round(255*fade(v,rgbHex(b.backColor)[i])).toString(16).padStart(2,'0')).join('');
  if(a.camera===b.camera){
    const camera=mixed.cameras[a.camera];
    for(const k of Object.keys(camera)){
      if(k==='lock')camera.lock=a.cameras[a.camera].lock&&b.cameras[a.camera].lock;
      else camera[k]=fade(camera[k],b.cameras[a.camera][k]);
    }
  }
  return mixed;
}
setupCameraFields();
show=mountShow({key:'kinetic-booth-foh-v1',read:()=>structuredClone(state),apply,validate:valid,interpolate:blendShot});
refresh();
