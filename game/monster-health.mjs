export function mountMonsterHealthBars(canvas){
  const bars=new Map();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  return (enemies,transform,width,height,headHeight)=>{
    const active=new Set();
    for(const e of enemies){
      if(e.hp<=0)continue;
      const x=e.x*transform.a+e.y*transform.c+transform.e;
      const y=e.x*transform.b+(e.y-headHeight(e))*transform.d+transform.f-8;
      if(x<0||x>width||y<0||y>height)continue;
      active.add(e.id);
      let bar=bars.get(e.id);
      if(!bar){
        bar=document.createElement('div');
        bar.className='monster-health';bar.dataset.enemyId=e.id;
        bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','怪物生命');bar.setAttribute('aria-valuemin','0');
        bar.innerHTML='<i></i><span></span>';
        canvas.parentElement.append(bar);bars.set(e.id,bar);
      }
      bar.setAttribute('aria-valuemax',e.maxHp);bar.setAttribute('aria-valuenow',Math.max(0,Math.ceil(e.hp)));
      bar.firstElementChild.style.width=clamp(e.hp/e.maxHp*100,0,100)+'%';
      bar.lastElementChild.textContent=`${Math.max(0,Math.ceil(e.hp))} / ${e.maxHp}`;
      const half=bar.offsetWidth/2;
      bar.style.left=(canvas.offsetLeft+clamp(x,half+6,width-half-6))+'px';
      bar.style.top=(canvas.offsetTop+clamp(y,bar.offsetHeight+6,height-6))+'px';
    }
    for(const [id,bar] of bars)if(!active.has(id)){bar.remove();bars.delete(id);}
  };
}
