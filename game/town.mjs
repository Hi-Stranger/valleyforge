// Town-only navigation. Movement and arrival use the game's collision-aware pathfinder.
export function mountTownNavigation(shops,onNavigate){
  const nav=document.createElement('nav');nav.id='town-navigation';nav.hidden=true;
  nav.setAttribute('aria-label','城镇快捷导航');
  const positions={forge:'0%',weapon:'25%',armor:'50%',potion:'75%',goods:'100%'};
  const labels={forge:'锻造',weapon:'武器',armor:'防具',potion:'药铺',goods:'杂货'};
  for(const shop of shops){
    const button=document.createElement('button');button.type='button';button.dataset.shop=shop.id;
    button.innerHTML=`<span aria-hidden="true" style="--icon-position:${positions[shop.id]}"></span>${labels[shop.id]}`;
    button.setAttribute('aria-label',`自动前往${shop.name}`);
    button.setAttribute('aria-pressed',String(shop.id==='forge'));
    button.onclick=()=>{if(onNavigate(shop)!==false)for(const b of nav.children)b.setAttribute('aria-pressed',String(b===button));};
    nav.append(button);
  }
  document.querySelector('.world-panel').append(nav);
  return show=>{nav.hidden=!show;};
}
