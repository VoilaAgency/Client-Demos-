'use strict';

const DEFAULT_HEIGHT = 46;
const DECK_HEIGHT = 38;
const REFERENCE_FOCAL = 24;
const REFERENCE_HEIGHT = 27;
const REFERENCE_WIDTH = 54;
const REFERENCE_CENTER_Y = .51;
const REFERENCE_TILT = 8 * Math.PI / 180;
const REF_COS = Math.cos(REFERENCE_TILT);
const REF_SIN = Math.sin(REFERENCE_TILT);

// Match the front and rear desk edges in the reference at the default height.
function referenceRaySlope(v) {
  const y=(REFERENCE_CENTER_Y-v)*REFERENCE_HEIGHT/REFERENCE_FOCAL;
  return (REF_SIN+y*REF_COS)/(REF_COS-y*REF_SIN);
}
const TABLE_NEAR=(DECK_HEIGHT-DEFAULT_HEIGHT)/referenceRaySlope(.905);
const TABLE_FAR=(DECK_HEIGHT-DEFAULT_HEIGHT)/referenceRaySlope(.782);
const TARGET_HEIGHT=DEFAULT_HEIGHT+TABLE_FAR*referenceRaySlope(.50);

function trackAngles(rail,height) {
  return {
    pan:Math.atan2(-rail,TABLE_FAR)*180/Math.PI,
    tilt:Math.atan2(TARGET_HEIGHT-height,Math.hypot(rail,TABLE_FAR))*180/Math.PI
  };
}

function rgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function whitePoint(kelvin) {
  const t = kelvin / 100;
  const limit = n => Math.min(255, Math.max(0, n)) / 255;
  return [
    limit(t <= 66 ? 255 : 329.699 * (t - 60) ** -.1332),
    limit(t <= 66 ? 99.471 * Math.log(t) - 161.12 : 288.122 * (t - 60) ** -.0755),
    limit(t >= 66 ? 255 : t <= 19 ? 0 : 138.518 * Math.log(t - 10) - 305.045)
  ];
}

function createBackdrop(canvas) {
  const depth=TABLE_FAR+60;
  const referenceFocal=16;
  const ctx=canvas.getContext('2d');
  const {width,height}=canvas;
  const frame=ctx.createImageData(width,height);
  let texture=null, lastView;

  function setImage(image) {
    lastView=undefined;
    if(!image){
      texture=null;
      ctx.clearRect(0,0,width,height);
      return;
    }
    const source=Object.assign(document.createElement('canvas'),{width:1280,height:720});
    const art=source.getContext('2d');
    const scale=Math.max(source.width/image.naturalWidth,source.height/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    art.drawImage(image,(source.width-w)/2,(source.height-h)/2,w,h);
    texture=art.getImageData(0,0,source.width,source.height);
  }

  function paint({pan,tilt,focal,rail,height:lensHeight}) {
    if(!texture)return;
    const view=[pan,tilt,focal,rail,lensHeight];
    if(lastView&&view.every((value,i)=>value===lastView[i]))return;
    const radians=Math.PI/180;
    const cp=Math.cos(pan*radians),sp=Math.sin(pan*radians);
    const ct=Math.cos(tilt*radians),st=Math.sin(tilt*radians);
    const pixels=frame.data,source=texture.data;
    const tw=texture.width,th=texture.height;
    pixels.fill(0);
    for(let row=0;row<height;row++){
      const v=(1-2*(row+.5)/height)*10.125/focal;
      const x0=sp*(ct-v*st),y=st+v*ct,z0=cp*(ct-v*st);
      for(let col=0;col<width;col++){
        const u=(2*(col+.5)/width-1)*18/focal;
        const x=x0+cp*u,z=z0-sp*u;
        if(z<=.0001)continue;
        const t=depth/z;
        const refY=lensHeight-DEFAULT_HEIGHT+t*y;
        const refDepth=refY*REF_SIN+depth*REF_COS;
        if(refDepth<=.005)continue;
        const sx=.5+(rail+t*x)/refDepth*referenceFocal/36;
        const sy=.5-(refY*REF_COS-depth*REF_SIN)/refDepth*referenceFocal/20.25;
        // Extend edge pixels when the camera sees past the uploaded texture.
        const ix=Math.min(tw-1,Math.max(0,Math.floor(sx*tw)));
        const iy=Math.min(th-1,Math.max(0,Math.floor(sy*th)));
        const i=(iy*tw+ix)*4,o=(row*width+col)*4;
        pixels[o]=source[i];pixels[o+1]=source[i+1];pixels[o+2]=source[i+2];pixels[o+3]=source[i+3];
      }
    }
    ctx.putImageData(frame,0,0);
    lastView=view;
  }
  return {setImage,paint};
}

function createFinder(canvas, onLoad) {
  const photo = new Image();
  const ready = () => photo.naturalWidth;
  const gl = canvas.getContext('webgl', { alpha:true, premultipliedAlpha:false, antialias:false });
  let render;
  if (gl) {
    function shader(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
      attribute vec2 p;
      varying vec2 frame;
      void main() { frame=p; gl_Position=vec4(p,0.,1.); }
    `));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 frame;
      uniform sampler2D source;
      uniform vec4 camera;
      uniform float cameraHeight;
      uniform vec3 barA,barB;
      uniform vec2 levels;
      const float nearZ=${TABLE_NEAR.toFixed(6)}, farZ=${TABLE_FAR.toFixed(6)};
      const float deckY=${DECK_HEIGHT.toFixed(1)};
      const float cs=${REF_COS.toFixed(9)}, sn=${REF_SIN.toFixed(9)};

      // Project the intersected world point into the original photo.
      vec4 boothSample(vec3 p, bool performer) {
        p.y-=${DEFAULT_HEIGHT.toFixed(1)};
        float depth=p.y*sn+p.z*cs;
        if(depth<=.005) return vec4(0.);
        vec2 uv=vec2(.5+p.x/depth*${(REFERENCE_FOCAL/REFERENCE_WIDTH).toFixed(9)},
          ${REFERENCE_CENTER_Y}-(p.y*cs-p.z*sn)/depth*${(REFERENCE_FOCAL/REFERENCE_HEIGHT).toFixed(9)});
        if(performer && (uv.x<0. || uv.x>1. || uv.y<0. || uv.y>1.)) return vec4(0.);
        vec2 texel=clamp(uv,vec2(.0003,.0006),vec2(.9997,.9994));
        texel.y=(texel.y+(performer?0.:1.))*.5;
        vec4 plate=texture2D(source,texel);
        float side=smoothstep(.28,.72,uv.x);
        float a=levels.x*mix(.88,.12,side);
        float b=levels.y*mix(.12,.88,side);
        vec3 front=plate.rgb*2.55*(barA*a+barB*b);
        float clip=smoothstep(.61,.94,a+b);
        return vec4(mix(front,vec3(1.),clip),plate.a);
      }

      void main() {
        float cp=cos(camera.x),sp=sin(camera.x),ct=cos(camera.y),st=sin(camera.y);
        vec3 right=vec3(cp,0.,-sp), up=vec3(-sp*st,ct,-cp*st);
        vec3 forward=vec3(sp*ct,st,cp*ct);
        vec3 ray=forward+right*(frame.x*18./camera.z)+up*(frame.y*10.125/camera.z);
        vec3 origin=vec3(camera.w,cameraHeight,0.);
        gl_FragColor=vec4(0.);
        if(ray.z<=.0001) return;

        vec3 apron=origin+ray*(nearZ/ray.z);
        if(apron.y<=deckY && apron.y>=0.) {
          gl_FragColor=boothSample(apron,false);
          return;
        }
        if(cameraHeight>deckY && ray.y<-.0001) {
          vec3 tabletop=origin+ray*((deckY-cameraHeight)/ray.y);
          if(tabletop.z>=nearZ && tabletop.z<=farZ) {
            gl_FragColor=boothSample(tabletop,false);
          }
        }
        vec3 dj=origin+ray*(farZ/ray.z);
        vec4 performer=boothSample(dj,true);
        if(performer.a>0.) {
          vec4 desk=gl_FragColor;
          float alpha=performer.a+desk.a*(1.-performer.a);
          vec3 rgb=(performer.rgb*performer.a+desk.rgb*desk.a*(1.-performer.a))/alpha;
          gl_FragColor=vec4(rgb,alpha);
        }
      }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    const loc = Object.fromEntries(['camera','cameraHeight','barA','barB','levels'].map(k=>[k,gl.getUniformLocation(program,k)]));
    const texture=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    for (const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    for (const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    photo.onload=()=>{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);
      onLoad();
    };
    render = s => {
      const rad = Math.PI/180;
      gl.uniform4f(loc.camera,s.pan*rad,s.tilt*rad,s.focal,s.rail);
      gl.uniform1f(loc.cameraHeight,s.height);
      gl.uniform3fv(loc.barA,whitePoint(s.tempA));gl.uniform3fv(loc.barB,whitePoint(s.tempB));
      gl.uniform2f(loc.levels,s.levelA/100,s.levelB/100);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    };
  } else {
    // The software renderer intersects the same three planes when WebGL is unavailable.
    const ctx=canvas.getContext('2d');
    canvas.width=800;
    canvas.height=450;
    const frame=ctx.createImageData(canvas.width,canvas.height);
    const plate=Object.assign(document.createElement('canvas'),{width:1200,height:1200});
    const art=plate.getContext('2d',{willReadFrequently:true});
    const w=plate.width,h=plate.height/2;
    let source, lit, lightingKey;
    const smooth=(a,b,x)=>{
      const t=Math.min(1,Math.max(0,(x-a)/(b-a)));
      return t*t*(3-2*t);
    };
    photo.onload=()=>{
      art.drawImage(photo,0,0,w,h*2);
      source=art.getImageData(0,0,w,h*2).data;
      lit=new Uint8ClampedArray(source.length);
      onLoad();
    };

    function relight(s) {
      const key=[s.levelA,s.levelB,s.tempA,s.tempB].join('/');
      if(key===lightingKey)return;
      const left=whitePoint(s.tempA),right=whitePoint(s.tempB);
      for(let x=0;x<w;x++){
        const side=smooth(.28,.72,x/w);
        const a=s.levelA/100*(.88-.76*side),b=s.levelB/100*(.12+.76*side);
        const clip=smooth(.61,.94,a+b);
        const gain=left.map((channel,i)=>2.55*(a*channel+b*right[i])*(1-clip));
        for(let i=x*4;i<source.length;i+=w*4){
          for(let ch=0;ch<3;ch++)lit[i+ch]=source[i+ch]*gain[ch]+255*clip;
          lit[i+3]=source[i+3];
        }
      }
      lightingKey=key;
    }

    function sample(x,y,z,performer){
      const refY=y-DEFAULT_HEIGHT;
      const depth=refY*REF_SIN+z*REF_COS;
      if(depth<=.005)return -1;
      const u=.5+x/depth*REFERENCE_FOCAL/REFERENCE_WIDTH;
      const v=REFERENCE_CENTER_Y-(refY*REF_COS-z*REF_SIN)/depth*REFERENCE_FOCAL/REFERENCE_HEIGHT;
      if(performer&&(u<0||u>1||v<0||v>1))return -1;
      const ix=Math.min(w-1,Math.max(0,Math.floor(u*w)));
      const iy=Math.min(h-1,Math.max(0,Math.floor(v*h)))+(performer?0:h);
      return (iy*w+ix)*4;
    }

    render=s=>{
      relight(s);
      const out=frame.data;
      const width=frame.width,height=frame.height;
      const pan=s.pan*Math.PI/180,tilt=s.tilt*Math.PI/180;
      const cp=Math.cos(pan),sp=Math.sin(pan),ct=Math.cos(tilt),st=Math.sin(tilt);
      out.fill(0);
      for(let row=0;row<height;row++){
        const v=(1-2*(row+.5)/height)*10.125/s.focal;
        const x0=sp*(ct-v*st),y=st+v*ct,z0=cp*(ct-v*st);
        for(let col=0;col<width;col++){
          const u=(2*(col+.5)/width-1)*18/s.focal;
          const x=x0+cp*u,z=z0-sp*u;
          if(z<=.0001)continue;
          const apronT=TABLE_NEAR/z,apronY=s.height+apronT*y;
          let desk=-1,performer=-1;
          if(apronY<=DECK_HEIGHT&&apronY>=0){
            desk=sample(s.rail+apronT*x,apronY,TABLE_NEAR,false);
          }else{
            const t=s.height>DECK_HEIGHT&&y<-.0001?(DECK_HEIGHT-s.height)/y:0;
            if(t*z>=TABLE_NEAR&&t*z<=TABLE_FAR)desk=sample(s.rail+t*x,DECK_HEIGHT,t*z,false);
            const djT=TABLE_FAR/z;
            performer=sample(s.rail+djT*x,s.height+djT*y,TABLE_FAR,true);
          }
          const o=(row*width+col)*4;
          const a=performer<0?0:lit[performer+3]/255;
          const b=desk<0?0:lit[desk+3]/255*(1-a);
          if(a+b===0)continue;
          for(let ch=0;ch<3;ch++)out[o+ch]=((a?lit[performer+ch]*a:0)+(b?lit[desk+ch]*b:0))/(a+b);
          out[o+3]=(a+b)*255;
        }
      }
      ctx.putImageData(frame,0,0);
    };
  }
  photo.src='booth-depth-atlas.webp';
  return state => { if (ready()) render(state); };
}
