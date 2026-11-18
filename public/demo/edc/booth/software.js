'use strict';

// The same world meshes and depth tests used by the GPU renderer, in a smaller
// framebuffer for browsers where WebGL is disabled.
function createSoftwareRenderer(canvas) {
  canvas.width=800;
  canvas.height=450;
  const width=canvas.width,height=canvas.height;
  const ctx=canvas.getContext('2d',{alpha:false});
  const frame=ctx.createImageData(width,height);
  const pixels=new Uint32Array(frame.data.buffer);
  const depth=new Float32Array(width*height);
  const art=document.createElement('canvas');
  const sampler=art.getContext('2d',{willReadFrequently:true});
  const photo=new Image();
  photo.src='dj-forward.png';
  const samples=new Map();
  function loadTexture(name,source) {
    if(!source)return null;
    const video=source instanceof HTMLVideoElement;
    const w=video?source.videoWidth:source.naturalWidth;
    const h=video?source.videoHeight:source.naturalHeight;
    if(!w||!h||video&&source.readyState<2)return null;
    const time=video?source.currentTime:0;
    const cached=samples.get(name);
    if(cached?.source===source&&cached.time===time)return cached;
    const scale=Math.min(1,900/Math.max(w,h));
    art.width=Math.max(1,Math.round(w*scale));
    art.height=Math.max(1,Math.round(h*scale));
    sampler.drawImage(source,0,0,art.width,art.height);
    const tex={source,time,w:art.width,h:art.height,pixels:sampler.getImageData(0,0,art.width,art.height).data};
    samples.set(name,tex);
    return tex;
  }
  const pack=(r,g,b)=>(255<<24)|(limit(Math.round(b*255),0,255)<<16)|(limit(Math.round(g*255),0,255)<<8)|limit(Math.round(r*255),0,255);
  function render(state,meshes,camera,{survey=false,reverse=false,rail=false,media,background}={}) {
    const rearColor=rgbHex(state.backColor);
    const rear=whitePoint(state.tempBack).map((c,i)=>c*rearColor[i]*state.back/100);
    const wash=survey?0:Math.max(0,(state.back/100-.69)/.31);
    pixels.fill(pack(.008+rear[0]*.065+wash*.96,.012+rear[1]*.065+wash*.96,.025+rear[2]*.065+wash*.95));
    depth.fill(0);
    const light=Object.fromEntries(['A','B','L','R'].map(key=>[key,whitePoint(state['temp'+key]).map(c=>c*state['level'+key]/100)]));
    const performer=loadTexture('dj',photo);
    const wall=state.wall&&loadTexture('wall',media);
    const backdrop=loadTexture('background',background);
    const pan=camera.pan*rad,tilt=camera.tilt*rad;
    const cp=Math.cos(pan),sp=Math.sin(pan),ct=Math.cos(tilt),st=Math.sin(tilt);
    const [ox,oy,oz]=camera.position;
    const scaleX=width*.5*camera.focal/18,scaleY=height*.5*camera.focal/10.125;
    const wallLevel=state.wallLevel/100;
    function cameraPoint(data,i) {
      const x=data[i]-ox,y=data[i+1]-oy,z=data[i+2]-oz;
      const forward=x*sp+z*cp;
      return [x*cp-z*sp,y*ct-forward*st,forward*ct+y*st,data[i+7],data[i+8]];
    }
    function project(v) {
      const inverse=1/v[2];
      return [width*.5+v[0]*inverse*scaleX,height*.5-v[1]*inverse*scaleY,inverse,v[3]*inverse,v[4]*inverse];
    }
    function shade(x,y,z,red,green,blue,kind) {
      const s=limit((x+5)/10,0,1),side=s*s*(3-2*s);
      const left=sidefillWeight(x,y,z,-1),right=sidefillWeight(x,y,z,1);
      const illum=light.A.map((a,i)=>(a+(light.B[i]-a)*side)*1.6+light.L[i]*left+light.R[i]*right);
      const [r,g,b]=illum;
      if(kind===1) {
        const ambient=.23+(survey?.28:0);
        return pack(red*(r+ambient+rear[0]*.26),green*(g+ambient+rear[1]*.26),blue*(b+ambient+rear[2]*.26));
      }
      return illum;
    }
    function raster(a,b,c,material,color,illum) {
      const [ax,ay,az,au,av]=a,[bx,by,bz,bu,bv]=b,[cx,cy,cz,cu,cv]=c;
      const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if(Math.abs(det)<.0001)return;
      const left=Math.max(0,Math.floor(Math.min(ax,bx,cx))),right=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx)));
      const top=Math.max(0,Math.floor(Math.min(ay,by,cy))),bottom=Math.min(height-1,Math.ceil(Math.max(ay,by,cy)));
      if(left>right||top>bottom)return;
      const texture=material===2?performer:material===3?wall:backdrop;
      const t=illum?limit((Math.max(...illum)-1.3),0,1):0,clip=t*t*(3-2*t);
      const backColor=reverse&&material===2?pack(.10*(illum[0]+rear[0]*2+.42),.115*(illum[1]+rear[1]*2+.42),.15*(illum[2]+rear[2]*2+.42)):0;
      const daw=(by-cy)/det,dbw=(cy-ay)/det;
      for(let y=top;y<=bottom;y++){
        const p=y+.5-cy;
        let wa=daw*(left+.5-cx)+(cx-bx)*p/det;
        let wb=dbw*(left+.5-cx)+(ax-cx)*p/det;
        for(let x=left,i=y*width+left;x<=right;x++,i++,wa+=daw,wb+=dbw){
          const wc=1-wa-wb;
          if(wa<-.0001||wb<-.0001||wc<-.0001)continue;
          const z=za(wa,wb,wc);
          if(z<=depth[i])continue;
          let sample=color;
          if(material>=2) {
            let u=(au*wa+bu*wb+cu*wc)/z;
            let v=(av*wa+bv*wb+cv*wc)/z;
            if(texture){
              const ti=4*(limit(Math.floor(v*texture.h),0,texture.h-1)*texture.w+limit(Math.floor(u*texture.w),0,texture.w-1));
              const tex=texture.pixels,alpha=tex[ti+3]/255;
              if(material===2&&alpha<.45)continue;
              const r=tex[ti]/255,g=tex[ti+1]/255,b=tex[ti+2]/255;
              if(material===2)sample=reverse?backColor:pack(
                (r*illum[0]+rear[0]*.075)*(1-clip)+clip,
                (g*illum[1]+rear[1]*.075)*(1-clip)+clip,
                (b*illum[2]+rear[2]*.075)*(1-clip)+clip);
              else if(material===3)sample=pack(r*alpha*wallLevel,g*alpha*wallLevel,b*alpha*wallLevel);
              else sample=pack(r*rear[0]*2.5,g*rear[1]*2.5,b*rear[2]*2.5);
            }else if(material===3){
              const band=Math.max(0,Math.sin(u*14+v*5))**5*.5;
              sample=pack((.045+.185*v+.17*band)*wallLevel,(.065+.075*v+.24*band)*wallLevel,(.13+.24*v+.52*band)*wallLevel);
            }
          }
          depth[i]=z;
          pixels[i]=sample;
        }
      }
      function za(wa,wb,wc){return az*wa+bz*wb+cz*wc;}
    }
    function draw(data) {
      const near=.055;
      for(let i=0;i<data.length;i+=30){
        const material=data[i+9];
        if(material===2&&!performer||material===4&&!backdrop)continue;
        const triangle=[cameraPoint(data,i),cameraPoint(data,i+10),cameraPoint(data,i+20)];
        if(triangle.every(p=>p[2]<near))continue;
        let polygon=triangle;
        if(triangle.some(p=>p[2]<near)){
          polygon=[];
          for(let j=0;j<3;j++){
            const p=triangle[j],q=triangle[(j+1)%3];
            if(p[2]>=near)polygon.push(p);
            if((p[2]<near)!==(q[2]<near)){
              const t=(near-p[2])/(q[2]-p[2]);
              polygon.push(p.map((n,k)=>n+(q[k]-n)*t));
            }
          }
        }
        const [x,y,z]=[0,1,2].map(j=>(data[i+j]+data[i+10+j]+data[i+20+j])/3);
        let color=pack(data[i+3],data[i+4],data[i+5]),illum;
        if(material===1)color=shade(x,y,z,data[i+3],data[i+4],data[i+5],material);
        else if(material===2)illum=shade(x,y,z,0,0,0,material);
        const points=polygon.map(project);
        for(let j=1;j<points.length-1;j++)raster(points[0],points[j],points[j+1],material,color,illum);
      }
    }
    draw(meshes.backdrop);
    draw(meshes.main);
    draw(meshes.panels);
    if(reverse||camera.position[2]>stageGeometry.djZ)draw(meshes.reverseDj);
    else draw(rail?facePerformer(meshes.dj,camera.position):meshes.dj);
    if(survey)draw(meshes.survey);
    else if(reverse||Math.abs(camera.pan)>92)draw(meshes.crowd);
    ctx.putImageData(frame,0,0);
  }
  return {render,photo};
}
