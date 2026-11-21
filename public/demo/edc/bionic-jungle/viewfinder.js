'use strict';

const drawViewfinder = (() => {
  const near = 0.6;
  const crowd = [];
  let seed = 82026;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let y=32; y<530; y+=y<65?4:7) {
    for (let x=-380; x<=380; x+=y<65?5.5:8) {
      crowd.push([x+(random()-.5)*4, y+random()*2.8, 4.7+random()*1.7, random(), random()]);
    }
  }
  const palette = ['#253747','#2b4351','#324450','#413948','#243944','#365260'];
  function insideFootprint(x,y,footprint) {
    let inside=false;
    for (let i=0,j=footprint.length-1;i<footprint.length;j=i++) {
      const [ax,ay]=footprint[i], [bx,by]=footprint[j];
      if ((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
    }
    return inside;
  }

  function scene(stageFront,stageWidth,railY,risers,vip,scenic,sceneScale) {
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
    const world=([u,v])=>[(v-1000)*sceneScale,(1000-u)*sceneScale];
    const deck=scenic.stageHeight;
    function tracedPlatform(points,height,color){
      const footprint=points.map(world);
      for(let i=0;i<footprint.length;i++){
        const a=footprint[i],b=footprint[(i+1)%footprint.length];
        add([[...a,0],[...b,0],[...b,height],[...a,height]],'#192b3b');
      }
      add(footprint.map(p=>[...p,height]),color,'#486072');
    }
    tracedPlatform(scenic.mainDeck,deck,'#2b4052');
    const back=stageFront-Math.max(16,stageWidth*.09);
    if(scenic.scene==='cosmic'){
      // Continuous scalloped front derived from the stage's wave footprint.
      const count=36,span=stageWidth;
      for(let i=0;i<count;i++){
        const x=-span/2+(i+.5)*span/count;
        const edge=Math.cos(x/span*Math.PI*6);
        const height=28+edge*7+Math.cos(x/span*Math.PI*2)*3;
        const y=back+Math.sin(x/span*Math.PI*3)*2;
        box(x,y-1.7,deck,span/count+.08,3.4,height+3,['#223344','#1b293a','#476477']);
        panel(x,y+.06,deck+3,span/count-.24,height-2,i%2?'#35586a':'#2b495e','#5e8291');
        add([[x-span/count/2,y+.13,deck+height],[x+span/count/2,y+.13,deck+height],
             [x+span/count/2,y+.13,deck+height+1.2],[x-span/count/2,y+.13,deck+height+1.2]],'#9eb1d2');
        if(i%3===0)panel(x,y+.16,deck+7,span/count*.19,height-9,'#64a3b3');
      }
      for(const side of [-1,1]){
        for(let i=0;i<7;i++)box(side*stageWidth*.39,back+8-i*.32,deck+23-i*2.7,4,2.3,2.2,['#142230','#101b26','#4c6674']);
      }
    }else if(scenic.scene==='basspod'){
      // Five portal rings and a deliberately abstract central sculptural head.
      for(let i=-2;i<=2;i++){
        const cx=i*stageWidth*.19,cz=deck+24+(2-Math.abs(i))*3,r=stageWidth*.095;
        for(let j=0;j<32;j++){
          const a=j/32*Math.PI*2,b=(j+1)/32*Math.PI*2;
          add([[cx+Math.cos(a)*r,back,cz+Math.sin(a)*r],
               [cx+Math.cos(b)*r,back,cz+Math.sin(b)*r],
               [cx+Math.cos(b)*(r-1.5),back,cz+Math.sin(b)*(r-1.5)],
               [cx+Math.cos(a)*(r-1.5),back,cz+Math.sin(a)*(r-1.5)]],'#78a9b4','#42596b');
        }
        box(cx,back-2,deck,stageWidth*.13,4,30,['#253d49','#182d39','#496474']);
        panel(cx,back+.1,deck+2,stageWidth*.105,22,'#305569','#78a9b4');
      }
      box(0,back+3,deck+17,19,10,24,['#586f7a','#344a59','#708895']);
      box(0,back+5,deck+35,16,7,8,['#68838b','#465e6b','#81949d']);
      for(const side of [-1,1]){
        box(side*5,back+8.2,deck+30,5,.6,1.1,['#172a35','#172a35','#607e8b']);
        box(side*stageWidth*.43,back+3,deck,6,6,26,['#263a48','#1b2c3b','#4d6574']);
      }
    }else if(scenic.scene==='quantum'){
      panel(0,back,deck+3,stageWidth*.7,27,'#29394f','#8190b9');
      for(let i=-3;i<=3;i++){
        const x=i*stageWidth*.125,h=28-Math.abs(i)*2;
        box(x,back-2,deck,stageWidth*.11,3,h,['#27384e','#19283c','#59677e']);
        panel(x,back+.1,deck+3,stageWidth*.09,h-4,i%2?'#3b435e':'#344c64','#8c91bf');
      }
      const roof=scenic.roof,beam=(a,b,w,color)=>{
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
        const nx=-dy/length*w/2,ny=dx/length*w/2;
        add([[a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],
             [b[0]-nx,b[1]-ny,b[2]],[a[0]-nx,a[1]-ny,a[2]]],color);
      };
      // Open truss canopy: no opaque ceiling hiding the audience.
      for(let row=0;row<=6;row++){
        const y=roof.near+(roof.far-roof.near)*row/6;
        box(roof.left,y,0,1.5,1.5,roof.height-8,['#344356','#263448','#5e7088']);
        box(roof.right,y,0,1.5,1.5,roof.height-8,['#344356','#263448','#5e7088']);
        let last;
        for(let j=0;j<=12;j++){
          const x=roof.left+(roof.right-roof.left)*j/12,z=roof.height-8+Math.sin(j/12*Math.PI)*8;
          if(last)beam(last,[x,y,z],1.1,'#66758d');
          last=[x,y,z];
        }
        if(row<6)for(const x of [roof.left,roof.right,0])
          beam([x,y,roof.height-5],[x,y+(roof.far-roof.near)/6,roof.height-5],.75,'#52647d');
      }
    }else if(scenic.scene==='bionic'){
      // Three separate decks and a segmented perimeter truss, never a solid wall.
      const beam=(a,b,w,color)=>{
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
        const nx=-dy/length*w/2,ny=dx/length*w/2;
        add([[a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],
             [b[0]-nx,b[1]-ny,b[2]],[a[0]-nx,a[1]-ny,a[2]]],color);
      };
      for(const truss of scenic.trusses){
        const [a,b]=truss.ends.map(world),h=truss.height;
        beam([...a,h],[...b,h],1.3,'#6d8290');
        beam([...a,h-1.7],[...b,h-1.7],1,'#405d6a');
        const count=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));
        for(let i=0;i<count;i++){
          const t=i/count,u=(i+1)/count;
          const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
          beam([x,y,h-(i%2?1.7:0)],[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,h-(i%2?0:1.7)],.3,'#66808b');
          if(i%3===0)box(x,y,h-3,1.3,1.3,1,['#385460','#253d4b','#83a5b0']);
        }
        for(const [x,y] of [a,b])box(x,y,0,.65,.65,h,['#3c5461','#263e4b','#667f8b']);
      }
      for(const side of [-1,1]){
        box(side*stageWidth*.4,back+1,deck,2.5,3,8,['#1e303b','#162733','#4d6570']);
      }
    }else{
      const span=stageWidth;
      for(let i=0;i<9;i++){
        const x=(i-4)*span/9;
        const y=back+Math.abs(i-4)*1.35;
        const height=30+((i+1)%3)*5;
        box(x,y-2,deck,span/9-1.6,4,height,['#233044','#172332','#3a4e65']);
        panel(x,y+.12,deck+2,span/9-3.2,height-4,'#273c56','#6e7f9a');
        panel(x,y+.18,deck+height-4,span/9-3.2,1.15,'#a994cb');
        panel(x,y+.20,deck+7,span/9-3.2,.5,'#5b9aaf');
      }
      for(const line of scenic.surroundPanels){
        const [a,b]=line.map(world),steps=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/12));
        for(let i=0;i<steps;i++){
          const t=(i+.5)/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
          const length=Math.hypot(b[0]-a[0],b[1]-a[1])/steps;
          const along=[(b[0]-a[0])/steps*.44,(b[1]-a[1])/steps*.44];
          const p=[x-along[0],y-along[1]],q=[x+along[0],y+along[1]],h=30+(i%3)*4;
          add([[...p,3],[...q,3],[...q,10],[...p,10]],'#344c63','#66829b');
          add([[...p,h-10],[...q,h-10],[...q,h],[...p,h]],i%2?'#2e3c53':'#344c63','#66829b');
          add([[...p,h-2],[...q,h-2],[...q,h-1],[...p,h-1]],'#a191b9');
          box(x,y,0,2,2,h+2,['#1b2b3b','#152332','#3c5367']);
        }
      }
    }
    for(const tower of scenic.towers){
      const [x,y]=world(tower.point),size=tower.width;
      for(const side of [-1,1])box(x+side*size*.36,y,0,1,1,tower.height,['#283a49','#192938','#4d6577']);
      box(x,y,tower.height-4,size+2,size*.6,4,['#435268','#25394b','#6c8090']);
      for(let i=0;i<5;i++)box(x,y+.8,tower.height-7-i*2.6,4,2,2.2,['#172431','#12202c','#4a6174']);
    }
    box(0,0,deck,18,4,3.2,['#283642','#1c2b35','#485a65']);
    panel(0,2.05,deck+1.6,17,.75,'#63c2cb');
    for(let i=-2;i<=2;i++)box(i*2.4,-.2,deck+3.2,1.4,.95,.22,['#1e2730','#19212a','#5d6f7b']);
    box(0,-1.65,deck+2.8,1.55,.85,2.65,['#604c61','#433748','#8c7191']);
    box(0,-1.65,deck+5.35,.82,.75,.89,['#be947e','#987665','#d6ad91']);
    box(0,railY,0,stageWidth,.25,3.8,['#364854','#253540','#637884']);
    function platform(footprint,height,top) {
      const deck=footprint.map(([x,y])=>[x,y,height]);
      for (let i=0;i<deck.length;i++) {
        const j=(i+1)%deck.length;
        add([[...footprint[i],0],[...footprint[j],0],deck[j],deck[i]],'#243c4b','#547181');
      }
      add(deck,top,'#b3c5cd');
    }
    for (const {footprint,height,equipmentStacks} of risers) {
      platform(footprint,height,'#698695');
      if(!equipmentStacks)continue;
      const center=footprint.reduce(([x,y],[a,b])=>[x+a/footprint.length,y+b/footprint.length],[0,0]);
      const xs=footprint.map(point=>point[0]), ys=footprint.map(point=>point[1]);
      const width=Math.max(...xs)-Math.min(...xs), depth=Math.max(...ys)-Math.min(...ys);
      const [cx,cy]=center;
      const cameraY=cy-depth*.29;
      box(cx,cameraY,height,2.2,2.2,.5,['#344354','#293748','#718294']);
      box(cx,cameraY,height+.5,.65,.65,3.5,['#344354','#293748','#718294']);
      box(cx,cameraY,height+4,1.4,2,.9,['#273241','#20303e','#8192a1']);
      const columns=equipmentStacks;
      for(let i=0;i<columns;i++){
        const x=cx+width*.5*(i/(columns-1)-.5);
        const y=cy+depth*.32;
        if(!insideFootprint(x,y,footprint))continue;
        box(x,y,height,Math.min(5,width*.2),3,2.8,['#273241','#20303e','#5a697a']);
        box(x,y,height+2.8,Math.min(3.6,width*.15),2,1.7,['#344354','#293748','#718294']);
      }
    }
    const spectators=[];
    const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
    for (const {corners,heights} of vip) {
      const [frontLeft,frontRight,backRight,backLeft]=corners;
      const width=Math.hypot(...frontLeft.map((v,i)=>v-frontRight[i]));
      const depth=Math.hypot(...frontLeft.map((v,i)=>v-backLeft[i]));
      const columns=Math.max(2,Math.round(width/5));
      const rows=Math.max(2,Math.round(depth/5));
      for (let i=0;i<heights.length;i++) {
        const start=i/heights.length,end=(i+1)/heights.length;
        const left=mix(frontLeft,backLeft,start),right=mix(frontRight,backRight,start);
        const farLeft=mix(frontLeft,backLeft,end),farRight=mix(frontRight,backRight,end);
        platform([left,right,farRight,farLeft],heights[i],i%2?'#445368':'#4d6171');
        const tierRows=Math.max(1,Math.round(rows/heights.length));
        for(let row=0;row<tierRows;row++){
          const t=(row+.5)/tierRows;
          for(let col=0;col<columns;col++){
            const sample=crowd[(i*91+row*31+col*19)%crowd.length];
            const u=(col+.25+sample[3]*.5)/columns;
            const [x,y]=mix(mix(left,farLeft,t),mix(right,farRight,t),u);
            spectators.push([x,y,heights[i],...sample.slice(2)]);
          }
        }
      }
    }
    return {faces,spectators};
  }

  return function draw(canvas, options) {
    const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height;
    const {camera, aim, eye, targetHeight, stageFront, stageWidth, railY, audience, risers, vip, sensor, focal, showCrowd, tilt,scenic,sceneScale}=options;
    const dx=aim[0]-camera[0], dy=aim[1]-camera[1], dz=targetHeight-eye;
    const horizontal=Math.hypot(dx,dy);
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
    const angle=tilt===undefined?Math.atan2(dz,horizontal):tilt*Math.PI/180;
    const cosine=Math.cos(angle),sine=Math.sin(angle);
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
      queue.push({depth:clipped.reduce((sum,p)=>sum+p[2],0)/clipped.length,draw(){
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
    const {faces,spectators}=scene(stageFront,stageWidth,railY,risers,vip,scenic,sceneScale);
    for (const face of faces) polygon(face.pts,face.fill,face.stroke);
    function person(x,y,z,personHeight,shade,gesture) {
      const head=cameraPoint([x,y,z+personHeight-.32]);
      if(head[2]<1.6)return;
      const [sx,sy]=project(head),unit=focalPixels/head[2],radius=.31*unit;
      const base=cameraPoint([x,y,z]);
      const bottom=base[2]>near ? project(base)[1] : h+20;
      if(sx+unit<0||sx-unit>w||sy-radius>h||bottom<0)return;
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
    if(showCrowd){
      for (const spectator of spectators) person(...spectator);
      const crowdAreas=[audience,...scenic.vipAreas.map(a=>a.footprint.map(p=>worldPoint(p,sceneScale)))];
      const sampleArea=crowdAreas.flat();
      const minX=Math.min(...sampleArea.map(point=>point[0]));
      const maxX=Math.max(...sampleArea.map(point=>point[0]));
      const minY=Math.min(...sampleArea.map(point=>point[1]));
      const maxY=Math.max(...sampleArea.map(point=>point[1]));
      const occupied=[...risers.map(riser=>riser.footprint),...vip.map(deck=>deck.corners)];
      for(const [oldX,oldY,personHeight,shade,gesture] of crowd){
        const x=minX+(oldX+380)/760*(maxX-minX);
        const y=minY+(oldY-32)/498*(maxY-minY);
        if(crowdAreas.some(area=>insideFootprint(x,y,area))&&!occupied.some(footprint=>insideFootprint(x,y,footprint))){
          person(x,y,0,personHeight,shade,gesture);
        }
      }
    }
    queue.sort((a,b)=>b.depth-a.depth).forEach(item=>item.draw());
    const vignette=ctx.createRadialGradient(w/2,h/2,h*.15,w/2,h/2,w*.60);
    vignette.addColorStop(0,'#050a1100');vignette.addColorStop(1,'#050a1178');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  };
})();
