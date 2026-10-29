// Measure the unscaled card so viewport and content changes never compound scaling.
export function mountPanelFit(){
  const covers=[...document.querySelectorAll('.screen-cover')];
  function fit(){
    for(const cover of covers){
      if(cover.hidden)continue;
      const card=cover.firstElementChild;
      if(!card)continue;
      const style=getComputedStyle(cover);
      const width=cover.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      const height=cover.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
      if(!card.offsetWidth||!card.offsetHeight)continue;
      const scale=Math.max(0,Math.min(1,width/card.offsetWidth,height/card.offsetHeight));
      card.style.setProperty('--panel-scale',String(scale));
    }
  }
  const resize=new ResizeObserver(fit);
  const mutations=new MutationObserver(fit);
  for(const cover of covers){
    resize.observe(cover);
    if(cover.firstElementChild)resize.observe(cover.firstElementChild);
    mutations.observe(cover,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true});
  }
  window.visualViewport?.addEventListener('resize',fit);
  document.fonts.ready.then(fit);
  fit();
}
