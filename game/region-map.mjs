// Legacy local map and travel between the retained regions, without level gates.
export function mountRegionMap({body,minimapUrl,region,world,player,enemies=[],travel,walk,canTravel}){
  const names={town:'营地',meadow:'溪畔原野',mine:'废矿深窟'};
  const asset=region==='valley'?'minimap':region+'-minimap';
  body.innerHTML=`${canTravel?`<div class="modal-tabs">${Object.entries(names).map(([id,name])=>`<button data-travel="${id}" ${id===region?'disabled':''}>${name}</button>`).join('')}</div>`:''}<div class="map-full" style="aspect-ratio:${world.width}/${world.height};background-image:url('${minimapUrl||`./game/assets/${asset}.png`}')"><i class="map-point" style="left:${player.x/world.width*100}%;top:${player.y/world.height*100}%"></i></div><p class="map-note">点击地图自动前往；返回安全入口后可在营地、原野与废矿之间旅行。</p>`;
  body.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>travel(b.dataset.travel));
  for(const enemy of enemies.filter(e=>e.type==='boss')){
    const label=document.createElement('span');label.className='map-label';label.textContent=enemy.name;
    label.style.left=enemy.x/world.width*100+'%';label.style.top=enemy.y/world.height*100+'%';body.querySelector('.map-full').append(label);
  }
  body.querySelector('.map-full').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();walk((e.clientX-r.left)/r.width*world.width,(e.clientY-r.top)/r.height*world.height);};
}
