// iPhone browsers may have no element fullscreen API. Keep an actionable entry.
export function mountFullscreen({onHelp=()=>{}}={}){
  const root=document.documentElement;
  const buttons=[...document.querySelectorAll('[data-fullscreen]')];
  const standalone=window.matchMedia('(display-mode: standalone)');
  const fullscreen=window.matchMedia('(display-mode: fullscreen)');
  const installed=()=>navigator.standalone===true||standalone.matches||fullscreen.matches;
  const active=()=>document.fullscreenElement||document.webkitFullscreenElement;
  const request=()=>root.requestFullscreen||root.webkitRequestFullscreen;
  const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const dialog=document.createElement('dialog');
  dialog.id='fullscreen-help';
  dialog.setAttribute('aria-labelledby','fullscreen-help-title');
  dialog.innerHTML=`<h2 id="fullscreen-help-title">${apple?'iPhone / iPad 全屏游玩':'当前浏览器无法开启全屏'}</h2>${apple?'<p>如果浏览器不能直接全屏，可从主屏幕打开游戏，隐藏地址栏和浏览器工具栏。</p><ol><li>用 Safari 打开当前游戏网址。</li><li>点击“分享”，选择“添加到主屏幕”。</li><li>如有“作为网页 App 打开”选项，请开启，再点“添加”。</li><li>回到主屏幕，点击游戏图标，横握手机游玩。</li></ol><p class="fullscreen-note">主屏幕版本的存档可能与浏览器分开保存。</p>':'<p>请在独立浏览器页面中打开游戏，允许全屏后重试。也可以继续横屏游玩。</p>'}<form method="dialog"><button class="primary">知道了</button></form>`;
  document.body.append(dialog);
  // Keep game keyboard shortcuts from handling keys while the guide is open.
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  function sync(){
    const label=active()?'退出全屏':installed()?'已全屏启动':'全屏显示';
    for(const button of buttons){
      button.hidden=false;
      button.disabled=installed()&&!active();
      button.setAttribute('aria-label',label);
      button.title=label;
      if(button.id==='fullscreen-shortcut')button.innerHTML=`⛶ <span>${label}</span>`;
      else button.textContent=label;
    }
  }
  function help(){onHelp();if(!dialog.open)dialog.showModal();}
  async function toggle(){
    try{
      if(active()){
        const exit=document.fullscreenElement?document.exitFullscreen:document.webkitExitFullscreen;
        if(!exit){help();return;}
        await exit.call(document);
      }else if(!installed()){
        const enter=request();
        if(!enter){help();return;}
        // Call directly in the click handler to preserve user activation.
        if(enter===root.requestFullscreen)await enter.call(root,{navigationUI:'hide'});
        else await enter.call(root);
      }
    }catch{help();}
    sync();
  }
  for(const button of buttons)button.addEventListener('click',toggle);
  for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,sync);
  standalone.addEventListener('change',sync);
  fullscreen.addEventListener('change',sync);
  sync();
}
