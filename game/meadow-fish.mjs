// Decorative fish swim beneath the static water surface and scenery.
export function createMeadowFish({river,ground,atlas,world}){
  const W=world.width,H=world.height;
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const source=canvas(W,H),read=source.getContext('2d',{willReadFrequently:true});
  read.drawImage(ground,0,0);const base=read.getImageData(0,0,W,H).data;
  read.clearRect(0,0,W,H);read.drawImage(river,0,0);const water=read.getImageData(0,0,W,H).data;
  read.clearRect(0,0,W,H);read.imageSmoothingEnabled=false;
  for(const o of [...world.groundObjects,...world.scene]){const f=world.atlas[o.frames[0].key];read.drawImage(atlas,f.x,f.y,f.w,f.h,o.x,o.y,f.w*o.scale,f.h*(o.scaleY||o.scale));}
  const cover=read.getImageData(0,0,W,H).data,maskData=read.createImageData(W,H),cells=[];
  for(let i=0;i<base.length;i+=4){const r=base[i],g=base[i+1],b=base[i+2],rr=water[i],rg=water[i+1],rb=water[i+2];
    if(cover[i+3]>16||water[i+3]<128||!(b>r*1.35&&g>r*1.2&&b>g*.85&&rb>rr*1.35&&rg>rr*1.2&&rb>rg*.85))continue;
    maskData.data[i]=maskData.data[i+1]=maskData.data[i+2]=255;maskData.data[i+3]=255;cells.push(i/4);
  }
  const wet=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&maskData.data[(Math.floor(y)*W+Math.floor(x))*4+3]>0;
  const fish=[];
  for(const [k,target] of [[1255,245],[1340,340],[1390,425],[1440,520],[1350,590],[1318,610],[1288,624],[1198,735],[1260,840]].entries()){
    let best=null,dist=Infinity;
    for(let j=0;j<cells.length;j+=4){const x=cells[j]%W,y=Math.floor(cells[j]/W),d=(x-target[0])**2+(y-target[1])**2;if(d>=dist)continue;
      let clear=0;for(let a=0;a<8;a++)if(wet(x+Math.cos(a*Math.PI/4)*27,y+Math.sin(a*Math.PI/4)*27))clear++;
      if(clear>=7){best={x,y};dist=d;}
    }
    if(best)fish.push({...best,phase:k*.71,bronze:k===1||k===7,scale:k%3===0?1.1:.85});
  }
  if(!fish.length)return {draw(){},positions(){return [];}};
  const left=Math.max(0,Math.floor(Math.min(...fish.map(f=>f.x))-42)),top=Math.max(0,Math.floor(Math.min(...fish.map(f=>f.y))-30));
  const width=Math.min(W-left,Math.ceil(Math.max(...fish.map(f=>f.x))-left+42)),height=Math.min(H-top,Math.ceil(Math.max(...fish.map(f=>f.y))-top+30));
  read.clearRect(0,0,W,H);read.putImageData(maskData,0,0);
  const mask=canvas(width,height),frame=canvas(width,height),out=frame.getContext('2d');mask.getContext('2d').drawImage(source,left,top,width,height,0,0,width,height);
  const pose=(f,t)=>{const a=t*Math.PI/4+f.phase;return {x:f.x+Math.sin(a)*23,y:f.y+Math.cos(a)*11,angle:Math.atan2(-11*Math.sin(a),23*Math.cos(a))};};
  let cached=-1;
  return {
    positions(seconds){return fish.map(f=>{const p=pose(f,seconds);return {x:p.x,y:p.y};});},
    draw(ctx,seconds,view){
      if(view&&(view.x>left+width||view.y>top+height||view.x+view.width<left||view.y+view.height<top))return;
      const tick=Math.floor(seconds*30);
      if(tick!==cached){cached=tick;const t=tick/30;out.clearRect(0,0,width,height);out.imageSmoothingEnabled=false;
        for(const f of fish){const p=pose(f,t),tail=Math.round(Math.sin(t*Math.PI*4+f.phase)*2);
          out.save();out.translate(Math.round(p.x)-left,Math.round(p.y)-top);out.rotate(p.angle);out.scale(f.scale,f.scale);out.globalAlpha=.16;out.fillStyle='#133649';out.fillRect(-5,4,12,3);
          out.globalAlpha=.88;out.fillStyle=f.bronze?'#8e6339':'#184e63';out.fillRect(-6,-2,11,5);out.fillRect(-3,-3,6,7);out.fillRect(5,-1,3,3);out.fillRect(-10,-3+tail,3,3);out.fillRect(-10,1+tail,3,3);out.fillRect(-8,-1+tail,3,3);
          out.fillStyle=f.bronze?'#cfa461':'#6cb7c1';out.fillRect(-3,-2,7,2);out.fillRect(-2,2,6,1);out.globalAlpha=.65;out.fillRect(-1,-5,3,2);out.fillRect(-1,4,3,2);out.globalAlpha=.95;out.fillStyle='#142b34';out.fillRect(5,-1,1,1);out.restore();
        }
        out.globalCompositeOperation='destination-in';out.drawImage(mask,0,0);out.globalCompositeOperation='source-over';
      }
      ctx.drawImage(frame,left,top);
    }
  };
}
