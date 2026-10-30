import {BOAR_KING,boarKingFrame} from './boar-king.mjs?v=2026.10.30.10';

// Normalize generated sheet cells once; every runtime frame uses a cropped source.
function sheetFrames(image,rows){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const cw=image.width/4,ch=image.height/rows,frames=[];
 for(let row=0;row<rows;row++)for(let col=0;col<4;col++){const data=ctx.getImageData(col*cw,row*ch,cw,ch).data;let left=cw,right=0,top=ch,bottom=0;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[(y*cw+x)*4+3]>128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left||bottom<top)throw Error('野猪王动作帧为空');frames.push({x:col*cw+left,y:row*ch+top,w:right-left+1,h:bottom-top+1});}
 return {image,frames,scale:132/Math.max(...frames.map(f=>f.w))};
}
export async function loadBoarKingArt(loadImage,version){const [motion,pounce]=await Promise.all(['boar-king-motion.png','boar-king-pounce.png'].map(name=>loadImage(`./game/assets/${name}?v=${version}`)));const sheets={motion:sheetFrames(motion,4),pounce:sheetFrames(pounce,2)};
 return {
  draw(ctx,e,time,exploration=false){const pose=boarKingFrame(e,time),sheet=sheets[pose.sheet],f=sheet.frames[pose.frame],s=sheet.scale*(exploration?1.15:1);ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y-pose.height));if(Math.cos(e.angle)>.1)ctx.scale(-1,1);if(e.hit>0)ctx.filter='brightness(1.5)';ctx.drawImage(sheet.image,f.x,f.y,f.w,f.h,Math.round(-f.w*s/2),Math.round(-f.h*s),Math.round(f.w*s),Math.round(f.h*s));ctx.restore();},
  ground(ctx,e){const b=e.boar;if(!b)return;ctx.save();ctx.lineWidth=1.5;
   const ring=(x,y,rx,ry,fill,stroke)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
   if(b.action==='roar'){const progress=Math.min(1,b.clock/BOAR_KING.roarWindup);ring(e.x,e.y,BOAR_KING.roarRadius,BOAR_KING.roarRadius,'rgba(201,95,41,'+(.08+progress*.12)+')','#edbe80');if(b.clock>=BOAR_KING.roarWindup&&b.clock<1.4)for(let i=0;i<3;i++){const p=((b.clock-.6)*1.8+i/3)%1;ctx.globalAlpha=1-p;ring(e.x,e.y,20+p*102,20+p*102,null,'#ffdf9f');}}
   if(b.action==='pounce'&&b.target){ring(b.target.x,b.target.y,BOAR_KING.pounceRadius,BOAR_KING.pounceRadius,'#d963392b','#f0b67f');ctx.setLineDash([5,4]);ring(b.target.x,b.target.y,BOAR_KING.pounceRadius+5,BOAR_KING.pounceRadius+5,null,'#e6c28c');}
   if(b.action==='chargeWindup'){ctx.translate(e.x,e.y);ctx.rotate(b.direction);ctx.fillStyle='#df623b38';ctx.fillRect(0,-BOAR_KING.chargeWidth/2,BOAR_KING.chargeSpeed*BOAR_KING.chargeDuration,BOAR_KING.chargeWidth);ctx.strokeStyle=b.clock>=BOAR_KING.chargeLock?'#ffdf9d':'#e4b97b';ctx.setLineDash([7,5]);ctx.strokeRect(0,-BOAR_KING.chargeWidth/2,BOAR_KING.chargeSpeed*BOAR_KING.chargeDuration,BOAR_KING.chargeWidth);ctx.setLineDash([]);for(let x=75;x<550;x+=75){ctx.beginPath();ctx.moveTo(x-8,-7);ctx.lineTo(x,0);ctx.lineTo(x-8,7);ctx.stroke();}}
   if(b.action==='recover'&&b.landingPose&&b.clock<.4){const p=b.clock/.4;ctx.globalAlpha=1-p;ring(e.x,e.y,22+p*65,10+p*27,null,'#efd394');}
   ctx.restore();
  },
 };
}
