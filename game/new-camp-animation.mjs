// Camp ambience is sampled from the game clock, so pause and scene freezes apply.
export function createNewCamp({ctx,world,visible}){
  const water=world.campAnimation?.water||[];
  const steam=world.campAnimation?.steam||[];
  const falls=world.campAnimation?.falls||[];
  const tau=Math.PI*2;
  function drawGround(time){
    const t=Math.floor(time*20)/20;
    for(const area of water){
      const points=area.points||[];
      if(points.length<3)continue;
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      if(!visible((left+right)/2,(top+bottom)/2,Math.max(right-left,bottom-top)))continue;
      ctx.save();ctx.beginPath();ctx.moveTo(...points[0]);
      for(const point of points.slice(1))ctx.lineTo(...point);
      ctx.closePath();ctx.clip();
      // Short highlights drift over the existing water instead of translating it.
      for(let i=0;i<26;i++){
        const x=left+((i*71+(t*10+i*13))%(right-left));
        const y=top+((i*43+Math.sin(t*.7+i)*2)%(bottom-top));
        const alpha=.07+.09*(.5+.5*Math.sin(t*1.6+i*2));
        ctx.globalAlpha=alpha;ctx.fillStyle=i%3?'#b6edeb':'#ecf7df';
        ctx.fillRect(Math.round(x),Math.round(y),8+(i%4)*4,2);
      }
      ctx.restore();
    }
  }
  function drawFalls(area,time){
    const points=area.points||[];if(points.length<3)return;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    if(right<=left||bottom<=top||!visible((left+right)/2,(top+bottom)/2,Math.max(right-left,bottom-top)))return;
    const t=Math.floor(time*20)/20;
    ctx.save();ctx.beginPath();ctx.moveTo(...points[0]);
    for(const point of points.slice(1))ctx.lineTo(...point);
    ctx.closePath();ctx.clip();
    for(let i=0;i<12;i++){
      const x=left+((i*13+5)%(right-left));
      const y=top+((i*19+t*(18+i%3*4))%(bottom-top));
      ctx.globalAlpha=.12+.08*(.5+.5*Math.sin(t*2+i));
      ctx.fillStyle=i%3?'#bdeaf0':'#effbf1';
      ctx.fillRect(Math.round(x),Math.round(y),2,5+i%3*3);
    }
    ctx.restore();
  }
  function drawSteam(source,time){
    if(!visible(source.x,source.y,120))return;
    const t=Math.floor(time*20)/20,chimney=source.kind==='chimney';
    ctx.save();
    for(let i=0;i<5;i++){
      const u=(t/(chimney?4:3)+i/5)%1;
      const x=source.x+Math.sin(u*4+i)*7+u*(chimney?9:3);
      const y=source.y-u*(chimney?82:48);
      const radius=(chimney?5:3)+u*(chimney?9:6);
      ctx.globalAlpha=Math.sin(Math.PI*u)*(chimney?.22:.26);
      ctx.fillStyle=chimney?'#d2d2bd':'#e9e0ba';
      ctx.beginPath();ctx.ellipse(x,y,radius,radius*.7,0,0,tau);ctx.fill();
    }
    ctx.restore();
  }
  function sceneEffects(time){return [...steam.map(source=>({depth:source.depth??source.y,draw:()=>drawSteam(source,time)})),...falls.map(area=>({depth:area.depth??world.height,draw:()=>drawFalls(area,time)}))];}
  return {drawGround,sceneEffects,drawObject:()=>false,drawFront:()=>{},snapshot:time=>({clock:time,waterAreas:water.length,steamSources:steam.length,fallsAreas:falls.length}),cacheBytes:()=>0,dispose(){}};
}
