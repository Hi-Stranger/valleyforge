import {SWORD_SKILLS} from './sword-skills.mjs';
import {createSwordVfx} from './sword-vfx.mjs';

const DETAILS={
  triple:{tags:['三段追击','末段打断'],damage:'三段：攻击力 × 1 / 1 / 1.5',desc:'连续挥出三段剑光，逐段向前追击，最后一击可打断敌人蓄力。'},
  dash:{tags:['直线突进','短暂无敌'],damage:'伤害：攻击力 × 2.3',desc:'朝出招方向快速突进，命中路径内敌人；同一次突刺不会重复命中同一目标。'},
  crescent:{tags:['扇形剑气','打断蓄力'],damage:'伤害：攻击力 × 3.2',desc:'向前挥出大范围扇形剑气，命中时打断敌人的蓄力攻击。'},
  storm:{tags:['范围牵引','终结爆发'],damage:'五次：攻击力 × 0.7；终结：× 4',desc:'布下剑阵，牵引附近敌人。幻剑连续攻击五次，最后交叉斩击；落阵后可继续移动和出招。'},
};
function skillIcon(id){const swords='<path d="M16 8 8 35M27 7 18 35M38 9 28 35" stroke="#55c9f7" stroke-width="6"/><path d="M17 7 8 34M28 6 18 34M39 8 28 34" stroke="#ecffff" stroke-width="2"/>';
  const art={triple:swords,dash:'<path d="m7 31 17-15-2 9L42 15 27 36l1-11-15 12Z" fill="#e1ffff"/><path d="M4 17h13M2 23h9M5 39h15" stroke="#53cef3" stroke-width="2"/>',crescent:'<path d="M12 5C44 10 48 34 11 43 29 31 32 19 12 5Z" fill="#49b8ed"/><path d="M17 7C45 16 43 33 14 41 34 29 34 19 17 7Z" fill="#e6ffff"/><path d="M6 14h4M5 34h4" stroke="#9cf2ff" stroke-width="2"/>',storm:'<path d="M24 4v33M8 12l11 24M40 12 29 36" stroke="#57c9f6" stroke-width="6"/><path d="M24 3v32M8 11l11 24M40 11 29 35M17 30h14M7 29l10-4M31 25l10 4" stroke="#eaffff" stroke-width="2"/><path d="m24 36 4 5-4 4-4-4Z" fill="#f5d18c"/>'};
  return `<svg viewBox="0 0 48 48" aria-hidden="true" shape-rendering="geometricPrecision">${art[id]}</svg>`;
}
export function mountCharacterPanel({body,state,st,gear,slots,icon,world,atlas,ground,tab,selected,onTab,onSelect,onEquipment}){
  const weapon=gear[state.equipped.weapon],charm=gear[state.equipped.charm];
  const tabs=`<div class="profile-tabs" role="tablist" aria-label="人物档案分页"><button role="tab" data-profile-tab="attributes" aria-selected="${tab==='attributes'}">人物属性</button><button role="tab" data-profile-tab="skills" aria-selected="${tab==='skills'}">技能介绍</button></div>`;
  const rule='<p class="profile-rule">✦ 每次战斗结束，所有技能冷却重置</p>';
  if(tab==='attributes'){
    body.innerHTML=tabs+`<div class="profile-attributes"><section class="profile-hero"><canvas id="profile-portrait" width="220" height="138" aria-label="当前角色与穿戴外观"></canvas><h3>旅人 <small>Lv.${state.level} · 溪谷冒险者</small></h3><div class="profile-equipment">${Object.entries(slots).map(([slot,name])=>{const g=gear[state.equipped[slot]];return `<button data-profile-equipment="${slot}" title="${g?.name||'尚未穿戴'}">${icon(g?.icon||(slot==='armor'?'armor':slot==='charm'?'charm':'sword'))}<small>${name}</small><span>${g?.name||'尚未穿戴'}</span></button>`;}).join('')}</div></section><section class="profile-stat-pane"><h3>基础属性</h3><dl class="profile-stats">${[['attack','攻击力',st.attack],['defense','防御力',st.defense],['hp','生命',`${Math.ceil(state.hp)} / ${st.maxHp}`],['cooldown','攻击间隔',`${st.cooldown.toFixed(2)} 秒`],['range','攻击范围',st.range]].map(([id,label,value])=>`<div><dt>${label}</dt><dd data-profile-stat="${id}">${value}</dd></div>`).join('')}</dl><p class="profile-effect"><b>武器特性</b><span>${weapon.desc}</span></p><p class="profile-effect"><b>饰品效果</b><span>${charm?.desc||'尚未穿戴饰品'}</span></p><p class="profile-note">属性随当前等级与装备实时变化 · 点击装备槽查看装备</p></section></div>`+rule;
    const canvas=body.querySelector('#profile-portrait'),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    const light=c.createRadialGradient(110,67,5,110,67,114);light.addColorStop(0,'#34463b');light.addColorStop(1,'#0b1917');c.fillStyle=light;c.fillRect(0,0,220,138);
    c.strokeStyle='#a58c4e38';for(const x of [26,194]){c.beginPath();c.moveTo(x,8);c.lineTo(x,113);c.stroke();}c.fillStyle='#13201b';c.beginPath();c.ellipse(110,124,61,12,0,0,Math.PI*2);c.fill();c.fillStyle='#3a4841';c.beginPath();c.ellipse(110,119,57,13,0,0,Math.PI*2);c.fill();c.strokeStyle='#9ba58b';c.stroke();c.strokeStyle='#56675a';c.beginPath();c.ellipse(110,117,46,8,0,0,Math.PI*2);c.stroke();
    const f=world.atlas[world.clips['player.idle.down'][0]],s=4.6;c.drawImage(atlas,f.x,f.y,f.w,f.h,110+f.ox*s,116+f.oy*s,f.w*s,f.h*s);
    if(state.equipped.armor==='leather'){c.fillStyle='#b78a59';c.fillRect(85,79,8,12);c.fillRect(127,79,8,12);}
    if(charm){c.fillStyle='#d8bbf1';c.fillRect(108,87,5,5);}
    c.save();c.translate(145,92);c.rotate(.55);c.fillStyle=state.equipped.weapon==='coreblade'?'#efd18b':'#d2e3dc';c.fillRect(-2,-32,5,35);c.fillStyle='#aa8859';c.fillRect(-8,1,17,4);c.fillRect(-2,4,5,10);if(state.equipped.weapon==='stonehammer'){c.fillStyle='#90a9a6';c.fillRect(-12,-35,26,17);}c.restore();
    body.querySelectorAll('[data-profile-equipment]').forEach(b=>b.onclick=onEquipment);
  }else{
    const def=SWORD_SKILLS[selected],detail=DETAILS[selected];
    body.innerHTML=tabs+`<div class="profile-skills"><div class="profile-skill-list" role="tablist" aria-label="剑技列表">${Object.entries(SWORD_SKILLS).map(([id,d])=>`<button data-profile-skill="${id}" role="tab" aria-selected="${id===selected}"><span class="profile-skill-icon">${skillIcon(id)}</span><span><b>${d.name}</b><small>快捷键 ${d.key.replace('Digit','')} · 体力 ${d.cost} · 冷却 ${d.cooldown} 秒</small></span></button>`).join('')}</div><section class="profile-skill-detail"><h3>${def.name}<span>${detail.tags.map(t=>`<i>${t}</i>`).join('')}</span></h3><div class="profile-stage"><canvas id="profile-skill-preview" width="380" height="135" aria-label="${def.name}动作演示"></canvas><span class="stage-caption">演武预览</span><span class="stage-live">● 循环演示</span></div><p class="profile-damage">${detail.damage}</p><p class="profile-description">${detail.desc}</p><p class="profile-note">电脑快捷键（主键盘 / 小键盘）：${def.key.replace('Digit','')} · 支持移动施放 · 闪避可取消出招<br>实际伤害受敌人护甲与装备效果影响</p></section></div>`+rule;
    body.querySelectorAll('[data-profile-skill]').forEach(b=>b.onclick=()=>onSelect(b.dataset.profileSkill));
  }
  body.querySelectorAll('[data-profile-tab]').forEach(b=>b.onclick=()=>onTab(b.dataset.profileTab));
  if(tab!=='skills')return null;
  const canvas=body.querySelector('#profile-skill-preview'),c=canvas.getContext('2d'),vfx=createSwordVfx(),start=performance.now()/1000;
  function sprite(clip,x,y,t,scale=1.65){const fs=world.clips[clip],f=world.atlas[fs[Math.floor(t*9)%fs.length]];c.drawImage(atlas,f.x,f.y,f.w,f.h,x+f.ox*scale,y+f.oy*scale,f.w*scale,f.h*scale);}
  return now=>{
    const age=(now-start)%3,u=age-.3,effects=[],pulse=(id,x,y,radius,life,max,extra={})=>{if(life>0&&life<=max)effects.push({id,x,y,radius,angle:0,life,max,...extra});};
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;const cover=Math.max(w/ground.width,h/ground.height);c.drawImage(ground,(w-ground.width*cover)/2,(h-ground.height*cover)/2,ground.width*cover,ground.height*cover);const zoom=h/(selected==='crescent'?380:selected==='storm'?370:290),cx=selected==='storm'?390:465;c.setTransform(zoom,0,0,zoom,w/2-cx*zoom,h*.58-270*zoom);
    let px=390,py=270;
    if(selected==='triple'){const beats=[.06,.25,.45];px+=beats.filter(b=>u>=b).length*13;for(const b of beats)pulse('arc',px,py,85,.36-(u-b),.36,{halfAngle:1.25});}
    if(selected==='dash'){px+=Math.max(0,Math.min(1,u/.32))*208;pulse('thrust',390,py,208,.32-u,.32);for(let i=1;i<=4;i++)if(u>i*.045&&u<i*.045+.24){c.globalAlpha=.15;sprite('player.attack.right',390+i*29,py,age);c.globalAlpha=1;}}
    if(selected==='crescent')pulse('arc',px,py,170,.36-(u-.16),.36,{halfAngle:1.4});
    if(selected==='storm'){pulse('ring',px,py,150,2.3-u,2.3);[.25,.55,.85,1.15,1.45,1.85].forEach((b,i)=>pulse('burst',px,py,150,(i===5?.5:.22)-(u-b),i===5?.5:.22,{final:i===5,strike:i+1}));}
    vfx.draw(c,effects,now,'ground');for(const [x,y] of [[500,270],[460,215],[510,310]])sprite('slime.idle',x,y,age,2.3);
    sprite(u>=0&&u<(selected==='storm'? .22:SWORD_SKILLS[selected].duration)?'player.attack.right':'player.idle.right',px,py,age,3.2);vfx.draw(c,effects,now,'front');c.setTransform(1,0,0,1,0,0);
  };
}
