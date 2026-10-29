// Original flat sword effects from 4a64252, adapted to the current rendering API.
// Combat timing, movement, damage and cooldowns remain owned by the game.
export function createSwordVfx(){return {draw(ctx,effects,time,pass='front'){
  if(pass!=='front')return;
  for(const f of effects){
    if(f.id==='ghost'||f.id==='impact')continue;
    const p=Math.max(0,Math.min(1,1-f.life/f.max));
    ctx.save();ctx.translate(Math.round(f.x),Math.round(f.y-10));ctx.rotate(f.angle||0);
    ctx.globalAlpha=Math.min(1,f.life*5);ctx.strokeStyle='#69dfff';ctx.fillStyle='#d5ffff';ctx.lineWidth=2;
    if(f.id==='arc'){
      const r=f.radius*(.65+p*.4);ctx.beginPath();
      for(let i=0;i<=24;i++){const a=-f.halfAngle+i/24*f.halfAngle*2,x=Math.round(Math.cos(a)*r),y=Math.round(Math.sin(a)*r);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.lineWidth=9*(1-p)+2;ctx.stroke();ctx.strokeStyle='#edffff';ctx.lineWidth=3;ctx.stroke();
      for(let i=0;i<10;i++)ctx.fillRect(Math.round(Math.cos(i*1.7)*r*.9),Math.round(Math.sin(i*1.7)*r*.9),2,2);
    }
    if(f.id==='trail'){
      ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(f.radius,0);ctx.lineTo(-12,5);ctx.closePath();ctx.fill();ctx.stroke();
    }
    // Current gameplay emits a thrust marker in addition to per-frame trails.
    // Use it only in panel previews, which do not emit the gameplay trails.
    if(f.id==='thrust'&&!effects.some(e=>e.id==='trail')){
      ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(20+p*f.radius,0);ctx.lineTo(-12,5);ctx.closePath();ctx.fill();ctx.stroke();
    }
    if(f.id==='ring'||f.id==='burst'){
      ctx.rotate(time*.6);ctx.setLineDash([5,7]);ctx.beginPath();ctx.ellipse(0,0,f.radius,f.radius*.72,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.translate(f.id==='burst'?f.radius*(1-p):f.radius*.8,0);ctx.rotate(Math.PI/2);ctx.fillStyle='#52d4ff';ctx.fillRect(-3,-28,6,31);ctx.fillStyle='#e7ffff';ctx.fillRect(-1,-32,2,36);ctx.fillRect(-8,0,16,3);ctx.restore();}
      if(f.id==='burst'){ctx.beginPath();ctx.moveTo(-f.radius*(1-p),0);ctx.lineTo(f.radius*(1-p),0);ctx.moveTo(0,-f.radius*(1-p));ctx.lineTo(0,f.radius*(1-p));ctx.stroke();}
    }
    ctx.restore();
  }
}};}
