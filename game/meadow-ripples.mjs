// Local water undulation from the approved preview: no downstream scrolling.
export function createMeadowRipples({river,ground,atlas,world}){
  const W=world.width,H=world.height,strength=2.3;
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const scratch=canvas(W,H),read=scratch.getContext('2d',{willReadFrequently:true});
  read.drawImage(ground,0,0);const base=read.getImageData(0,0,W,H).data;
  read.clearRect(0,0,W,H);read.drawImage(river,0,0);const source=read.getImageData(0,0,W,H).data;
  read.clearRect(0,0,W,H);read.imageSmoothingEnabled=false;
  for(const o of [...world.groundObjects,...world.scene]){const f=world.atlas[o.frames[0].key];read.drawImage(atlas,f.x,f.y,f.w,f.h,o.x,o.y,f.w*o.scale,f.h*(o.scaleY||o.scale));}
  const cover=read.getImageData(0,0,W,H).data,wet=new Uint8Array(W*H),cells=[];
  let left=W,top=H,right=0,bottom=0;
  const points=[[965,-20],[1070,55],[1190,135],[1280,210],[1370,310],[1450,405],[1470,505],[1440,565],[1330,630],[1210,690],[1150,755],[1200,820],[1320,890],[1440,960],[1490,1060]];
  let distance=0;const segments=[];
  for(let j=0;j<points.length-1;j++){const [x,y]=points[j],[xx,yy]=points[j+1],dx=xx-x,dy=yy-y,len=Math.hypot(dx,dy);segments.push({x,y,dx,dy,len,s:distance});distance+=len;}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4,r=base[i],g=base[i+1],b=base[i+2],rr=source[i],rg=source[i+1],rb=source[i+2];
    if(cover[i+3]>16||source[i+3]<128||!(b>r*1.35&&g>r*1.2&&b>g*.85&&rb>rr*1.35&&rg>rr*1.2&&rb>rg*.85))continue;
    let nearest=Infinity,s=0,n=0;
    for(const q of segments){const u=Math.max(0,Math.min(1,((x-q.x)*q.dx+(y-q.y)*q.dy)/(q.len*q.len))),px=q.x+q.dx*u,py=q.y+q.dy*u,d=(x-px)**2+(y-py)**2;if(d<nearest){nearest=d;s=q.s+q.len*u;n=((x-px)*-q.dy+(y-py)*q.dx)/q.len;}}
    cells.push({i,x,y,ss:Math.sin(s*.035),cs:Math.cos(s*.035),sn:Math.sin(n*.05),cn:Math.cos(n*.05)});wet[y*W+x]=1;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(!cells.length)return {draw(){}};
  const width=right-left+1,height=bottom-top+1,frame=canvas(width,height),mask=canvas(width,height),out=frame.getContext('2d'),pixels=out.createImageData(width,height),maskPixels=out.createImageData(width,height);
  for(const p of cells){p.local=((p.y-top)*width+p.x-left)*4;pixels.data[p.local+3]=255;maskPixels.data[p.local]=maskPixels.data[p.local+1]=maskPixels.data[p.local+2]=255;maskPixels.data[p.local+3]=255;}
  mask.getContext('2d').putImageData(maskPixels,0,0);
  const glints=Array.from({length:65},(_,k)=>{const p=cells[Math.floor(((k*.61803398875+.17)%1)*cells.length)];return {x:p.x-left,y:p.y-top,phase:k*.73,length:5+k%12};});
  const dx=new Int16Array(H),dy=new Int16Array(W);let cached=-1;
  return {draw(ctx,seconds,view){
    if(view&&(view.x>right||view.y>bottom||view.x+view.width<left||view.y+view.height<top))return;
    const tick=Math.floor(seconds*30);
    if(tick!==cached){cached=tick;const t=(tick/30)%4,a=t*Math.PI/2,st=Math.sin(a),ct=Math.cos(a);
      for(let y=top;y<=bottom;y++)dx[y]=Math.round(Math.sin(y*.045+a)*strength*1.2);
      for(let x=left;x<=right;x++)dy[x]=Math.round(Math.sin(x*.04-a)*strength*.55);
      for(const p of cells){const xx=p.x+dx[p.y],yy=p.y+dy[p.x],q=yy*W+xx,sample=xx>=0&&xx<W&&yy>=0&&yy<H&&wet[q]?q*4:p.i;
        const shimmer=2.5*strength*(p.ss*ct+p.cs*st)*(p.cn*ct+p.sn*st);
        pixels.data[p.local]=base[sample]+shimmer;pixels.data[p.local+1]=base[sample+1]+shimmer;pixels.data[p.local+2]=base[sample+2]+shimmer;
      }
      out.putImageData(pixels,0,0);out.save();out.lineWidth=1;out.strokeStyle='#bceef0';
      for(const g of glints){const phase=a+g.phase,f=(1+Math.sin(phase))*.5;out.globalAlpha=Math.min(.35,(.025+f*.09)*strength);out.beginPath();out.ellipse(g.x+Math.sin(phase)*.6*strength,g.y+Math.cos(phase)*.45*strength,g.length+f*2,1.3+f*.9,-.18,.12,Math.PI*.83);out.stroke();}
      out.restore();out.globalCompositeOperation='destination-in';out.drawImage(mask,0,0);out.globalCompositeOperation='source-over';
    }
    ctx.drawImage(frame,left,top);
  }};
}
