'use strict';

const stageGeometry = {
  deskHeight:38/12, deskWidth:18, deskDepth:4, railTableDrop:15/12,
  floorDepth:14, sliderZ:-3.55, djZ:4.63, wallZ:9.5,
  reverseZ:9.57, monitorX:5.65, monitorZ:8.35, monitorWidth:2.15, monitorDepth:1.60, sidefillHeight:5.49
};
const rad=Math.PI/180;
const rgbHex=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const limit=(v,min,max)=>Math.max(min,Math.min(max,v));
function whitePoint(kelvin) {
  const t=kelvin/100;
  return [
    t<=66?255:329.699*(t-60)**-.1332,
    t<=66?99.471*Math.log(t)-161.12:288.122*(t-60)**-.0755,
    t>=66?255:t<=19?0:138.518*Math.log(t-10)-305.045
  ].map(value=>limit(value,0,255)/255);
}
function aimAt(camera, target) {
  const [x,y,z]=target.map((value,i)=>value-camera[i]);
  return {pan:Math.atan2(x,z)/rad,tilt:Math.atan2(y,Math.hypot(x,z))/rad};
}
function cameraPosition(name,camera) {
  if(name==='slider')return [camera.rail/12,camera.height/12,stageGeometry.sliderZ];
  if(name==='reverse')return [0,camera.height/12,stageGeometry.reverseZ];
  return [camera.x,camera.height/12,camera.z];
}
function cameraHeading(name,camera){return camera.pan+(name==='reverse'?180:0);}

function wallTileWidth(state){return state.panelSize-state.gap/24;}

function sidefillWeight(x,y,z,side){
  const g=stageGeometry;
  const dx=x-side*(g.monitorX-.13),dy=y-g.sidefillHeight,dz=z-g.monitorZ;
  const length=Math.hypot(dx,dy,dz);
  const aim=Math.hypot(g.monitorX-.13,g.djZ-g.monitorZ);
  const alignment=(-side*(g.monitorX-.13)*dx+(g.djZ-g.monitorZ)*dz)/(Math.max(length,.01)*aim);
  const edge=limit((alignment-.92)/.065,0,1);
  return edge*edge*(3-2*edge)*1.15/(1+length*length*.019);
}

function stageMeshes(state,existingCrowd) {
  const main=[],survey=[],panels=[];
  const g=stageGeometry;
  const rgba=(hex,a=1)=>[...rgbHex(hex),a];
  function quad(list,a,b,c,d,color,kind=0,uv=[[0,1],[1,1],[1,0],[0,0]]) {
    for(const i of [0,1,2,0,2,3]) list.push(...[a,b,c,d][i],...color,...uv[i],kind);
  }
  function box(list,x,y,z,w,h,d,color,angle=0,kind=0) {
    const shade=f=>[...color.slice(0,3).map(c=>c*f),1];
    const cs=Math.cos(angle),sn=Math.sin(angle);
    const point=(a,b,c)=>[x+a*cs+c*sn,y+b,z+c*cs-a*sn];
    const [a,b,c,e,f,k,m,n]=[
      [-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],
      [-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]
    ].map(p=>point(...p));
    quad(list,f,k,m,n,shade(1.15),kind);
    quad(list,a,b,k,f,shade(.83),kind);
    quad(list,b,c,m,k,shade(.64),kind);
    quad(list,c,e,n,m,shade(.93),kind);
    quad(list,e,a,f,n,shade(.73),kind);
    quad(list,e,c,b,a,shade(.53),kind);
  }
  function disc(list,x,y,z,r,d,color,kind=1) {
    for(let i=0;i<32;i++){
      const p=k=>[x+Math.cos(k*Math.PI/16)*r,y,z+Math.sin(k*Math.PI/16)*d];
      for(const a of [[x,y,z],p(i),p(i+1)])list.push(...a,...color,0,0,kind);
    }
  }
  if(state.wall) {
    const width=wallTileWidth(state),panelHeight=state.wallHeight/3,gap=state.gap/12;
    for(let col=0;col<2;col++){
      const x=(col-.5)*(width+gap);
      const left=x-width/2,right=x+width/2,z=g.wallZ;
      const u0=col/2,u1=(col+1)/2;
      box(main,x,state.wallBase,z+.095,width,panelHeight*3,.17,rgba('#141e29'));
      for(let row=0;row<3;row++){
        const low=state.wallBase+row*panelHeight,high=low+panelHeight;
        const vTop=1-(row+1)/3,vBottom=1-row/3;
        quad(panels,[left,low,z],[right,low,z],[right,high,z],[left,high,z],
          rgba('#ffffff'),3,[[u0,vBottom],[u1,vBottom],[u1,vTop],[u0,vTop]]);
      }
    }
  }
  box(main,0,-.23,(g.floorDepth-g.deskDepth)/2,21,.23,g.floorDepth+g.deskDepth,rgba('#243040'),0,1);
  box(main,0,g.deskHeight-.19,2,g.deskWidth,.19,g.deskDepth,rgba('#222c37'),0,1);
  for(const x of [-8.55,-4.4,4.4,8.55])for(const z of [.28,3.72]){
    box(main,x,0,z,.2,g.deskHeight-.16,.2,rgba('#343f4a'),0,1);
  }
  box(main,0,g.deskHeight-.67,.16,17.7,.35,.08,rgba('#18222c'),0,1);
  const railTableY=g.deskHeight-g.railTableDrop;
  box(main,0,railTableY-.15,-g.deskDepth/2,g.deskWidth,.15,g.deskDepth,rgba('#2c3948'),0,1);
  for(const x of [-8.55,-4.4,4.4,8.55])for(const z of [-.18,-g.deskDepth+.18]){
    box(main,x,0,z,.17,railTableY-.15,.17,rgba('#343f4a'),0,1);
  }
  box(main,0,railTableY,g.sliderZ,4.58,.1,.24,rgba('#58677c'),0,1);
  const deckY=g.deskHeight;
  box(main,0,deckY-.098,.011,17.98,.055,.018,rgba('#64717b'),0,1);
  for(const side of [-1,1]){
    box(main,side*2.19,railTableY+.10,g.sliderZ,.19,.16,.30,rgba('#354353'),0,1);
  }
  const mixerZ=2.92;
  for(const x of [-4.99,-3.75,-2.51,-1.27,1.27,2.51,5.79,7.03]){
      const z=mixerZ;
      box(main,x,deckY,z,1.08,.16,1.49,rgba('#202b37'),0,1);
      disc(main,x-.12,deckY+.169,z-.20,.328,.328,rgba('#566472'));
      disc(main,x-.12,deckY+.173,z-.20,.274,.274,rgba('#101923'));
      disc(main,x-.12,deckY+.177,z-.20,.10,.10,rgba('#4a6274'));
      box(main,x+.17,deckY+.161,z+.43,.63,.018,.29,rgba('#446981'),0,1);
      box(main,x+.17,deckY+.18,z+.43,.52,.008,.18,rgba('#9fbad0'),0,1);
      for(let i=0;i<3;i++)box(main,x-.36+i*.13,deckY+.16,z-.56,.07,.022,.06,rgba(i===0?'#91cb9d':'#abb3a0'),0,1);
  }
  for(const center of [0,4.52]){
    box(main,center,deckY,mixerZ,1.34,.18,1.50,rgba('#283540'),0,1);
    for(let i=0;i<4;i++){
      const x=center+(i-1.5)*.24;
      for(let j=0;j<4;j++)disc(main,x,deckY+.23,2.87+j*.14,.045,.045,rgba(j===2?'#8fa2b1':'#485d6e'));
      box(main,x,deckY+.181,2.50,.018,.008,.34,rgba('#94a2ae'),0,1);
      box(main,x,deckY+.193,2.49+i*.026,.10,.04,.075,rgba('#708496'),0,1);
    }
  }
  for(const side of [-1,1]){
    const x=side*g.monitorX,z=g.monitorZ,angle=-side*Math.PI/2;
    for(const y of [0,2.55,4.01]){
      const height=y===0?2.48:1.40;
      box(main,x,y,z,g.monitorWidth,height,g.monitorDepth,rgba('#252f3b'),angle,1);
      box(main,x-side*(g.monitorDepth/2-.02),y+.06,z,g.monitorWidth-.26,height-.12,.12,rgba('#101820'),angle,1);
    }
    box(main,x,5.41,z,g.monitorWidth-.02,.16,.25,rgba('#465462'),angle,1);
    const key=side<0?'L':'R';
    const color=whitePoint(state['temp'+key]).map(c=>c*(.12+.88*state['level'+key]/100));
    box(main,x-side*.13,5.45,z,g.monitorWidth-.09,.085,.03,[...color,1],angle);
    const frontKey=side<0?'A':'B';
    const frontColor=whitePoint(state['temp'+frontKey]).map(c=>c*(.12+.88*state['level'+frontKey]/100));
    box(main,side*.96,railTableY,-.41,1.8,.09,.19,[...frontColor,1]);
  }
  for(const [name,camera] of Object.entries(state.cameras)) {
    const [x,y,z]=cameraPosition(name,camera);
    const colors={slider:'#c4b9ff',reverse:'#80e4e9',handheld:'#ffc38f'};
    const heading=cameraHeading(name,camera)*rad;
    if(name==='slider'){
      const railTop=railTableY+.10;
      box(survey,x,railTop,z,.56,.10,.27,rgba('#635a82'));
      const mountTop=railTop+.10;
      box(survey,x,mountTop,z,.21,Math.max(.06,y-.12-mountTop),.21,rgba('#58677c'));
    }
    box(survey,x,y-.12,z,.34,.31,.45,rgba(colors[name]),heading);
    box(survey,x+Math.sin(heading)*.26,y-.036,z+Math.cos(heading)*.26,.22,.17,.22,rgba('#d2dbe9'),heading);
    if(name==='handheld'){
      const baseX=x-Math.sin(heading)*.53,baseZ=z-Math.cos(heading)*.53;
      box(survey,baseX,3.15,baseZ,1.34,2.0,.69,rgba('#617186'),heading);
      box(survey,baseX,5.18,baseZ,.67,.72,.64,rgba('#aeb9c9'),heading);
      for(const side of [-1,1]){
        const dx=Math.cos(heading)*side*.34,dz=-Math.sin(heading)*side*.34;
        box(survey,baseX+dx,0,baseZ+dz,.48,3.24,.51,rgba('#39485d'),heading);
        box(survey,baseX+dx*2.1,3.82,baseZ+dz*2.1,.30,1.20,.33,rgba('#71849a'),heading);
      }
    }
  }
  const dj=[];
  quad(dj,[-1.65,2.48,g.djZ],[1.65,2.48,g.djZ],[1.65,6.18,g.djZ],[-1.65,6.18,g.djZ],rgba('#ffffff'),2);
  // The camera behind the DJ sees a connected 3D figure at the same center mark.
  const reverseDj=[];
  const denim=rgba('#20242b'),shirt=rgba('#292b37'),skin=rgba('#936d5c');
  const part=(x,y,z,w,h,d,color,angle=0)=>box(reverseDj,x,y,g.djZ+z,w,h,d,color,angle,1);
  for(const side of [-1,1]){
    part(side*.3,0,-.09,.49,.22,.94,rgba('#36414b'));
    part(side*.31,.18,0,.48,1.56,.49,denim);
    part(side*.31,1.68,.02,.53,1.13,.55,denim);
    part(side*.84,3.64,-.08,.43,1.12,.57,shirt,-side*.16);
    part(side*.88,3.21,-.16,.28,.57,.33,skin);
    part(side*.89,3.22,-.42,.29,.26,.64,skin);
    part(side*.44,5.43,.035,.17,.42,.41,rgba('#252831'));
  }
  part(0,2.71,.015,1.14,.59,.67,denim);
  part(0,3.1,.015,1.32,1.27,.70,shirt);
  part(0,4.31,.006,1.52,.63,.73,shirt);
  part(0,4.93,0,.38,.37,.39,skin);
  part(0,5.19,.016,.69,.81,.64,skin);
  part(0,5.58,.042,.73,.47,.69,rgba('#312d2d'));
  part(0,5.88,.064,.82,.16,.69,rgba('#22252a'));
  part(0,5.87,-.31,.69,.06,.38,rgba('#22252a'));

  const backdrop=[];
  quad(backdrop,[-40,-6,15],[40,-6,15],[40,36,15],[-40,36,15],rgba('#ffffff'),4);
  const crowd=existingCrowd??[];
  const field=reverseField;
  const ground=-6.8;
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const fieldPoint=([x,d],y)=>[x,y,g.djZ-d];
  function platform(footprint,height,color){
    const top=footprint.map(point=>fieldPoint(point,ground+height));
    for(let i=0;i<top.length;i++){
      const j=(i+1)%top.length;
      quad(crowd,fieldPoint(footprint[i],ground),fieldPoint(footprint[j],ground),top[j],top[i],rgba(i%2?'#283644':'#324352'));
    }
    for(let i=1;i<top.length-1;i++)quad(crowd,top[0],top[i],top[i+1],top[i+1],rgba(color));
  }
  function inside(x,y,polygon){
    let inPolygon=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [a,b]=polygon[i],[c,d]=polygon[j];
      if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inPolygon=!inPolygon;
    }
    return inPolygon;
  }
  function spectator(x,d,y,index){
    const z=g.djZ-d;
    const colors=['#293744','#38404d','#283040','#3c3346','#475364'];
    const height=5.1+(Math.sin(index*2.14)+1)*.52;
    box(crowd,x,y,z,1.24,height-.71,.72,rgba(colors[Math.abs(index)%colors.length]));
    box(crowd,x,y+height-.71,z,.65,.71,.62,rgba(index%3===0?'#8c7f83':'#54525d'));
  }
  if(!existingCrowd){
    for(const {footprint,height,equipmentStacks} of field.foh){
      platform(footprint,height,'#506574');
      const [x,d]=footprint.reduce(([x,d],[a,b])=>[x+a/footprint.length,d+b/footprint.length],[0,0]);
      for(let stack=0;stack<(equipmentStacks??0);stack++){
        const mid=x+(stack-(equipmentStacks-1)/2)*7;
        box(crowd,mid,ground+height,g.djZ-d-4,5,2.8,3,rgba('#536475'));
        box(crowd,mid,ground+height+2.8,g.djZ-d-4,3.6,1.7,2,rgba('#344354'));
      }
    }
    for(const {corners,heights} of field.vip){
      const [a,b,c,d]=corners;
      const cols=Math.max(3,Math.round(Math.hypot(a[0]-b[0],a[1]-b[1])/7));
      for(const [tier,height] of heights.entries()){
        const low=tier/heights.length,high=(tier+1)/heights.length;
        const left=mix(a,d,low),right=mix(b,c,low),farRight=mix(b,c,high),farLeft=mix(a,d,high);
        platform([left,right,farRight,farLeft],height,tier%2?'#526878':'#435668');
        for(let col=0;col<cols;col++){
          const [x,d]=mix(mix(left,farLeft,.43),mix(right,farRight,.43),(col+.5)/cols);
          spectator(x,d,ground+height,tier*71+col);
        }
      }
    }
    for(let row=0;row<42;row++){
      const distance=43+row*(row<10?3:7)-(row>=10?40:0);
      const step=row<12?3.1:7.7;
      const count=Math.ceil(Math.min(315,distance*.9)/step);
      for(let col=-count;col<=count;col++){
        const index=row*254+col;
        const x=(col+Math.sin(index*2.3)*.34)*step;
        const d=distance+Math.sin(index*3.2)*step*.35;
        if(!inside(x,d,field.audience)||field.foh.some(({footprint})=>inside(x,d,footprint))||
            field.vip.some(({corners})=>inside(x,d,corners)))continue;
        spectator(x,d,ground,index);
      }
    }
    box(crowd,0,ground-.2,-195,680,.2,335,rgba('#121f2d'));
  }
  return Object.fromEntries(Object.entries({main,survey,panels,dj,reverseDj,backdrop,crowd}).map(([key,data])=>[key,data instanceof Float32Array?data:new Float32Array(data)]));
}

function facePerformer(mesh,position) {
  const angle=limit(Math.atan2(position[0],gDjDistance(position[2]))*.33,-.12,.12);
  const adjusted=new Float32Array(mesh);
  for(let i=0;i<adjusted.length;i+=10){
    adjusted[i+2]+=Math.sin(angle)*mesh[i];
    adjusted[i]=Math.cos(angle)*mesh[i];
  }
  return adjusted;
}
function gDjDistance(cameraZ){return Math.max(1.25,stageGeometry.djZ-cameraZ);}

function createStageRenderer(canvas) {
  const gl=canvas.getContext('webgl',{antialias:true});
  if(!gl)throw Error('WebGL is required for the perspective view.');
  function shader(type,source) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`
    attribute vec3 point; attribute vec4 color; attribute vec2 uv; attribute float kind;
    uniform vec3 eye,right,up,forward; uniform vec2 scale;
    varying vec4 base; varying vec2 tex; varying float material; varying vec3 position;
    void main(){
      vec3 delta=point-eye; float d=dot(delta,forward);
      gl_Position=vec4(dot(delta,right)*scale.x,dot(delta,up)*scale.y,1.00005*d-.11,d);
      base=color; tex=uv; material=kind; position=point;
    }
  `));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    varying vec4 base; varying vec2 tex; varying float material; varying vec3 position;
    uniform sampler2D performer,wall,background;
    uniform vec3 lightA,lightB,lightL,lightR,rear;
    uniform float reverseView,stageSurvey,wallMedia,backdropMedia,wallLevel;
    float sidefillWeight(float signX){
      vec3 delta=position-vec3(signX*${stageGeometry.monitorX-.13},${stageGeometry.sidefillHeight},${stageGeometry.monitorZ});
      vec3 direction=normalize(vec3(-signX*${stageGeometry.monitorX-.13},0.,${stageGeometry.djZ-stageGeometry.monitorZ}));
      float angle=dot(delta,direction)/max(length(delta),.01);
      return smoothstep(.92,.985,angle)*1.15/(1.+dot(delta,delta)*.019);
    }
    void main(){
      if(material<.5){gl_FragColor=base;return;}
      if(material>3.5){
        if(backdropMedia<.5)discard;
        gl_FragColor=vec4(texture2D(background,tex).rgb*rear*2.5,1.);return;
      }
      if(material>2.5){
        vec3 preview=mix(vec3(.045,.065,.13),vec3(.23,.14,.37),tex.y);
        preview+=vec3(.17,.24,.52)*pow(max(0.,sin(tex.x*14.+tex.y*5.)),5.)*.50;
        if(wallMedia>.5){ vec4 frame=texture2D(wall,tex); preview=frame.rgb*frame.a; }
        gl_FragColor=vec4(preview*wallLevel,1.);return;
      }
      float side=smoothstep(-5.,5.,position.x);
      vec3 front=mix(lightA,lightB,side);
      vec3 fill=lightL*sidefillWeight(-1.)+lightR*sidefillWeight(1.);
      vec3 illumination=front*1.6+fill;
      if(material<1.5){
        gl_FragColor=vec4(base.rgb*(illumination+vec3(.23)+rear*.26+stageSurvey*.28),1.);return;
      }
      vec4 photo=texture2D(performer,tex);
      if(photo.a<.45)discard;
      float clip=smoothstep(1.30,2.3,max(illumination.r,max(illumination.g,illumination.b)));
      if(reverseView>.5)gl_FragColor=vec4(vec3(.10,.115,.15)*(fill+rear*2.+.42),1.);
      else gl_FragColor=vec4(mix(photo.rgb*illumination+rear*photo.a*.075,vec3(1.),clip),1.);
    }
  `));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms=Object.fromEntries('eye right up forward scale performer wall background lightA lightB lightL lightR rear reverseView stageSurvey wallMedia backdropMedia wallLevel'.split(' ').map(k=>[k,gl.getUniformLocation(program,k)]));
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,size,offset] of [['point',3,0],['color',4,3],['uv',2,7],['kind',1,9]]){
    const attr=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr,size,gl.FLOAT,false,40,offset*4);
  }
  const textures=['performer','wall','background'].map((name,i)=>{
    const texture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+i);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms[name],i);
    return texture;
  });
  const uploaded=[];
  const photo=new Image();
  photo.src='dj-forward.png';
  function texture(i,source) {
    if(!source||source instanceof HTMLVideoElement&&source.readyState<2)return false;
    const time=source instanceof HTMLVideoElement?source.currentTime:0;
    if(uploaded[i]?.source===source&&uploaded[i]?.time===time)return true;
    gl.activeTexture(gl.TEXTURE0+i);
    gl.bindTexture(gl.TEXTURE_2D,textures[i]);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    uploaded[i]={source,time};
    return true;
  }
  gl.enable(gl.DEPTH_TEST);
  function render(state,meshes,camera,{survey=false,reverse=false,rail=false,media,background}={}) {
    const pan=camera.pan*rad,tilt=camera.tilt*rad;
    const cp=Math.cos(pan),sp=Math.sin(pan),ct=Math.cos(tilt),st=Math.sin(tilt);
    gl.viewport(0,0,canvas.width,canvas.height);
    const rear=whitePoint(state.tempBack).map((c,i)=>c*rgbHex(state.backColor)[i]*state.back/100);
    const wash=survey?0:Math.max(0,(state.back/100-.69)/.31);
    gl.clearColor(.008+rear[0]*.065+wash*.96,.012+rear[1]*.065+wash*.96,.025+rear[2]*.065+wash*.95,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(uniforms.eye,camera.position);
    gl.uniform3f(uniforms.right,cp,0,-sp);
    gl.uniform3f(uniforms.up,-sp*st,ct,-cp*st);
    gl.uniform3f(uniforms.forward,sp*ct,st,cp*ct);
    gl.uniform2f(uniforms.scale,camera.focal/18,camera.focal/10.125);
    for(const key of ['A','B','L','R'])gl.uniform3fv(uniforms['light'+key],whitePoint(state['temp'+key]).map(c=>c*state['level'+key]/100));
    gl.uniform3fv(uniforms.rear,rear);
    gl.uniform1f(uniforms.reverseView,reverse?1:0);
    gl.uniform1f(uniforms.stageSurvey,survey?1:0);
    gl.uniform1f(uniforms.wallLevel,state.wallLevel/100);
    gl.uniform1f(uniforms.wallMedia,state.wall&&texture(1,media)?1:0);
    gl.uniform1f(uniforms.backdropMedia,texture(2,background)?1:0);
    const draws=[meshes.backdrop,meshes.main,meshes.panels];
    if(reverse||camera.position[2]>stageGeometry.djZ)draws.push(meshes.reverseDj);
    else if(photo.complete&&photo.naturalWidth&&texture(0,photo))draws.push(rail?facePerformer(meshes.dj,camera.position):meshes.dj);
    if(survey)draws.push(meshes.survey);
    else if(reverse||Math.abs(camera.pan)>92)draws.push(meshes.crowd);
    for(const data of draws) {
      if(!data.length)continue;
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES,0,data.length/10);
    }
  }
  return {render,photo};
}
