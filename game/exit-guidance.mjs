// Exit markers share world coordinates with the pathfinding destination.
export function mountExitGuidance({container,point,side,destinations,onSelect}){
  const nav=document.createElement('nav');
  nav.id='exit-guidance';nav.hidden=true;nav.setAttribute('aria-label','出口目的地');
  const markers=destinations.map(([id,name],index)=>{
    const button=document.createElement('button');button.type='button';button.dataset.destination=id;
    button.className='exit-guide';button.setAttribute('aria-label',`前往${name}`);button.setAttribute('aria-pressed','false');
    button.innerHTML='<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M2 17L17 2H22V10H32V24H22V32H17Z" fill="#e6c475" stroke="#4c482a" stroke-width="2"/><path d="M6 17L19 5V13H29V20H19V28Z" fill="#ffe4a0"/></svg><span></span>';
    button.querySelector('span').textContent=name;
    const svg=button.querySelector('svg');svg.style.pointerEvents='none';
    svg.insertAdjacentHTML('beforeend','<g fill="none" stroke-linejoin="miter"><path class="exit-edge-flow" pathLength="100" d="M30 11H23V3H17L3 17" stroke="#fff1a1" stroke-width="1.5" stroke-dasharray="24 130" opacity="0"/><path class="exit-edge-flow" pathLength="100" d="M30 23H23V31H17L3 17" stroke="#ffd771" stroke-width="1.5" stroke-dasharray="24 130" opacity="0"/><path class="exit-tip-glint" d="M7 13L3 17L7 21" stroke="#fff4b4" stroke-width="1.8" opacity="0"/></g>');
    const edges=[...svg.querySelectorAll('.exit-edge-flow')],tip=svg.querySelector('.exit-tip-glint');
    button.onclick=()=>onSelect(id,name);nav.append(button);return {button,svg,edges,tip,delay:index*.65};
  });
  container.append(nav);
  return {
    show(visible){nav.hidden=!visible;},
    update({camera,zoom,width,height,selected,time=0}){
      const x=(point.x-camera.x)*zoom,y=(point.y-camera.y)*zoom;
      const groupHeight=markers.length*44+(markers.length-1)*18;
      const left=Math.max(12,Math.min(width-158,side==='left'?x-160:x+16));
      const top=Math.max(124,Math.min(height-groupHeight-18,y-100));
      nav.style.transform=`translate(${Math.round(left)}px,${Math.round(top)}px)`;
      const outside=x<0||x>width||y<0||y>height;
      const angle=outside?Math.atan2(y-height/2,x-width/2)-Math.PI:side==='left'?0:Math.PI;
      // The game clock freezes this loop on pause; only the arrow artwork moves.
      const pulse=(1-Math.cos(time*Math.PI*2/1.2))/2;
      const transform=`rotate(${angle}rad) translateX(${-6*pulse}px)`;
      for(const {button,svg,edges,tip,delay} of markers){
        svg.style.transform=transform;
        // Both contour highlights travel from the tail to the tip in local
        // arrow space, so rotation also rotates the flow direction.
        const phase=(time+delay)%2.4,progress=Math.min(1,phase/1.15);
        const offset=String(24-124*progress),opacity=phase<1.15?String(.8*Math.sin(Math.PI*progress)):'0';
        for(const edge of edges){edge.style.strokeDashoffset=offset;edge.style.opacity=opacity;}
        tip.style.opacity=String(Math.max(0,1-Math.abs(phase-1.13)/.15)*.85);
        button.setAttribute('aria-pressed',String(button.dataset.destination===selected));
      }
    },
    dispose(){nav.remove();}
  };
}
