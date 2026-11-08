'use strict';
const scene = (() => {
  const ft=venue.feet,R=Math.PI/180;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const wrap=n=>(n%360+360)%360;
  function clip(poly,dist){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],x=dist(a),y=dist(b);
      if(x>=0)out.push(a);
      if((x>=0)!==(y>=0))out.push(mix(a,b,x/(x-y)));
    }
    return out;
  }
  function aim(p,alt,target,height,prior=0){
    const dx=target[0]-p[0],dy=target[1]-p[1],run=Math.hypot(dx,dy)*ft;
    return [run>.01?wrap(Math.atan2(dx,-dy)/R):prior,Math.atan2(alt-height,run)/R];
  }
  function camera(p,alt,yaw,tilt,sensor,focal){
    const y=yaw*R,t=tilt*R,sy=Math.sin(y),cy=Math.cos(y),st=Math.sin(t),ct=Math.cos(t);
    const pos=[...p,alt/ft],right=[cy,sy,0],up=[sy*st,-cy*st,ct],forward=[sy*ct,-cy*ct,-st];
    const hx=sensor/(2*focal),hy=hx*9/16;
    const space=world=>{const v=world.map((x,i)=>x-pos[i]);return [dot(v,right),dot(v,up),dot(v,forward)];};
    const ground=(x,y)=>{
      const ray=forward.map((v,i)=>v+x*hx*right[i]+y*hy*up[i]);
      if(ray[2]>=-1e-8)return null;
      return p.map((v,i)=>v-pos[2]*ray[i]/ray[2]);
    };
    const limits=[q=>q[2]-.08,q=>q[2]*hx+q[0],q=>q[2]*hx-q[0],q=>q[2]*hy+q[1],q=>q[2]*hy-q[1]];
    let footprint=[[60,30],[1160,30],[1160,720],[60,720]];
    for(const test of limits)footprint=clip(footprint,q=>test(space([...q,0])));
    return {p,space,ground,limits,footprint,hx,hy,hfov:2*Math.atan(hx)/R,vfov:2*Math.atan(hy)/R,horizon:!ground(0,1)};
  }
  function basis(s){
    const center=s.zone.reduce((sum,p)=>sum.map((v,i)=>v+p[i]/s.zone.length),[0,0]);
    const d=center.map((v,i)=>v-s.aim[i]),n=Math.hypot(...d)||1;
    return {front:d.map(x=>x/n),right:[-d[1]/n,d[0]/n]};
  }
  const hues=['#78a6c9','#83c2d0','#8eade3','#6c9aa8','#86a2e3','#7897ad','#a4a9ec','#7cb5c6','#74ab9b'];
  const cues=['Goggled airship','Petal façade','Open LED towers','Canopy ribs','Five portals','Stacked containers','Glowing face','Compact LED towers','Jungle canopy'];
  const sizes=[[270,55],[170,45],[200,50],[130,31],[160,47],[125,34],[136,38],[100,32],[84,26]];
  const palette=['#253747','#2b4351','#324450','#413948','#243944','#365260'];
  function inside(x,y,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
  }return hit;}
  const stages=venue.stages.map((s,i)=>{
    const {front,right}=basis(s),[w,h]=sizes[i],col=hues[i],faces=[];
    const world=(x,y,z)=>[s.aim[0]+(x*right[0]+y*front[0])/ft,s.aim[1]+(x*right[1]+y*front[1])/ft,z/ft];
    const poly=(ps,fill,stroke)=>faces.push({p:ps.map(q=>world(...q)),fill,stroke});
    const wall=(x,y,w,z,h,fill='#2e4659',stroke=col)=>poly([[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y,z+h],[x-w/2,y,z+h]],fill,stroke);
    const ring=(x,y,z,rx,rz,fill='#263b50',stroke=col)=>poly(Array.from({length:24},(_,j)=>[x+rx*Math.cos(j*Math.PI/12),y,z+rz*Math.sin(j*Math.PI/12)]),fill,stroke);
    const box=(x,y,z,w,d,h,fill='#263b4a')=>{
      const a=x-w/2,b=x+w/2,c=y-d/2,e=y+d/2,t=z+h;
      wall(x,e,w,z,h,fill,'#405b6a');wall(x,c,w,z,h,'#182935','#344b60');
      poly([[a,c,z],[a,e,z],[a,e,t],[a,c,t]],'#172733','#344b60');
      poly([[b,c,z],[b,e,z],[b,e,t],[b,c,t]],'#1d303d','#344b60');
      poly([[a,c,t],[b,c,t],[b,e,t],[a,e,t]],'#34495c','#405c6d');
    };
    const tower=(x,w,h)=>{box(x,-14,6,w,8,h);wall(x,-9.9,w*.76,8,h*.78,'#314f67');};
    box(0,-5,0,w,34,6);box(0,2,6,18,5,3.2);wall(0,4.6,17,7.4,.55,col);
    box(0,-1,8.6,1.4,.65,2.35,'#536579');box(0,-1,10.95,.68,.55,.75,'#a19598');
    if(i===0){ring(0,-19,26,w*.48,19);wall(0,-16,44,9,27);for(const sign of [-1,1]){ring(sign*15,-14,33,11,10);ring(sign*15,-13.8,33,7,6,'#41657d');ring(sign*w*.31,-14,41,18,15);}}
    if(i===1)for(let k=-4;k<=4;k++){const z=25+Math.cos(k*.55)*11;ring(k*w/11,-17,z,13,16);ring(k*w/11,-16.8,z,7,10,'#395975');}
    if(i===2||i===7)for(let k=-4;k<=4;k++)tower(k*w/10,w/(i===2?14:17),h-(Math.abs(k)%3)*7);
    if(i===3)for(let j=0;j<6;j++){const y=-24+j*8;poly([[-w/2,y,8],[-w*.32,y,h],[0,y,h+9],[w*.32,y,h],[w/2,y,8]],'none',col);}
    if(i===4){for(let k=-2;k<=2;k++)ring(k*w/6,-16,27+Math.abs(k)*3,14,16);ring(0,-10,31,15,23,'#39506c');for(const k of [-1,1])ring(k*5,-9.6,35,2.5,1.6,'#a1b0e9');}
    if(i===5)for(let j=0;j<3;j++)for(let k=-2;k<=2;k++){if(j===2&&Math.abs(k)<2)continue;box(k*w/5,-17,6+j*9,23,12,9,j%2?'#314456':'#283a4a');for(let r=-4;r<=4;r++)wall(k*w/5+r*2.2,-10.8,.32,7+j*9,7,'#536e85');}
    if(i===6){ring(0,-16,26,27,24,'#334764');for(const k of [-1,1]){ring(k*12,-15.6,30,6.5,3,'#a2b4ee');tower(k*w*.36,18,31);}wall(0,-15.5,14,14,2,'#86a1cc');}
    if(i===8)for(let k=-5;k<=5;k++){const z=16+Math.cos(k*.46)*12;ring(k*w/12,-13,z,8+Math.abs(k)%2*4,10,'#244743');ring(k*w/12,-11,z-5,5,5,'#34615a');}
    const [xs,ys]=[0,1].map(k=>s.zone.map(p=>p[k]));
    let seed=2401+i*9901;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const crowd=[];
    for(let y=Math.min(...ys);y<Math.max(...ys);y+=2.05)for(let x=Math.min(...xs);x<Math.max(...xs);x+=2.05){
      const a=x+random()*1.8,b=y+random()*1.8;
      if(inside(a,b,s.zone)&&dot([a-s.aim[0],b-s.aim[1]],front)>5)crowd.push([a,b,4.7+random()*1.7,random(),random()]);
    }
    return {faces,crowd};
  });
  function outline(path){
    const el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',path);
    const l=el.getTotalLength();return Array.from({length:130},(_,i)=>{const p=el.getPointAtLength(l*i/130);return[p.x,p.y,0];});
  }
  const outer=outline(venue.track.outer),inner=outline(venue.track.inner);
  function draw(canvas,cam,stage,showCrowd,alt){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#101826');g.addColorStop(1,'#2c4255');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const pixel=([x,y,z])=>[w/2*(1+x/(cam.hx*z)),h/2*(1-y/(cam.hy*z))];
    function shape(points,fill,stroke){
      let p=points.map(cam.space);for(const test of cam.limits){p=clip(p,test);if(p.length<3)return;}
      const xy=p.map(pixel);ctx.beginPath();ctx.moveTo(...xy[0]);xy.slice(1).forEach(q=>ctx.lineTo(...q));ctx.closePath();
      if(fill!=='none'){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=1.2;ctx.strokeStyle=stroke;ctx.stroke();}
    }
    shape([[-5000,-5000,0],[5000,-5000,0],[5000,5000,0],[-5000,5000,0]],'#15252f');
    shape(outer,'#344954','#6f8895');shape(inner,'#182d36','#567582');
    shape(venue.garage.map(p=>[...p,.02]),'#303850','#7a6f9b');
    for(const s of venue.stages)shape(s.zone.map(p=>[...p,.025]),'#1e3b47','#3f6270');
    const queue=[];
    for(const [i,s] of stages.entries()){
      for(const face of s.faces)queue.push({z:face.p.reduce((a,p)=>a+cam.space(p)[2]/face.p.length,0),paint:()=>shape(face.p,face.fill,face.stroke)});
      if(!showCrowd)continue;
      const distance=Math.hypot(...venue.stages[i].aim.map((v,k)=>v-cam.p[k]))*ft;
      const stride=alt>180||distance>900?8:alt>55||distance>350?3:1;
      for(let k=0;k<s.crowd.length;k+=stride){
        const [x,y,high,shade,arm]=s.crowd[k],head=cam.space([x,y,high/ft]),base=cam.space([x,y,0]);
        if(head[2]<.42||base[2]<.12)continue;
        const [px,py]=pixel(head),bottom=pixel(base)[1],u=w/2/cam.hx/head[2]/ft;
        if(px+u<0||px-u>w||py-u>h||bottom<0)continue;
        queue.push({z:head[2],paint(){
          const r=Math.max(.42,.30*u),neck=py+r*.8,shoulder=neck+.47*u;
          ctx.fillStyle=palette[Math.floor(shade*palette.length)];
          if(u>1.2){ctx.beginPath();ctx.moveTo(px-.27*u,neck);ctx.lineTo(px-.69*u,shoulder);ctx.lineTo(px-.43*u,bottom);ctx.lineTo(px+.43*u,bottom);ctx.lineTo(px+.69*u,shoulder);ctx.lineTo(px+.27*u,neck);ctx.fill();
            if(arm>.92){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.23*u;ctx.beginPath();ctx.moveTo(px+.55*u,shoulder);ctx.lineTo(px+.83*u,py-.55*u);ctx.stroke();}}
          ctx.fillStyle=shade>.56?'#64707a':'#485761';ctx.beginPath();ctx.ellipse(px,py,r,r*1.2,0,0,Math.PI*2);ctx.fill();
        }});
      }
    }
    queue.sort((a,b)=>b.z-a.z).forEach(p=>p.paint());
    const vignette=ctx.createRadialGradient(w/2,h/2,h*.18,w/2,h/2,w*.60);
    vignette.addColorStop(0,'#050a1100');vignette.addColorStop(1,'#050a118c');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#d6e8ef9c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2-9,h/2);ctx.lineTo(w/2+9,h/2);ctx.moveTo(w/2,h/2-9);ctx.lineTo(w/2,h/2+9);ctx.stroke();
    const label=venue.stages[stage].name.toUpperCase()+'  /  '+cues[stage].toUpperCase();
    ctx.font='14px system-ui';ctx.fillStyle='#0b1723e8';ctx.fillRect(14,h-40,ctx.measureText(label).width+24,27);ctx.fillStyle=hues[stage];ctx.fillText(label,26,h-22);
  }
  return {aim,basis,camera,draw,mix,wrap};
})();
