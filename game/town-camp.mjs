// Ambient camp animation uses the same game clock as movement and combat.
const TAU=Math.PI*2;
const SMITH_STOPS=[.16,.38,.64,.79,.89,1.03,1.18,1.5];
const HERO_STOPS=[.8,1.4,1.9,2.6,3.8,4.7,5.4,6];
const FLIES=[[158,210,20,12],[514,174,25,16],[734,208,23,12],[1001,194,20,15],[1394,219,18,14],[1458,486,20,15],[1363,773,24,14],[997,802,24,12],[550,764,22,13],[218,692,24,15],[172,493,18,14],[582,340,18,12]];

export function campPosesAt(time){
  const t=((time%6)+6)%6;
  return {smith:SMITH_STOPS.findIndex(v=>t%1.5<v),mage:Math.floor(t%3/3*8),hero:HERO_STOPS.findIndex(v=>t<v)};
}

export function createTownCamp({ctx,world,image,npcImage,npcScale=()=>1,visible}){
  const stamps=new Map();
  const stampTransform=new DOMMatrix();
  // Fixed lights retain native-sized gradients; variable smoke scales one stamp.
  for(const [color,radius] of [['#ef821d',216],['#ff9e25',98],['#ffac2a',69],['#bd50f0',62],['#ffac30',7],['#ffcf69',21],['#be6bea',18],['#cbdc68',13],['#f0ed88',5]]){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=radius*2+2;
    const paint=canvas.getContext('2d'),gradient=paint.createRadialGradient(radius+1,radius+1,0,radius+1,radius+1,radius);
    gradient.addColorStop(0,color);gradient.addColorStop(1,'transparent');paint.fillStyle=gradient;paint.fillRect(0,0,canvas.width,canvas.height);
    stamps.set(color,{canvas,pattern:ctx.createPattern(canvas,'no-repeat'),radius});
  }
  function glow(x,y,r,color,alpha){
    if(!visible(x,y,r))return;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha;
    const stamp=stamps.get(color),scale=r/stamp.radius,extent=(stamp.radius+1)*scale;
    ctx.imageSmoothingEnabled=true;
    stampTransform.a=stampTransform.d=scale;stampTransform.e=x-extent;stampTransform.f=y-extent;
    stamp.pattern.setTransform(stampTransform);ctx.fillStyle=stamp.pattern;
    ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function pixel(x,y,w,color,alpha=1){
    ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,w,w);ctx.globalAlpha=1;
  }
  function frame(key,x,y,scale){
    const f=world.atlas[key];
    const updated=key.startsWith('camp-v2:');if(updated)scale=npcScale();
    ctx.drawImage(updated?npcImage:image,f.x,f.y,f.w,f.h,Math.round(x+f.ox*scale),Math.round(y+f.oy*scale),Math.round(f.w*scale),Math.round(f.h*scale));
  }
  function drawObject(o,time){
    if(o.custom!=='camp-actor')return false;
    const actor=world.campActors[o.actor];
    const pose=campPosesAt(time)[o.actor]??Math.floor(time*2)%actor.frames.length;
    frame(actor.frames[pose],o.x,o.y,actor.scale);
    return true;
  }
  function drawGround(time){
    const q=time*TAU/6;
    glow(763,532,216,'#ef821d',.045+.015*Math.sin(q*5)+.008*Math.sin(q*11));
    glow(288,293,98,'#ff9e25',.04+.017*Math.sin(q*7+.7));
    glow(1210,397,69,'#ffac2a',.035+.014*Math.sin(q*9));
    glow(1224,318,62,'#bd50f0',.045+.02*Math.sin(q*2));
  }
  function flame(x,y,scale,time,phase){
    if(!visible(x,y,70))return;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    for(let i=0;i<4;i++){
      const k=time*TAU*([7,9,11,13][i]/6)+phase+i*2,dx=(i-1.5)*8,h=29+Math.sin(k)*8,lean=Math.sin(k+1)*5;
      ctx.globalAlpha=.5+.1*Math.sin(k);ctx.fillStyle=i%2?'#ffdf46':'#ff9e1e';
      ctx.beginPath();ctx.moveTo(dx-6,0);ctx.lineTo(dx-8,-h*.35);ctx.lineTo(dx+lean,-h);ctx.lineTo(dx+4,-h*.5);ctx.lineTo(dx+7,0);ctx.closePath();ctx.fill();
      pixel(dx,-h*.48,4,'#fff4ab',.7);
    }
    ctx.restore();
  }
  function drawFront(time){
    // Quantize only cosmetic effects; all actions still use the game clock.
    const t=Math.floor(time*20)/20,q=t*TAU/6;
    flame(763,515,.85,t,.4);flame(289,299,.48,t,2);flame(1207,404,.4,t,1);
    if(visible(761,460,90))for(let i=0;i<9;i++){
      const u=(t/3+i/9)%1,x=761+Math.sin(u*4+i*3)*9+u*(i%2?10:-10),y=492-u*99,a=Math.sin(Math.PI*u)*.85;
      glow(x,y,7,'#ffac30',a*.2);pixel(x,y,i%3?2:3,'#ffce68',a);
    }
    if(visible(434,348,40)){
      const impact=t%1.5-.89;
      if(impact>=0&&impact<.18){const u=impact/.18;glow(434,348,21,'#ffcf69',(1-u)*.45);for(let i=0;i<3;i++)pixel(434+(i-1)*u*24,346-u*(16+i*5)+u*u*11,2,'#ffd88a',1-u);}
    }
    if(visible(1225,290,130)){
      ctx.save();ctx.beginPath();ctx.ellipse(1225,319,44,11,0,0,TAU);ctx.clip();
      for(let i=0;i<6;i++){
        const u=(t/1.5+i/6)%1,x=1198+i*10+Math.sin(q+i)*2,y=322-u*7;
        ctx.globalAlpha=Math.sin(Math.PI*u)*.8;ctx.strokeStyle='#f8c8ff';ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(x,y,2+u*3,1+u*1.5,0,0,TAU);ctx.stroke();
      }
      const angle=t*TAU/3;ctx.strokeStyle='#eeadff';ctx.globalAlpha=.65;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(1224+Math.cos(angle)*21,319+Math.sin(angle)*5,9,3,0,0,TAU);ctx.stroke();ctx.restore();
      for(let i=0;i<13;i++){
        const u=(t/3+i/13)%1,x=1226+Math.sin(u*8+q)*9,y=309-u*103,a=Math.sin(Math.PI*u)*.11;
        glow(x,y,9+u*9,'#be6bea',a);ctx.globalAlpha=a;ctx.fillStyle='#b55de0';ctx.beginPath();ctx.ellipse(x,y,5+u*5,9,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
      }
    }
    for(let i=0;i<FLIES.length;i++){
      const [cx,cy,rx,ry]=FLIES[i];if(!visible(cx,cy,40))continue;
      const p=i*2.399,x=cx+Math.cos(q+p)*rx+Math.sin(q*2+p)*4,y=cy+Math.sin(q+p)*ry,a=.4+.55*((Math.sin(q*2+p)+1)/2)**2;
      glow(x,y,13,'#cbdc68',a*.38);glow(x,y,5,'#f0ed88',a*.65);pixel(x,y,3,'#f7ef99',a);
    }
    ctx.globalAlpha=1;
  }
  function snapshot(time){
    const q=time*TAU/6;
    return {clock:time,poses:campPosesAt(time),fireflies:FLIES.map(([x,y,rx,ry],i)=>({x:x+Math.cos(q+i*2.399)*rx+Math.sin(q*2+i*2.399)*4,y:y+Math.sin(q+i*2.399)*ry}))};
  }
  return {drawObject,drawGround,drawFront,snapshot,cacheBytes:()=>[...stamps.values()].reduce((n,s)=>n+s.canvas.width*s.canvas.height*4,0),dispose(){for(const stamp of stamps.values())stamp.canvas.width=stamp.canvas.height=0;stamps.clear();image=null;}};
}
