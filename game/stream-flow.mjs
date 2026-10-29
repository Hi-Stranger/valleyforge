// Water-only overlay. Draw after terrain and before bridges and depth-sorted props.
export function createStreamFlow(river){
  const width=river.naturalWidth,height=river.naturalHeight;
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const source=canvas(width,height),read=source.getContext('2d',{willReadFrequently:true});read.drawImage(river,0,0);
  const data=read.getImageData(0,0,width,height),water=[];let left=width,top=height,right=0,bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,r=data.data[i],g=data.data[i+1],b=data.data[i+2],a=data.data[i+3];
    const wet=a>128&&b>r*1.35&&g>r*1.2&&b>g*.85;
    data.data[i]=data.data[i+1]=data.data[i+2]=255;data.data[i+3]=wet?255:0;
    if(wet){water.push(y*width+x);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  if(!water.length)return {draw(){}};
  read.putImageData(data,0,0);
  const w=right-left+1,h=bottom-top+1,mask=canvas(w,h),frame=canvas(w,h),paint=frame.getContext('2d');
  mask.getContext('2d').drawImage(source,left,top,w,h,0,0,w,h);
  let seed=10429;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const ripples=Array.from({length:180},()=>{const p=water[Math.floor(random()*water.length)];return {x:p%width-left,y:Math.floor(p/width)-top,phase:random(),length:4+random()*12};});
  let cachedTick=-1;
  return {draw(ctx,seconds,view){
    if(view&&(view.x>right||view.y>bottom||view.x+view.width<left||view.y+view.height<top))return;
    // Cache at 30 fps. Time comes from the game clock, so pause also freezes water.
    const tick=Math.floor(seconds*30);
    if(tick!==cachedTick){
      cachedTick=tick;const phase=((tick/30)%4)/4,a=phase*Math.PI*2,shift=phase*8;
      paint.imageSmoothingEnabled=false;paint.clearRect(0,0,w,h);paint.globalAlpha=1;
      paint.drawImage(river,-left,-top+shift);paint.globalAlpha=phase;paint.drawImage(river,-left,-top+shift-8);paint.globalAlpha=1;paint.fillStyle='#b7f5fb';
      for(const p of ripples){const u=(phase+p.phase)%1,life=Math.sin(u*Math.PI),x=p.x+Math.sin(a+p.phase*9)*2,y=p.y+u*18-9;paint.globalAlpha=.08+life*.25;paint.fillRect(Math.round(x),Math.round(y),Math.round(p.length*(.6+life*.4)),1);if(p.length>10)paint.fillRect(Math.round(x+2),Math.round(y+2),Math.round(p.length*.4),1);}
      paint.globalAlpha=1;paint.globalCompositeOperation='destination-in';paint.drawImage(mask,0,0);paint.globalCompositeOperation='source-over';
    }
    ctx.drawImage(frame,left,top);
  }};
}
