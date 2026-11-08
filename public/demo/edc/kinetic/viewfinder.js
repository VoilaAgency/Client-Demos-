'use strict';

const drawViewfinder = (() => {
  const near = 0.6;
  const crowd = [];
  let seed = 82026;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let y=32; y<530; y+=y<65?4:y<140?7:15) {
    for (let x=-380; x<=380; x+=y<65?5.5:y<140?8:13) {
      crowd.push([x+(random()-.5)*4, y+random()*2.8, 4.7+random()*1.7, random(), random()]);
    }
  }
  const palette = ['#253747','#2b4351','#324450','#413948','#243944','#365260'];
  function scene(stageFront) {
    const faces = [];
    const add = (pts, fill, stroke=null) => faces.push({pts,fill,stroke});
    const panel = (x,y,z,w,h,fill,stroke) => add([[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y,z+h],[x-w/2,y,z+h]],fill,stroke);
    const box = (x,y,z,w,d,h,colors) => {
      const l=x-w/2,r=x+w/2,a=y-d/2,b=y+d/2,t=z+h;
      add([[l,b,z],[r,b,z],[r,b,t],[l,b,t]],colors[0]);
      add([[l,a,z],[r,a,z],[r,a,t],[l,a,t]],colors[0]);
      add([[l,a,z],[l,b,z],[l,b,t],[l,a,t]],colors[1]);
      add([[r,a,z],[r,b,z],[r,b,t],[r,a,t]],colors[1]);
      add([[l,a,t],[l,b,t],[r,b,t],[r,a,t]],colors[2]);
    };
    box(0,stageFront-16,0,440,32,6,['#1c2936','#111c28','#304151']);
    box(0,stageFront-.45,1.2,380,.9,1.3,['#243e4d','#233742','#39515e']);
    const back = Math.min(-29,stageFront-22);
    for (let i=-4;i<=4;i++) {
      const x=i*14.2, h=41+7*(1-Math.abs(i)/4), bottom=10;
      box(x,back-2.6,6,14.1,4.8,h+6,['#182b3a','#162333','#244457']);
      panel(x,back,bottom-2,12.6,h+2,i%2?'#233f55':'#284b60','#4b778a');
      add([[x-6,back+.05,9],[x+5.9,back+.05,12],[x+5.9,back+.05,12.45],[x-6,back+.05,9.45]],'#507e99');
      add([[x-6,back+.1,bottom+6],[x+5.9,back+.1,bottom+16],[x+5.9,back+.1,bottom+18],[x-6,back+.1,bottom+8]],'#69afbd');
      add([[x-6,back+.1,bottom+14],[x+5.9,back+.1,bottom+24],[x+5.9,back+.1,bottom+24.6],[x-6,back+.1,bottom+14.6]],'#b997c0');
    }
    for (const sign of [-1,1]) {
      for (let i=0;i<6;i++) {
        const x=sign*(83+i*23), h=47-i*4.6, y=back+i*1.1;
        box(x,y-3,6,17,10,h,['#243546','#162635','#3b5468']);
        panel(x,y+2.2,12,13,h-10,i%2?'#364358':'#2b465b','#59768c');
        add([[x-6,y+2.3,15],[x+6,y+2.3,15+i*3],[x+6,y+2.3,17+i*3],[x-6,y+2.3,17]],i%2?'#ba91ba':'#67adba');
      }
      const x=sign*69;
      for (let i=0;i<7;i++) {
        box(x,back+13-i*.38,37-i*3.05,5.2,3.2,2.5,['#131a24','#18232e','#2c3744']);
      }
      for (let i=0;i<4;i++) box(sign*(23+i*2.5),-1,6,1.7,2.2,1.4,['#1b2630','#16222c','#3c4f5a']);
    }
    box(0,0,6,18,4,3.5,['#283642','#1c2b35','#485a65']);
    panel(0,2.05,7.6,17,.75,'#63c2cb');
    for (let i=-2;i<=2;i++) box(i*2.4,-.2,9.5,1.4,.95,.22,['#1e2730','#19212a','#5d6f7b']);
    box(0,-1.65,8.8,1.55,.85,2.65,['#604c61','#433748','#8c7191']);
    box(0,-1.65,11.35,.82,.75,.89,['#be947e','#987665','#d6ad91']);
    box(0,30,0,800,.25,3.8,['#364854','#253540','#637884']);
    return faces;
  }

  return function draw(canvas, options) {
    const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height;
    const {camera, aim, eye, targetHeight, stageFront, sensor, focal, showCrowd}=options;
    const dx=aim[0]-camera[0], dy=aim[1]-camera[1], dz=targetHeight-eye;
    const horizontal=Math.hypot(dx,dy), length=Math.hypot(horizontal,dz);
    const background=ctx.createLinearGradient(0,0,0,h);
    background.addColorStop(0,'#111926');background.addColorStop(.56,'#293b50');background.addColorStop(1,'#162634');
    ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
    if (horizontal<.05) {
      ctx.fillStyle='#dcebf3';ctx.font='20px system-ui';ctx.textAlign='center';
      ctx.fillText('Separate the camera and aim points',w/2,h/2);
      ctx.textAlign='start';
      return;
    }
    const focalPixels=w*focal/sensor;
    const px=dx/horizontal,py=dy/horizontal;
    const cosine=horizontal/length,sine=dz/length;
    function cameraPoint([x,y,z]) {
      const lx=x-camera[0],ly=y-camera[1],lz=z-eye,along=lx*px+ly*py;
      return [-lx*py+ly*px,lz*cosine-along*sine,along*cosine+lz*sine];
    }
    const project=([x,y,z])=>[w/2+focalPixels*x/z,h/2-focalPixels*y/z];
    const queue=[];
    function polygon(pts,fill,stroke) {
      const v=pts.map(cameraPoint), clipped=[];
      for (let i=0;i<v.length;i++) {
        const a=v[i],b=v[(i+1)%v.length];
        if(a[2]>=near)clipped.push(a);
        if((a[2]>=near)!==(b[2]>=near)){
          const t=(near-a[2])/(b[2]-a[2]);
          clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near]);
        }
      }
      if(clipped.length<3)return;
      const points=clipped.map(project);
      if(points.every(p=>p[0]<0)||points.every(p=>p[0]>w)||points.every(p=>p[1]<0)||points.every(p=>p[1]>h))return;
      queue.push({depth:v.reduce((sum,p)=>sum+p[2],0)/v.length,draw(){
        ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();
        ctx.fillStyle=fill;ctx.fill();
        if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
      }});
    }
    const horizon=h/2+focalPixels*sine/cosine;
    const start=Math.max(0,Math.min(h,horizon));
    const floor=ctx.createLinearGradient(0,Math.min(start,h-1),0,h);
    floor.addColorStop(0,'#233644');floor.addColorStop(1,'#101c28');
    ctx.fillStyle=floor;ctx.fillRect(0,start,w,h-start);
    for (const face of scene(stageFront)) polygon(face.pts,face.fill,face.stroke);
    if(showCrowd)for(const [x,y,personHeight,shade,gesture] of crowd){
      const head=cameraPoint([x,y,personHeight-.32]);
      if(head[2]<1.6)continue;
      const [sx,sy]=project(head),unit=focalPixels/head[2],radius=.31*unit;
      const base=cameraPoint([x,y,0]);
      const bottom=base[2]>near ? project(base)[1] : h+20;
      if(sx+unit<0||sx-unit>w||sy-radius>h||bottom<0)continue;
      queue.push({depth:head[2],draw(){
        ctx.fillStyle=palette[Math.floor(shade*palette.length)];
        const neck=sy+radius*.8, shoulder=neck+.47*unit;
        ctx.beginPath();ctx.moveTo(sx-.27*unit,neck);ctx.lineTo(sx-.69*unit,shoulder);
        ctx.lineTo(sx-.43*unit,bottom);ctx.lineTo(sx+.43*unit,bottom);
        ctx.lineTo(sx+.69*unit,shoulder);ctx.lineTo(sx+.27*unit,neck);ctx.fill();
        if(gesture>.91) {
          const side=gesture>.955?1:-1;
          ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.23*unit;
          ctx.beginPath();ctx.moveTo(sx+side*.55*unit,shoulder);ctx.lineTo(sx+side*.85*unit,sy-.55*unit);ctx.stroke();
        }
        ctx.fillStyle=shade>.56?'#64707a':'#485761';ctx.beginPath();ctx.ellipse(sx,sy,radius,radius*1.22,0,0,Math.PI*2);ctx.fill();
      }});
    }
    queue.sort((a,b)=>b.depth-a.depth).forEach(item=>item.draw());
    const vignette=ctx.createRadialGradient(w/2,h/2,h*.15,w/2,h/2,w*.60);
    vignette.addColorStop(0,'#050a1100');vignette.addColorStop(1,'#050a1178');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  };
})();
