// Local map navigation; region travel is handled by the scene's exit arrows.
export function mountRegionMap({body,minimapUrl,region,world,player,enemies=[],walk}){
  const asset=region==='valley'?'minimap':region+'-minimap';
  body.innerHTML=`<div class="map-full" style="aspect-ratio:${world.width}/${world.height};background-image:url('${minimapUrl||`./game/assets/${asset}.png`}')"><i class="map-point" style="left:${player.x/world.width*100}%;top:${player.y/world.height*100}%"></i></div><p class="map-note">点击地图自动前往；切换区域请点击场景中的出口箭头，人物到达出口后自动前往目的地。</p>`;
  for(const enemy of enemies.filter(e=>e.type==='boss')){
    const label=document.createElement('span');label.className='map-label';label.textContent=enemy.name;
    label.style.left=enemy.x/world.width*100+'%';label.style.top=enemy.y/world.height*100+'%';body.querySelector('.map-full').append(label);
  }
  body.querySelector('.map-full').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();walk((e.clientX-r.left)/r.width*world.width,(e.clientY-r.top)/r.height*world.height);};
}
