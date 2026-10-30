import {mountTownNavigation} from './town.mjs?v=2026.10.30.14';
import {mountMonsterHealthBars} from './monster-health.mjs?v=2026.10.30.10';
import {mountFullscreen} from './fullscreen.mjs';
import {mountPanelFit} from './panel-fit.mjs?v=2026.10.30.4';
import {MATERIALS,GEAR,RECIPES,SLOT_NAMES,SAVE_KEY,newState,loadState,saveState,stats,addMaterials,materialTotal,canCraft,craft,equip,unequip,deposit,awardXp,die} from './core.mjs';
import {SWORD_SKILLS,inSwordSector,inSwordPath} from './sword-skills.mjs';
import {createSwordVfx} from './sword-vfx.mjs';
import {mountCharacterPanel} from './character-panel.mjs';
import {createMeadowFish} from './meadow-fish.mjs';
import {createMeadowRipples} from './meadow-ripples.mjs';
import {drawTerrainTiles} from './terrain-tiles.mjs?v=2';
import {BOAR_ACTIONS,createBoarKing,enrageBoarKing,interruptBoarKing,updateBoarKing} from './boar-king.mjs?v=2026.10.30.10';
import {loadBoarKingArt} from './boar-king-art.mjs?v=2026.10.30.10';

const $=s=>document.querySelector(s),canvas=$('#world'),ctx=canvas.getContext('2d',{alpha:false});
const updateMonsterHealthBars=mountMonsterHealthBars(canvas);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Update this build number for each published game update.
const GAME_VERSION='2026.10.30.14';
const QA=new URLSearchParams(location.search).has('qa');
// Town is the safe starting hub; the meadow remains an independent encounter map.
const TOWN=new URLSearchParams(location.search).get('region')==='town'||!new URLSearchParams(location.search).has('region');
let townAtlas,showTownNavigation=()=>{},shopFilter=null;
const MINE=false;
const MEADOW=!TOWN,FIELD=true;
const meadowGateway={x:2420,y:1200};
const gateway=MEADOW?{x:245,y:835}:MINE?{x:380,y:2470}:{x:2260,y:1190};
let world,ground,atlas,mini,boarKingArt,bossRandom=null,phase='loading',modal=null,bagTab='materials',last=0,time=0,accSave=0,uiClock=0,screenW=900,screenH=600,zoom=2;
let mode='exploration',encounter=null,encounterGrace=2;const arenaImages={};const mineSprites={};let mineAtlas,meadowAtlas,meadowFish,meadowRipples;
const ARENA={width:960,height:480,obstacles:[{x:105,y:101,w:38,h:24},{x:793,y:375,w:31,h:24}]};
let state;try{state=loadState(localStorage.getItem(SAVE_KEY));}catch{state=newState();}
const player={x:2384,y:1072,r:8,stamina:100,aim:Math.PI,dir:'down',moving:false,invuln:0,attack:0,attackCooldown:0,heavyCooldown:0,roll:0,rollCooldown:0,rollAngle:0,charmBuff:0,lastHurt:-100};
const camera={x:0,y:0};const keys=new Set();const mobileKeys=new Set();let pointer={down:false,active:false,x:0,y:0},swing=null,channel=0,screenShake=0,muted=true,audio=null,targetMarker=null,lastPickup='';
let walkPath=[];
const joystick={x:0,y:0,active:false,id:null,originX:0,originY:0};let attackPointer=null,orientationBlocked=false,queuedHeavy=0;
const swordVfx=createSwordVfx();
const skillCooldowns=Object.fromEntries(Object.keys(SWORD_SKILLS).map(id=>[id,0])),skillEffects=[];
let characterTab='attributes',characterSkill='crescent',characterPreview=null;
let frozenSceneKey=null,sceneDirty=true,previewRenderedAt=-1000;
let swordCast=null,queuedSword=null;const swordFields=[];const skillUses={triple:0,dash:0,crescent:0,storm:0};
const enemies=[],mapEnemies=[],loot=[],numbers=[],particles=[],nodes=[],respawns=[];let enemySequence=0;
const smith=FIELD?{x:-9999,y:-9999}:{x:2352,y:1073};const respawn=MEADOW?{x:245,y:835}:MINE?{x:380,y:2470}:{x:2384,y:1100};
const TYPES={
  slime:{name:'林地史莱姆',hp:26,attack:7,speed:43,range:27,aggro:170,xp:12,gold:4,r:10,scale:1.3,drop:{gel:2},delay:.6,color:'#acd886'},
  boar:{name:'荒野野猪',hp:42,attack:11,speed:68,range:29,aggro:175,xp:20,gold:7,r:10,scale:1.5,drop:{skin:2,fang:2},delay:.52,color:'#d69e8a'},
  skeleton:{name:'山地骷髅',hp:66,attack:13,speed:50,range:39,aggro:190,xp:30,gold:11,r:9,scale:1.6,drop:{bone:2,iron:2},delay:.64,color:'#d7dbc3'},
  elite:{name:'岩甲守卫',hp:190,attack:21,speed:45,range:48,aggro:190,xp:75,gold:35,r:15,scale:.65,armor:.35,drop:{crystal:3,iron:4,bone:3},delay:.85,color:'#dfb276'},
  boss:{name:'荒牙野猪王',hp:650,attack:26,speed:46,range:75,aggro:250,xp:220,gold:120,r:26,scale:1,armor:.2,drop:{core:1,crystal:4,iron:6,skin:5,fang:4},delay:.95,color:'#ecb875'},
};
const buckets=new Map();let blockRects=[];let cliffSet;
function bucketKey(x,y){return `${Math.floor(x/64)},${Math.floor(y/64)}`;}
function addObstacle(o){for(let y=Math.floor(o.y/64);y<=Math.floor((o.y+o.h)/64);y++)for(let x=Math.floor(o.x/64);x<=Math.floor((o.x+o.w)/64);x++){const k=`${x},${y}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);}}
function heightAt(x,y){return world.elevation[clamp(Math.floor(y/32),0,world.rows-1)*world.cols+clamp(Math.floor(x/32),0,world.cols-1)];}
function pointFree(x,y,r=8){if(mode==='battle')return x>=42+r&&x<=ARENA.width-42-r&&y>=74+r&&y<=ARENA.height-58-r&&!ARENA.obstacles.some(o=>Math.hypot(x-clamp(x,o.x,o.x+o.w),y-clamp(y,o.y,o.y+o.h))<r);
  if(x<18||y<18||x>world.width-18||y>world.height-18)return false;
  const key=`${Math.floor(x/32)},${Math.floor(y/32)}`;if(cliffSet.has(key))return false;
  const bx=Math.floor(x/64),by=Math.floor(y/64),seen=new Set();
  for(let iy=by-1;iy<=by+1;iy++)for(let ix=bx-1;ix<=bx+1;ix++)for(const o of buckets.get(`${ix},${iy}`)||[]){if(seen.has(o))continue;seen.add(o);
    const nx=clamp(x,o.x,o.x+o.w),ny=clamp(y,o.y,o.y+o.h);if((x-nx)**2+(y-ny)**2<r*r)return false;}
  return true;}
function transition(ax,ay,bx,by){if(mode==='battle')return true;const a=[Math.floor(ax/32),Math.floor(ay/32)],b=[Math.floor(bx/32),Math.floor(by/32)];
  const ha=heightAt(ax,ay),hb=heightAt(bx,by);if(ha===hb)return true;if(Math.abs(ha-hb)!==1||a[0]!==b[0])return false;
  return world.ramps.some(r=>Math.abs(a[0]-r.x)<=2&&Math.min(a[1],b[1])===r.y&&Math.abs(a[1]-b[1])===1);}
function move(entity,dx,dy){const r=entity.r||8;const oldx=entity.x,oldy=entity.y;
  if(pointFree(entity.x+dx,entity.y,r)&&transition(entity.x,entity.y,entity.x+dx,entity.y))entity.x+=dx;
  if(pointFree(entity.x,entity.y+dy,r)&&transition(entity.x,entity.y,entity.x,entity.y+dy))entity.y+=dy;
  return Math.hypot(entity.x-oldx,entity.y-oldy);}
function findFree(x,y,r=9){if(pointFree(x,y,r))return {x,y};for(let ring=1;ring<30;ring++)for(let i=0;i<ring*12;i++){let a=i*Math.PI*2/(ring*12),xx=x+Math.cos(a)*ring*12,yy=y+Math.sin(a)*ring*12;if(pointFree(xx,yy,r))return {x:xx,y:yy};}return {...respawn};}
function safeZone(x=player.x,y=player.y){return mode==='exploration'&&(TOWN||(FIELD?Math.hypot(x-gateway.x,y-gateway.y)<(MEADOW?100:140):x>1740&&y<1250));}
function buildCollision(){cliffSet=new Set(world.cliffs.map(p=>p.join(',')));blockRects=world.colliders.map(o=>({...o}));
  for(const o of blockRects)addObstacle(o);
  // Trunks, not foliage, are solid; original Tiled trees remain depth-sorted scenery.
  for(const [x,y,r] of world.trunks)addObstacle({x:x-r,y:y-r,w:r*2,h:r*2,kind:'Tree'});
  if(!FIELD)addObstacle({x:2114,y:778,w:76,h:72,kind:'Fountain'});
}
function pathTo(e,tx,ty,exact=false){const sx=Math.floor(e.x/32),sy=Math.floor(e.y/32),gx=Math.floor(tx/32),gy=Math.floor(ty/32);let open=[{x:sx,y:sy,g:0,f:0}],cost=new Map([[`${sx},${sy}`,0]]),prev=new Map(),end=null;
  for(let loops=0;open.length&&loops<(exact?world.cols*world.rows:550);loops++){open.sort((a,b)=>b.f-a.f);const p=open.pop();if(Math.abs(p.x-gx)+Math.abs(p.y-gy)<=(exact?0:1)){end=p;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let x=p.x+dx,y=p.y+dy;if(x<1||x>world.cols-2||y<1||y>world.rows-2)continue;const k=`${x},${y}`;
      if(!pointFree(x*32+16,y*32+16,e.r)||!transition(p.x*32+16,p.y*32+16,x*32+16,y*32+16))continue;
      const g=p.g+1;if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);prev.set(k,p);open.push({x,y,g,f:g+Math.abs(x-gx)+Math.abs(y-gy)});}}
  if(!end)return null;const result=[];while(end.x!==sx||end.y!==sy){result.unshift({x:end.x*32+16,y:end.y*32+16});end=prev.get(`${end.x},${end.y}`);if(!end)break;}return result;}
function enemySpawn(type,x,y,combat=false){const def=TYPES[type],p=findFree(x,y,def.r);const e={...def,id:++enemySequence,type,x:p.x,y:p.y,home:{...p},hp:def.hp,maxHp:def.hp,windup:0,cooldown:combat?.85:1,hit:0,stun:0,angle:0,path:[],pathTimer:0,wander:Math.random()*6,attackAnim:0};if(MEADOW&&type==='boss'&&combat)e.boar=createBoarKing();(combat?enemies:mapEnemies).push(e);return e;}
function spawnWorld(){
  if(TOWN)return;
  if(MEADOW){for(const e of world.spawns)enemySpawn(e.type,e.x,e.y);return;}
  if(MINE){TYPES.boss.name='熔岩石王';TYPES.elite.name='岩甲守卫';TYPES.skeleton.name='矿谷石灵';TYPES.boar.name='荒原野狼';for(const e of world.spawns)enemySpawn(e.type,e.x,e.y);for(const n of world.nodes)nodeSpawn(n.type,n.x,n.y);return;}
  for(const p of [[1700,1270],[1620,1160],[1230,1010],[1120,890],[1140,1120],[1020,1050],[1650,1470]])enemySpawn('slime',...p);
  for(const p of [[1000,1200],[1150,1310],[860,1350],[1060,1510],[1500,1520]])enemySpawn('boar',...p);
  for(const p of [[1060,730],[1000,680],[840,560],[680,520],[920,500],[800,420]])enemySpawn('skeleton',...p);
  enemySpawn('elite',1060,780);enemySpawn('boss',752,272);
  for(const [x,y] of [[1660,1190],[1200,980],[1080,1100],[960,1220],[1500,1530],[800,1280]])nodeSpawn('wood',x,y);
  for(const [x,y] of [[1040,660],[940,600],[820,500],[670,410]])nodeSpawn('iron',x,y);
  for(const [x,y] of [[800,320],[990,570]])nodeSpawn('crystal',x,y);
}
function nodeSpawn(type,x,y){const p=findFree(x,y,10);nodes.push({type,x:p.x,y:p.y,hits:0,max:type==='wood'?2:3,respawn:0});}
function toast(text,bad=false){const el=document.createElement('div');el.className='toast'+(bad?' bad':'');el.textContent=text;$('#toast-stack').append(el);while($('#toast-stack').children.length>4)$('#toast-stack').firstChild.remove();setTimeout(()=>el.remove(),3600);}
function persist(){const position=MEADOW?{...meadowGateway}:MINE?{x:2260,y:1190}:phase==='dead'?respawn:encounter?.returnPoint||player;try{localStorage.setItem(SAVE_KEY,saveState(state,position));$('#saved-label').textContent='已自动保存';setTimeout(()=>$('#saved-label').textContent='自动存档',1500);}catch{$('#saved-label').textContent='存档空间不可用';}}
function sound(f=240,d=.08,type='triangle',gain=.025){if(muted)return;audio??=new AudioContext();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),g=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(f,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(45,f*.55),audio.currentTime+d);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);osc.connect(g).connect(audio.destination);osc.start();osc.stop(audio.currentTime+d);}
function float(text,x,y,color='#f7ecc2'){numbers.push({text,x,y,color,life:1.05,max:1.05});}
function sparks(x,y,color='#c7b877',count=9){for(let i=0;i<count;i++)particles.push({x,y,dx:(Math.random()-.5)*95,dy:-Math.random()*80,life:.35+Math.random()*.25,color});}
function autoAim(){if(!pointer.touchAim||mode!=='battle'||!enemies.length)return;const target=enemies.reduce((a,b)=>distance(a,player)<distance(b,player)?a:b);player.aim=Math.atan2(target.y-player.y,target.x-player.x);}
function castSword(id){const def=SWORD_SKILLS[id];if(!def||mode!=='battle'||phase!=='playing'||modal||orientationBlocked)return false;
  if(skillCooldowns[id]>0){toast(`${def.name} · ${Math.ceil(skillCooldowns[id])} 秒后就绪`);return false;}
  if(player.stamina<def.cost){toast('体力不足，稍候再出招',true);return false;}
  if(swordCast||player.roll>0){queuedSword={id,touchAim:!!pointer.touchAim,ttl:.65};return true;}
  queuedSword=null;autoAim();queuedHeavy=0;swing=null;channel=0;player.attack=def.duration;player.attackCooldown=def.duration+.08;player.stamina-=def.cost;skillCooldowns[id]=def.cooldown;skillUses[id]++;
  swordCast={id,angle:player.aim,age:0,pulse:0,damage:stats(state).attack*(state.equipped.charm==='bonecharm'&&player.charmBuff>0?1.35:1),x:player.x,y:player.y,hit:new Set()};
  if(id==='dash'){player.invuln=Math.max(player.invuln,.24);skillEffects.push({id:'thrust',x:player.x,y:player.y,angle:player.aim,radius:208,life:.32,max:.32});}
  if(id==='storm'){swordFields.push({...swordCast});}
  if(id==='storm')skillEffects.push({id:'ring',x:player.x,y:player.y,angle:0,life:2.3,max:2.3,radius:150});
  float(def.name,player.x,player.y-48,'#b5f5ff');sound(id==='storm'?180:650,.15,'triangle');renderHUD();return true;
}
function swordPulse(c,radius,halfAngle,multiplier,heavy=false){skillEffects.push({id:'arc',x:player.x,y:player.y,angle:c.angle,radius,life:.36,max:.36,halfAngle});
  if(c.id==='triple'){const clip=world.clips[`player.attack.${player.dir}`];skillEffects.push({id:'ghost',x:player.x-12*Math.cos(c.angle),y:player.y-12*Math.sin(c.angle),frame:clip[(c.pulse-1)%clip.length],flip:Math.cos(c.angle)<-.65,life:.25,max:.25});sound(480+c.pulse*100,.06,'triangle',.015);}
  for(const e of [...enemies])if(inSwordSector(player,e,c.angle,radius,halfAngle)){hitEnemy(e,Math.round(c.damage*multiplier),heavy,true);if(phase!=='playing')break;}}
function updateSwordFields(dt){for(const c of [...swordFields]){c.age+=dt;
    for(const e of enemies)if((!e.boar||['idle','recover'].includes(e.boar.action))&&distance(e,c)<150&&distance(e,c)>35){const a=Math.atan2(c.y-e.y,c.x-e.x);move(e,Math.cos(a)*70*dt,Math.sin(a)*70*dt);}
    const beats=[.25,.55,.85,1.15,1.45,1.85];while(c.pulse<beats.length&&c.age>=beats[c.pulse]){const final=++c.pulse===6;
      skillEffects.push({id:'burst',x:c.x,y:c.y,angle:0,radius:150,final,strike:c.pulse,life:final?.5:.22,max:final?.5:.22});
      for(const e of [...enemies])if(distance(e,c)<=150+e.r){hitEnemy(e,Math.round(c.damage*(final?4:.7)),final,true);if(phase!=='playing')return;}
      if(final){screenShake=7;sound(110,.22,'triangle');}}
  
if(c.age>=2.1)swordFields.splice(swordFields.indexOf(c),1);}}
function updateSword(dt){for(const id of Object.keys(skillCooldowns))skillCooldowns[id]=Math.max(0,skillCooldowns[id]-dt);
  for(let i=skillEffects.length-1;i>=0;i--){skillEffects[i].life-=dt;if(skillEffects[i].life<=0)skillEffects.splice(i,1);}
  updateSwordFields(dt);if(phase!=='playing')return;
  if(queuedSword){queuedSword.ttl-=dt;if(queuedSword.ttl<=0)queuedSword=null;else if(!swordCast&&player.roll<=0){const q=queuedSword;queuedSword=null;pointer.touchAim=q.touchAim;castSword(q.id);}}
  const c=swordCast;if(!c)return;c.age+=dt;player.aim=c.angle;
  if(c.id==='triple'){const beats=[.06,.25,.45];while(c.pulse<3&&c.age>=beats[c.pulse]){move(player,Math.cos(c.angle)*13,Math.sin(c.angle)*13);c.pulse++;swordPulse(c,75+c.pulse*5,1.25,c.pulse===3?1.5:1,c.pulse===3);if(swordCast!==c)return;}}
  if(c.id==='dash'){const start={x:player.x,y:player.y};for(let i=0;i<6;i++)move(player,Math.cos(c.angle)*650*dt/6,Math.sin(c.angle)*650*dt/6);
    c.trailClock=(c.trailClock||0)+dt;if(c.trailClock>=.045){c.trailClock%=.045;const clip=world.clips[`player.attack.${player.dir}`];skillEffects.push({id:'trail',x:start.x,y:start.y,angle:c.angle,radius:distance(start,player)+28,life:.24,max:.24,frame:clip[Math.floor(c.age*12)%clip.length],flip:Math.cos(c.angle)<-.65});}
    for(const e of [...enemies])if(!c.hit.has(e.id)&&inSwordPath(start,player,e,22)){c.hit.add(e.id);hitEnemy(e,Math.round(c.damage*2.3),true,true);if(swordCast!==c)return;}}
  if(c.id==='crescent'&&c.age>=.16&&!c.pulse){c.pulse++;swordPulse(c,170,1.4,3.2,true);if(swordCast!==c)return;screenShake=5;}
  if(c.age>=SWORD_SKILLS[c.id].duration)swordCast=null;
}
function drawSwordEffects(pass='front'){if(!skillEffects.length)return;
  if(pass==='front')for(const f of skillEffects)if(f.id==='trail')drawFrame(f.frame,f.x,f.y,1.65,f.flip,Math.min(.4,f.life/f.max*.4));
  swordVfx.draw(ctx,skillEffects,time,pass);
}
function attack(heavy=false){if(mode!=='battle'||phase!=='playing'||modal||orientationBlocked||swordCast||player.roll>0)return;if(player.attackCooldown>0){if(heavy&&player.heavyCooldown<=0&&player.stamina>=20)queuedHeavy=.5;return;}if(heavy&&(player.heavyCooldown>0||player.stamina<20)){toast(player.heavyCooldown>0?'重斩尚未准备好':'体力不足',true);return;}
  if(heavy)queuedHeavy=0;autoAim();
  channel=0;const st=stats(state);player.attackCooldown=st.cooldown*(heavy?1.5:1);player.attack=.24;const bonus=state.equipped.charm==='bonecharm'&&player.charmBuff>0?1.35:1;
  swing={angle:player.aim,time:.24,delay:.075,range:st.range+(heavy?20:0),damage:Math.round(st.attack*(heavy?2.3:1)*bonus),heavy,hit:new Set(),nodeHits:new Set()};
  if(heavy){player.heavyCooldown=4.5;player.stamina-=20;}sound(heavy?130:340,.1,'triangle');}
function dodge(){if(phase!=='playing'||modal||orientationBlocked||player.rollCooldown>0||player.stamina<24)return;swordCast=null;queuedSword=null;swing=null;player.attack=0;player.attackCooldown=0;const d=movementVector();player.rollAngle=Math.hypot(d.x,d.y)?Math.atan2(d.y,d.x):player.aim;player.roll=.22;player.invuln=.28;player.rollCooldown=.7;player.stamina-=24;player.charmBuff=3;channel=0;sound(450,.08,'sine');}
function hitEnemy(e,damage,heavy,skill=false){let dealt=Math.max(1,Math.round(damage*(stats(state).breakArmor?1:1-(e.armor||0))));e.hp-=dealt;e.hit=.18;e.stun=heavy?.6:.11;if(heavy){e.windup=0;e.cooldown=Math.max(e.cooldown,.9);}float(dealt,e.x,e.y-30,heavy?'#f0c578':'#f1efd4');if(skill){const y=e.y-(e.type==='boss'?40:e.type==='elite'?27:12);skillEffects.push({id:'impact',x:e.x,y:y+10,angle:player.aim+.65,heavy,life:.22,max:.22});sparks(e.x,y,'#a1eeff',6);sparks(e.x,y,'#ffe1a1',4);}else sparks(e.x,e.y-12,e.color);if(heavy)screenShake=4;
  if(e.boar){enrageBoarKing(e);if(heavy&&interruptBoarKing(e))float('打断',e.x,e.y-98,'#b5f5ff');}
  if(state.equipped.weapon==='coreblade')state.hp=Math.min(stats(state).maxHp,state.hp+2);
  if(e.hp<=0)killEnemy(e);}
function encounterTheme(token){if(MEADOW)return 'forest';if(MINE)return ['boss','elite'].includes(token.type)?'cave':'mountain';if(token.type==='elite'||Math.hypot(token.x-1040,token.y-780)<130)return 'cave';return token.type==='boss'||heightAt(token.x,token.y)>0?'mountain':'forest';}
const THEME_NAMES={forest:'林地遭遇',mountain:'山地遭遇',cave:'岩洞遭遇'};
function resetJoystick(){joystick.x=joystick.y=0;joystick.active=false;joystick.id=null;$('#stick-knob').style.transform='translate(0px,0px)';$('#joystick').classList.remove('active');}
function releaseControls(keepWalk=false){if(!keepWalk)walkPath=[];queuedSword=null;queuedHeavy=0;keys.clear();mobileKeys.clear();pointer.down=false;pointer.active=false;pointer.touchAim=false;attackPointer=null;resetJoystick();}
function clearActions(){swordFields.length=0;swordCast=null;releaseControls();queuedHeavy=0;swing=null;channel=0;player.attack=0;player.roll=0;player.attackCooldown=0;player.charmBuff=0;screenShake=0;}
function restoreBattleSkills(){for(const id of Object.keys(skillCooldowns))skillCooldowns[id]=0;player.heavyCooldown=0;player.rollCooldown=0;player.attackCooldown=0;queuedSword=null;queuedHeavy=0;}
function beginEncounter(token){if(mode!=='exploration'||phase!=='playing'||encounter||encounterGrace>0)return;
  const theme=encounterTheme(token);encounter={token,theme,returnPoint:{x:player.x,y:player.y},worldLoot:loot.splice(0),entryTimer:.65,elapsed:0,settled:false,pending:{items:{},gold:0,xp:0,kills:{}}};
  clearActions();if(modal==='map')closeModal();skillEffects.length=0;numbers.length=0;particles.length=0;$('#toast-stack').replaceChildren();mode='battle';phase='entering';enemies.length=0;
  Object.assign(player,{x:token.type==='boss'?350:420,y:288,aim:0,dir:'right',stamina:100,invuln:.8,rollCooldown:0,heavyCooldown:0});
  enemySpawn(token.type,token.type==='boss'?640:540,288,true);$('#encounter-name').textContent=`${THEME_NAMES[theme]} · ${token.name}`;$('#encounter-cover').hidden=false;$('#interact-prompt').hidden=true;
  document.body.classList.add('in-battle');persist();renderUI();sound(220,.2,'triangle');}
function updateEntering(dt){time+=dt;encounter.entryTimer-=dt;if(encounter.entryTimer<=0){phase='playing';$('#encounter-cover').hidden=true;clearActions();renderUI();canvas.focus({preventScroll:true});toast('左侧任意空白处拖动走位 · 右侧攻击与技能 · 留意红色预兆');}}
function finishVictory(){if(!encounter||encounter.settled||enemies.length)return;
  encounter.settled=true;const reward=encounter.pending;
  addMaterials(state,reward.items);state.gold+=reward.gold;const levels=awardXp(state,reward.xp);
  for(const [type,n] of Object.entries(reward.kills))state.kills[type]+=n;
  const idx=mapEnemies.indexOf(encounter.token);if(idx>=0)mapEnemies.splice(idx,1);
  respawns.push({type:encounter.token.type,...encounter.token.home,after:0});
  clearActions();restoreBattleSkills();phase='victory';lastPickup=Object.entries(reward.items).map(([id,n])=>`${MATERIALS[id].name} +${n}`).join('  ');
  $('#victory-title').textContent=`击败 ${encounter.token.name} · ${Math.max(1,Math.round(encounter.elapsed))} 秒${levels?' · 升级！生命已恢复':''}`;
  $('#victory-rewards').innerHTML=`<div class="victory-totals"><span>金币 <b>+${reward.gold}</b></span><span>经验 <b>+${reward.xp}</b></span></div><div class="victory-materials">${Object.entries(reward.items).map(([id,n])=>`<div><img alt="" src="${materialIcon(id)}"><span>${MATERIALS[id].name}</span><b>×${n}</b></div>`).join('')}</div>`;
  $('#victory-cover').hidden=false;questCheck();persist();renderUI();sound(680,.3,'sine');}
function leaveEncounter({town=false,escaped=false}={}){const old=encounter;if(!old)return;clearActions();restoreBattleSkills();enemies.length=0;skillEffects.length=0;numbers.length=0;particles.length=0;loot.splice(0,loot.length,...old.worldLoot);
  mode='exploration';encounter=null;phase='playing';Object.assign(player,findFree(town?respawn.x:old.returnPoint.x,town?respawn.y:old.returnPoint.y,player.r));player.invuln=2;player.lastHurt=-100;encounterGrace=escaped?5:2;
  updateMonsterHealthBars([]);
  for(const r of respawns)enemySpawn(r.type,r.x,r.y);respawns.length=0;
  $('#victory-cover').hidden=true;$('#encounter-cover').hidden=true;$('#boss-bar').hidden=true;document.body.classList.remove('in-battle');
  if(escaped)toast('已脱离战斗，返回遇敌地点；没有获得战利品');else if(!town)toast('已返回遇敌地点，战利品已收入背包');persist();renderUI();}
function killEnemy(e){if(!encounter||mode!=='battle')return;const idx=enemies.indexOf(e);if(idx<0)return;enemies.splice(idx,1);
  const pending=encounter.pending;pending.gold+=e.gold;pending.xp+=e.xp;pending.kills[e.type]=(pending.kills[e.type]||0)+1;
  for(const [id,n] of Object.entries(e.drop))pending.items[id]=(pending.items[id]||0)+n;
  if(e.type==='skeleton'&&Math.random()<.2)pending.items.crystal=(pending.items.crystal||0)+1;
  sparks(e.x,e.y,e.color,18);sound(150,.12,'square',.014);if(!enemies.length)finishVictory();}
function hurtPlayer(n){if(mode!=='battle'||player.invuln>0||phase!=='playing')return;const amount=Math.max(1,Math.round(n-stats(state).defense));state.hp-=amount;player.invuln=.65;player.lastHurt=time;screenShake=5;channel=0;float('-'+amount,player.x,player.y-36,'#f2a28d');sound(100,.13,'sawtooth',.02);
  if(state.hp<=0){const lost=die(state);phase='dead';clearActions();restoreBattleSkills();skillEffects.length=0;const text=Object.entries(lost).map(([id,n])=>`${MATERIALS[id].name} ×${n}`).join('、');$('#death-text').textContent=(text?'遗失了 '+text+'。':'这次没有遗失材料。')+' 装备和仓库全部保留。';$('#death-cover').hidden=false;persist();}renderUI();}
function harvest(n){if(mode!=='exploration'||n.respawn>0)return;n.hits++;sparks(n.x,n.y-10,n.type==='wood'?'#c2a274':'#c0c9cf',6);sound(n.type==='wood'?185:560,.07,'square',.012);float(n.type==='wood'?'砍伐':'采掘',n.x,n.y-28,'#d2c89b');
  if(n.hits>=n.max){n.hits=0;n.respawn=55;const items=n.type==='wood'?{wood:4}:n.type==='iron'?{iron:3}:{crystal:2,iron:1};loot.push({x:n.x,y:n.y,items,age:0,key:n.type});}}
function heal(){if(phase!=='playing'||modal)return;if(!state.potions){toast('药水用完了，可以向铁匠购买',true);return;}if(state.hp>=stats(state).maxHp){toast('目前生命充足');return;}state.potions--;state.hp=Math.min(stats(state).maxHp,state.hp+55);float('+55',player.x,player.y-35,'#a9d49b');sound(700,.18,'sine');persist();renderUI();}
function returnTown(){if(phase!=='playing'||modal)return;if(safeZone()){rest();return;}if(time-player.lastHurt<3){toast(mode==='battle'?'受伤后需要等待片刻才能撤离':'稍后再返回原野入口',true);return;}channel=1.8;toast(mode==='battle'?'正在撤离战斗，移动或受伤会中断':'正在返回原野入口，移动会中断');}
function rest(){state.hp=stats(state).maxHp;player.stamina=100;toast('在小镇休整，生命与体力已恢复');persist();renderUI();}
function nearby(){if(mode!=='exploration')return null;if(TOWN){const shop=world.shops.find(s=>distance(player,s)<85);if(shop)return {kind:'shop',shop,text:shop.name+' · 交互'};if(distance(player,world.exit)<100)return {kind:'town-exit',text:'前往溪畔原野 · 交互'};return null;}if(MEADOW&&distance(player,gateway)<80)return {kind:'town-entry',text:'返回溪谷镇 · 交互'};if(distance(player,smith)<78)return {kind:'smith',text:'铁匠老铎 · 打造与补给'};let best=null;
  for(const n of nodes){let d=distance(n,player);if(!n.respawn&&d<58&&(!best||d<best.d))best={kind:'node',node:n,d,text:(n.type==='wood'?'枯木':n.type==='iron'?'铁矿脉':'晶矿')+' · 采集材料'};}
  return best;}
function travelRegion(region){persist();const url=new URL(location.href);url.searchParams.set('region',region);location.assign(url.href);}
function openTownShop(shop){shopFilter=['weapon','armor'].includes(shop.id)?shop.id:null;if(['forge','weapon','armor'].includes(shop.id)){openModal('forge');return;}openModal(shop.id==='potion'?'pharmacy':'goods');}
function interact(){if(phase!=='playing'||modal||mode!=='exploration')return;const near=nearby();if(near?.kind==='shop'){openTownShop(near.shop);return;}if(near?.kind==='town-exit'){travelRegion('meadow');return;}if(near?.kind==='town-entry'){travelRegion('town');return;}if(near?.kind==='smith'){openModal('forge');return;}if(near?.kind==='node'){harvest(near.node);return;}if(safeZone()){rest();return;}toast('靠近铁匠或采集点按 E；靠近怪物会自动进入战斗');}
function walkSegment(a,b){let previous=a;const steps=Math.max(1,Math.ceil(distance(a,b)/4));for(let i=1;i<=steps;i++){const next={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};if(!pointFree(next.x,next.y,player.r)||!transition(previous.x,previous.y,next.x,next.y))return false;previous=next;}return true;}
function setWalkTarget(x,y){const goal=findFree(x,y,player.r);walkPath=[];if(walkSegment(player,goal))walkPath=[goal];else{const route=pathTo(player,goal.x,goal.y,true);if(route?.length&&walkSegment(player,route[0])){walkPath=route;if(walkSegment(route.at(-1),goal))walkPath.push(goal);}}if(!walkPath.length){toast('这里暂时无法到达，请点击附近道路');return;}pointer.active=false;channel=0;}
function explorationVector(dt){const manual=movementVector();if(manual.x||manual.y){walkPath=[];return manual;}while(walkPath.length&&distance(player,walkPath[0])<2)walkPath.shift();if(!walkPath.length)return {x:0,y:0};const target=walkPath[0],length=distance(player,target),scale=Math.min(1,length/(145*dt));if(!walkSegment(player,target)){walkPath=[];return {x:0,y:0};}return {x:(target.x-player.x)/length*scale,y:(target.y-player.y)/length*scale};}
function movementVector(){if(joystick.active)return Math.hypot(joystick.x,joystick.y)>.12?{x:joystick.x,y:joystick.y}:{x:0,y:0};let x=0,y=0;if(keys.has('KeyW')||keys.has('ArrowUp')||mobileKeys.has('up'))y--;if(keys.has('KeyS')||keys.has('ArrowDown')||mobileKeys.has('down'))y++;if(keys.has('KeyA')||keys.has('ArrowLeft')||mobileKeys.has('left'))x--;if(keys.has('KeyD')||keys.has('ArrowRight')||mobileKeys.has('right'))x++;let len=Math.hypot(x,y);return len?{x:x/len,y:y/len}:{x:0,y:0};}
function updateExploration(dt){encounterGrace=Math.max(0,encounterGrace-dt);
  for(const e of mapEnemies){e.wander+=dt;e.moving=false;let target=distance(e,e.home)>28?e.home:Math.sin(e.wander*.7)>.6?{x:e.home.x+Math.cos(e.wander*.25)*20,y:e.home.y+Math.sin(e.wander*.3)*20}:null;
    if(target){const dist=distance(e,target);
      // Separate arrival and restart distances prevent tiny target changes from toggling the pose.
      if(dist<=1+1e-6)e.patrolStopped=true;
      else if(dist>3)e.patrolStopped=false;
      const step=e.patrolStopped?0:Math.min(13*dt,Math.max(0,dist-1));
      if(step>.01){const angle=Math.atan2(target.y-e.y,target.x-e.x);e.moving=move(e,Math.cos(angle)*step,Math.sin(angle)*step)>.01;if(e.moving)e.angle=angle;if(distance(e,target)<=1+1e-6)e.patrolStopped=true;}}
    if(encounterGrace>0||safeZone()||distance(e,player)>48+e.r||heightAt(e.x,e.y)!==heightAt(player.x,player.y))continue;
    let reachable=true,previous={x:player.x,y:player.y};
    for(let i=1;i<=8;i++){const x=player.x+(e.x-player.x)*i/8,y=player.y+(e.y-player.y)*i/8;
      if(!pointFree(x,y,2)||!transition(previous.x,previous.y,x,y)){reachable=false;break;}previous={x,y};}
    if(reachable){beginEncounter(e);return;}}
}
function update(dt){time+=dt;state.playtime+=dt;player.invuln=Math.max(0,player.invuln-dt);player.attackCooldown=Math.max(0,player.attackCooldown-dt);player.attack=Math.max(0,player.attack-dt);player.heavyCooldown=Math.max(0,player.heavyCooldown-dt);player.rollCooldown=Math.max(0,player.rollCooldown-dt);player.charmBuff=Math.max(0,player.charmBuff-dt);
  if(encounter)encounter.elapsed+=dt;
  const d=mode==='exploration'?explorationVector(dt):movementVector();player.moving=!!(d.x||d.y);if(player.moving){channel=0;if(!pointer.active)player.aim=Math.atan2(d.y,d.x);}
  if(pointer.touchAim&&(pointer.down||player.attack>0))autoAim();
  if(pointer.active)player.aim=Math.atan2(pointer.y/zoom+camera.y-player.y,pointer.x/zoom+camera.x-player.x);
  if(player.roll>0){player.roll-=dt;move(player,Math.cos(player.rollAngle)*405*dt,Math.sin(player.rollAngle)*405*dt);if(Math.random()<.5)sparks(player.x,player.y,'#bdc9a0',1);}else{const speed=swordCast?.id==='dash'?0:145;move(player,d.x*speed*dt,d.y*speed*dt);player.stamina=Math.min(100,player.stamina+24*dt);}
  player.dir=Math.abs(Math.cos(player.aim))>.65?'right':Math.sin(player.aim)>0?'down':'up';
  updateSword(dt);if(phase!=='playing')return;
  if(queuedHeavy>0){queuedHeavy=Math.max(0,queuedHeavy-dt);if(player.attackCooldown<=0)attack(true);}
  if((pointer.down||keys.has('KeyJ'))&&queuedHeavy<=0)attack();
  if(channel>0){channel-=dt;if(channel<=0){if(mode==='battle'){leaveEncounter({escaped:true});return;}Object.assign(player,findFree(respawn.x,respawn.y));state.hp=stats(state).maxHp;player.stamina=100;encounterGrace=2;toast('已回到原野入口，生命恢复');persist();}}
  if(mode==='exploration'){updateExploration(dt);if(mode==='battle')return;}
  if(swing){swing.time-=dt;swing.delay-=dt;if(swing.delay<=0){for(const e of [...enemies]){if(!swing.hit.has(e.id)&&distance(e,player)<swing.range+e.r&&Math.abs(angleDiff(Math.atan2(e.y-player.y,e.x-player.x),swing.angle))<1.45){swing.hit.add(e.id);hitEnemy(e,swing.damage,swing.heavy);if(phase!=='playing')return;}}}
    if(swing.time<=0)swing=null;}
  if(mode==='exploration')for(const n of nodes)if(n.respawn>0)n.respawn=Math.max(0,n.respawn-dt);
  for(const e of enemies){e.hit=Math.max(0,e.hit-dt);e.stun=Math.max(0,e.stun-dt);e.cooldown-=dt;e.attackAnim=Math.max(0,e.attackAnim-dt);const dist=distance(e,player);e.moving=false;
    if(e.boar){updateBoarKing(e,dt,{player,move,findFree,damage:hurtPlayer,random:bossRandom||Math.random,emit:(kind,boss)=>{if(kind==='stomp'||kind==='pounceImpact'||kind==='chargeImpact'){sparks(boss.x,boss.y,'#d6bc87',kind==='stomp'?8:20);screenShake=kind==='stomp'?2:5;sound(kind==='stomp'?100:80,.12,'triangle');}else if(kind==='roarImpact'){sound(85,.3,'sawtooth',.035);screenShake=3;}else if(['roar','pounce','chargeWindup'].includes(kind))float(BOAR_ACTIONS[kind],boss.x,boss.y+23,'#f3d395');}});if(phase!=='playing')return;continue;}
    if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.attackAnim=.35;e.cooldown=e.type==='boss'?1.4:1.2;if(dist<e.range+player.r+12&&!safeZone())hurtPlayer(e.attack);if(e.type==='boss')sparks(e.x,e.y,'#d6ab75',24);}continue;}
    if(e.stun>0)continue;
    const chase=mode==='battle';
    if(chase&&dist<e.range+8&&e.cooldown<=0){e.windup=e.delay;e.angle=Math.atan2(player.y-e.y,player.x-e.x);continue;}
    let target=null;if(chase){if(dist>e.range*.75){e.pathTimer-=dt;if(e.pathTimer<=0){e.path=pathTo(e,player.x,player.y)||[];e.pathTimer=.7+Math.random()*.4;}target=e.path[0]||player;if(target!==player&&distance(e,target)<10){e.path.shift();target=e.path[0]||player;}}}
    else if(distance(e,e.home)>45)target=e.home;
    else{e.wander+=dt;if(Math.sin(e.wander*.9)>.7)target={x:e.home.x+Math.cos(e.wander*.3)*30,y:e.home.y+Math.sin(e.wander*.4)*30};}
    if(target){const a=Math.atan2(target.y-e.y,target.x-e.x);e.angle=a;const speed=e.speed*(chase?1:.48);e.moving=move(e,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt)>0.1;}}
  for(let i=loot.length-1;i>=0;i--){const item=loot[i];item.age+=dt;const d=distance(item,player);if(d<105){let a=Math.atan2(player.y-item.y,player.x-item.x);item.x+=Math.cos(a)*Math.min(d,260*dt);item.y+=Math.sin(a)*Math.min(d,260*dt);}if(d<20){addMaterials(state,item.items);lastPickup=Object.entries(item.items).map(([id,n])=>`${MATERIALS[id].name} +${n}`).join('  ');toast(lastPickup);loot.splice(i,1);sound(680,.06,'sine');questCheck();persist();renderUI();}}
  for(let i=numbers.length-1;i>=0;i--){numbers[i].life-=dt;numbers[i].y-=22*dt;if(numbers[i].life<=0)numbers.splice(i,1);}
  for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;p.dy+=150*dt;if(p.life<=0)particles.splice(i,1);}
  screenShake=Math.max(0,screenShake-dt*25);accSave+=dt;uiClock+=dt;if(accSave>8){accSave=0;persist();}if(uiClock>.12){uiClock=0;renderHUD();}
  const near=nearby();$('#interact-prompt').hidden=!near;if(near)$('#interact-prompt span').textContent=near.text;
}

function drawFrame(key,x,y,scale=1,flip=false,alpha=1,scaleY=scale){const f=world.atlas[key];if(!f)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(key.startsWith('town:')?townAtlas:key.startsWith('meadow:')?meadowAtlas:MINE&&key.startsWith('mine:')?mineAtlas:atlas,f.x,f.y,f.w,f.h,Math.round(f.ox*scale),Math.round(f.oy*scaleY),Math.round(f.w*scale),Math.round(f.h*scaleY));ctx.restore();}
function drawClip(name,x,y,scale,flip=false,speed=8){const frames=world.clips[name]||world.clips['player.idle.down'];drawFrame(frames[Math.floor(time*speed)%frames.length],x,y,scale,flip);}
function visible(x,y,pad=120){return x>camera.x-pad&&x<camera.x+screenW/zoom+pad&&y>camera.y-pad&&y<camera.y+screenH/zoom+pad;}
function shadow(x,y,rx=10){ctx.fillStyle='#112c214b';ctx.beginPath();ctx.ellipse(x,y+1,rx,rx*.38,0,0,Math.PI*2);ctx.fill();}
function worldText(text,x,y,color='#fff0c7',size=9){ctx.font=`${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#18271bd9';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
function sceneVisible(o){const f=world.atlas[o.frames[0].key],left=o.x+f.ox*o.scale,top=o.y+f.oy*(o.scaleY||o.scale);return left+f.w*o.scale>camera.x&&left<camera.x+screenW/zoom&&top+f.h*(o.scaleY||o.scale)>camera.y&&top<camera.y+screenH/zoom;}
function sceneObject(o){if(!sceneVisible(o))return;let total=o.frames.reduce((a,f)=>a+f.ms,0),clock=(time*1000+(o.x*13+o.y*7))%total,f=o.frames[0];for(const frame of o.frames){clock-=frame.ms;if(clock<0){f=frame;break;}}
  const box=world.atlas[f.key],left=o.x+box.ox*o.scale,top=o.y+box.oy*(o.scaleY||o.scale);
  const fade=o.depth>player.y&&player.x>left-8&&player.x<left+box.w*o.scale+8&&player.y-15>top&&player.y-15<top+box.h*(o.scaleY||o.scale);
  if(o.rotation){ctx.save();ctx.translate(o.x,o.y+box.h*(o.scaleY||o.scale));ctx.rotate(o.rotation*Math.PI/180);drawFrame(f.key,0,-box.h*(o.scaleY||o.scale),o.scale,false,fade?.38:1,o.scaleY||o.scale);ctx.restore();}else drawFrame(f.key,o.x,o.y,o.scale,false,fade?.38:1,o.scaleY||o.scale);}
// Exploration multipliers relative to the original sizes; battles keep original sizes.
const ACTOR_SCALE={
  get player(){return mode==='battle'?1:TOWN?2.5:1.75;},
  get slime(){return mode==='battle'?1:1.5;},
  get boar(){return mode==='battle'?1:1.4;},
};
function drawMeadowActor(name,x,y,flip=false,animate=true){const frames=world.meadowClips[name];if(!frames)return;drawFrame(frames[animate?Math.floor(time*(name==='slime'?4:7))%frames.length:0],x,y,ACTOR_SCALE[name]||1,flip);}
function terrainView(){return {x:camera.x,y:camera.y,width:screenW/zoom,height:screenH/zoom};}
function drawMeadowTerrain(){const view=terrainView();drawTerrainTiles(ctx,meadowAtlas,world,view);meadowRipples?.draw(ctx,time,view);meadowFish?.draw(ctx,time,view);for(const o of world.groundObjects)sceneObject(o);}
function drawMineTiles(){drawTerrainTiles(ctx,mineAtlas,world,terrainView());for(const o of world.groundObjects)sceneObject(o);}
function drawMineCreature(e){if(!MINE)return false;const sprite=mineSprites[e.type==='boar'?'wolf':'golem'];if(!sprite)return false;const h=e.type==='boss'?165:e.type==='elite'?95:e.type==='boar'?55:62,w=h*sprite.w/sprite.h;const bob=e.moving?Math.sin(time*8+e.id)*1.5:Math.sin(time*2+e.id)*.4;ctx.save();ctx.translate(e.x,e.y);if(Math.cos(e.angle)<-.65)ctx.scale(-1,1);if(e.attackAnim>0)ctx.rotate(Math.sin(e.attackAnim*9)*.08);ctx.drawImage(sprite.im,sprite.x,sprite.y,sprite.w,sprite.h,-w/2,-h+bob,w,h);ctx.restore();return true;}
function drawBoarKing(e,exploration=false){shadow(e.x,e.y,Math.max(16,35-(e.boar?.height||0)*.2));boarKingArt.draw(ctx,e,time,exploration);if(exploration){worldText(e.name,e.x,e.y-113,'#f2cd8d',9);if(distance(e,player)<150)worldText('靠近进入首领战',e.x,e.y+19,'#e7c99d',8);}else if(e.boar.action==='recover')worldText('收势 · 可以反击',e.x,e.y+23,'#bce4c7',8);}
function positionBossBar(){const bar=$('#boss-bar'),boss=mode==='battle'&&enemies.find(e=>e.boar);if(!boss){bar.hidden=true;return;}const transform=ctx.getTransform(),x=boss.x*transform.a+boss.y*transform.c+transform.e,y=boss.x*transform.b+(boss.y-(boss.boar.height||0)-101)*transform.d+transform.f+13;bar.hidden=x<-80||x>screenW+80||y<-160||y>screenH+80;if(bar.hidden)return;const half=bar.offsetWidth/2,height=bar.offsetHeight;bar.style.left=(canvas.offsetLeft+clamp(x,half+6,screenW-half-6))+'px';bar.style.top=(canvas.offsetTop+clamp(y,height+6,screenH-6))+'px';}
function drawEnemy(e){if(e.boar){drawBoarKing(e);return;}shadow(e.x,e.y,e.r);if(e.windup>0){let progress=1-e.windup/e.delay;ctx.save();ctx.fillStyle=`rgba(194,70,43,${.1+progress*.22})`;ctx.strokeStyle='#df9470';ctx.lineWidth=1;ctx.beginPath();if(e.type==='boss'){ctx.arc(e.x,e.y,e.range+8,0,Math.PI*2);}else{ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,e.range+12,e.angle-.7,e.angle+.7);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  const a=e.attackAnim||e.windup?'attack':e.moving?'walk':'idle',dir=Math.abs(Math.cos(e.angle))>.65?'right':Math.sin(e.angle)>0?'down':'up';let clip=e.type==='skeleton'?`skeleton.${a}.${dir}`:e.type==='boar'?'boar.walk':`${e.type}.${a}`;
  if(MEADOW)drawMeadowActor(e.type,e.x,e.y,Math.cos(e.angle)<-.65,e.moving||e.type==='slime');else if(!drawMineCreature(e))drawClip(clip,e.x,e.y,e.scale*(ACTOR_SCALE[e.type]||1),Math.cos(e.angle)<-.65,e.type==='boar'?5:8);
  if(e.hit>0){ctx.fillStyle='#fff1ba';ctx.fillRect(e.x-2,e.y-(e.type==='boss'?42:20),3,3);}
  if(e.type==='boss'){const w=e.type==='boss'?48:28;ctx.fillStyle='#1a2219';ctx.fillRect(e.x-w/2,e.y-(MINE?(e.type==='boss'?172:100):e.type==='boss'?98:43),w,4);ctx.fillStyle=e.type==='elite'?'#c6a16d':'#b9735c';ctx.fillRect(e.x-w/2+1,e.y-(MINE?(e.type==='boss'?171:99):e.type==='boss'?97:42),(w-2)*e.hp/e.maxHp,2);}
  if(e.type==='boss'&&distance(player,e)<180)worldText(e.name,e.x,e.y-(MINE?(e.type==='boss'?180:108):e.type==='boss'?106:49),'#e7c58a',8);
}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);ctx.scale(ACTOR_SCALE.player,ACTOR_SCALE.player);ctx.translate(-player.x,-player.y);shadow(player.x,player.y,10);const mode=player.attack>0?'attack':player.moving||player.roll>0?'walk':'idle';const flip=player.dir==='right'&&Math.cos(player.aim)<0;
  drawClip(`player.${mode}.${player.dir}`,player.x,player.y,1.65,flip,player.roll>0?18:9);
  if(state.equipped.armor==='leather'){ctx.fillStyle='#8b6341';ctx.fillRect(player.x-10,player.y-21,4,6);ctx.fillRect(player.x+6,player.y-21,4,6);ctx.fillStyle='#dcc293';ctx.fillRect(player.x-9,player.y-22,3,2);ctx.fillRect(player.x+6,player.y-22,3,2);}
  if(state.equipped.charm==='bonecharm'){ctx.fillStyle=player.charmBuff>0?'#f0df97':'#bda8de';ctx.fillRect(player.x-1,player.y-17,3,3);}
  if(player.attack<=0&&state.equipped.weapon!=='starter'){const w=state.equipped.weapon;ctx.save();ctx.translate(player.x+Math.cos(player.aim)*10,player.y-12+Math.sin(player.aim)*5);ctx.rotate(player.aim+Math.PI/2);ctx.fillStyle=w==='coreblade'?'#edc970':w==='fangblade'?'#e5d8b8':'#a9bdc4';ctx.fillRect(-1,-12,3,11);ctx.fillStyle='#b38853';ctx.fillRect(-4,-2,9,2);ctx.fillRect(-1,0,3,4);if(w==='stonehammer'){ctx.fillStyle='#86999b';ctx.fillRect(-5,-14,11,7);}ctx.restore();}
  if(player.invuln>0){ctx.strokeStyle=player.roll>0?'#e4d6a1':'#e8c4b7';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(player.x,player.y-16,15,22,0,0,Math.PI*2);ctx.stroke();}
  if(swing){let t=1-swing.time/.24;ctx.save();ctx.translate(player.x,player.y-10);ctx.rotate(swing.angle);ctx.strokeStyle=swing.heavy?'#ecc77e':'#ebefd7';ctx.lineWidth=swing.heavy?5:3;ctx.globalAlpha=1-t;ctx.beginPath();ctx.arc(0,0,swing.range*.85,-1.3+t*.5,1.3+t*.5);ctx.stroke();ctx.restore();}
ctx.restore();}
function drawNode(n){if(n.respawn>0)return;shadow(n.x,n.y,12);if(n.type==='wood')drawClip('node.wood',n.x,n.y,1.15,false,0);else drawFrame('node:ore'+(n.type==='crystal'?4:2),n.x,n.y,.7);if(distance(n,player)<110){worldText(n.type==='wood'?'枯木':n.type==='iron'?'铁矿':'晶矿',n.x,n.y-34,'#d8c796',8);ctx.fillStyle='#e1cb8d';ctx.fillRect(n.x+11,n.y-20,2,2);}}
function drawSmith(){shadow(smith.x,smith.y,11);drawClip('smith.idle',smith.x,smith.y,.5);worldText('⚒ 铁匠 · 老铎',smith.x,smith.y-53,'#ead09b',9);if(distance(player,smith)<90){ctx.strokeStyle='#d9bd7d66';ctx.beginPath();ctx.ellipse(smith.x,smith.y,15,6,0,0,Math.PI*2);ctx.stroke();}}
function objective(){if(TOWN)return targetMarker&&distance(player,targetMarker)>65?targetMarker:null;if(mode==='battle'){const e=enemies[0];return e?{...e,label:e.type==='boss'?e.name:'敌人'}:null;}if(targetMarker&&distance(player,targetMarker)>65)return targetMarker;if(MEADOW){const e=mapEnemies.find(e=>distance(e,player)>180);return e?null:{...gateway,label:'原野入口'};}if(MINE)return null;if(state.quest===0){const e=mapEnemies.filter(e=>['slime','boar'].includes(e.type)).sort((a,b)=>distance(a,player)-distance(b,player))[0];return e?null:smith;}
  const recipe=GEAR[state.tracked]?.recipe;if(recipe&&!state.owned.includes(state.tracked))for(const [id,n] of Object.entries(recipe)){if(materialTotal(state,id)>=n)continue;const node=nodes.filter(node=>node.type===id&&!node.respawn).sort((a,b)=>distance(a,player)-distance(b,player))[0];if(node)return {...node,label:node.type==='wood'?'枯木采集点':'矿点'};
    const type=id==='gel'?'slime':['skin','fang'].includes(id)?'boar':id==='core'?'boss':id==='crystal'?'elite':'skeleton';const e=mapEnemies.filter(e=>e.type===type).sort((a,b)=>distance(a,player)-distance(b,player))[0];if(e)return null;}
  return {...smith,label:'铁匠铺'};}
function drawMapEnemy(e){if(MEADOW&&e.type==='boss'){drawBoarKing(e,true);return;}shadow(e.x,e.y,e.r);const dir=Math.abs(Math.cos(e.angle))>.65?'right':Math.sin(e.angle)>0?'down':'up';
  const clip=e.type==='skeleton'?`skeleton.${e.moving?'walk':'idle'}.${dir}`:e.type==='boar'?'boar.walk':`${e.type}.${e.moving?'walk':'idle'}`;
  if(MEADOW)drawMeadowActor(e.type,e.x,e.y,Math.cos(e.angle)<-.65,e.moving||e.type==='slime');else if(!drawMineCreature(e))drawClip(clip,e.x,e.y,e.scale*(ACTOR_SCALE[e.type]||1),Math.cos(e.angle)<-.65,e.moving?6:3);
  if(distance(e,player)<135){ctx.strokeStyle='#ddbd7ca0';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.ellipse(e.x,e.y+1,e.r+9,7,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    if(e.type==='boss')worldText(e.name,e.x,e.y-(MINE?(e.type==='boss'?180:e.type==='elite'?108:75):e.type==='boss'?104:e.type==='elite'?58:42),'#ebd9ac',8);worldText('靠近进入战斗',e.x,e.y+19,'#d7d1af',7);}}
function renderCharacterPreview(stamp){if(!orientationBlocked&&modal==='character'&&characterPreview&&stamp+.2>=previewRenderedAt){previewRenderedAt=Math.max(previewRenderedAt+1000/30,stamp);characterPreview(stamp/1000);}}
function render(){if(!world)return;showTownNavigation(TOWN&&mode==='exploration'&&phase==='playing'&&!modal&&!orientationBlocked);const stamp=performance.now(),frozen=orientationBlocked||!!(modal&&!(modal==='map'&&mode==='exploration'))||!['playing','entering'].includes(phase),key=`${mode}:${phase}:${modal}:${screenW}:${screenH}`;if(frozen&&frozenSceneKey===key&&!sceneDirty){renderCharacterPreview(stamp);return;}frozenSceneKey=frozen?key:null;sceneDirty=false;ctx.imageSmoothingEnabled=false;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=mode==='battle'?'#0d1917':'#162a1d';ctx.fillRect(0,0,screenW,screenH);
  const battle=mode==='battle',width=battle?ARENA.width:world.width,height=battle?ARENA.height:world.height;
  zoom=battle?Math.max(.9,screenW/ARENA.width,screenH/ARENA.height):TOWN?clamp(screenH/887,.4,1.45):MEADOW?clamp(screenH/720,.7,1.3):MINE?clamp(screenH/700,.65,1.15):clamp(screenH/300,1.15,2);
  camera.x=screenW/zoom>width?(width-screenW/zoom)/2:clamp(player.x-screenW/zoom/2,0,width-screenW/zoom);
  camera.y=screenH/zoom>height?(height-screenH/zoom)/2:clamp(player.y-screenH/zoom*(TOWN?.84:.5),0,height-screenH/zoom);
  ctx.setTransform(zoom,0,0,zoom,-Math.round(camera.x*zoom)+(Math.random()-.5)*screenShake,-Math.round(camera.y*zoom)+(Math.random()-.5)*screenShake);
  if(battle){if(MINE)ctx.drawImage(ground,world.bossPoint.x-380,world.bossPoint.y-190,760,380,0,0,ARENA.width,ARENA.height);else ctx.drawImage(arenaImages[encounter.theme],0,0);if(encounter.theme==='cave'){ctx.fillStyle='#10192440';ctx.fillRect(0,0,ARENA.width,ARENA.height);}ctx.strokeStyle='#d4c28b50';ctx.lineWidth=1;ctx.strokeRect(41,73,ARENA.width-82,ARENA.height-131);}
  else{if(TOWN){drawTerrainTiles(ctx,townAtlas,world,terrainView());worldText('前往溪畔原野',world.exit.x,world.exit.y-25,'#f2d293',12);}else if(MEADOW)drawMeadowTerrain();else if(MINE)drawMineTiles();else ctx.drawImage(ground,0,0,world.width,world.height);if(!FIELD)worldText('路标 · 前往溪畔原野',meadowGateway.x,meadowGateway.y-28,'#f2d293',10);if(MINE){worldText('废矿深窟 · 首领刷新点',world.bossPoint.x,world.bossPoint.y-155,'#f2ba77',12);}for(const o of world.effects)sceneObject(o);if(walkPath.length){const goal=walkPath.at(-1);ctx.strokeStyle='#f1d89d';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(goal.x,goal.y,9,5,0,0,Math.PI*2);ctx.stroke();}}
  for(const item of loot){shadow(item.x,item.y,7);const icon='icon:'+item.key;const f=world.atlas[icon];if(f){const scale=14/Math.max(f.w,f.h);ctx.drawImage(atlas,f.x,f.y,f.w,f.h,item.x-7,item.y-15+Math.sin(time*4)*2,f.w*scale,f.h*scale);}ctx.fillStyle=MATERIALS[item.key]?.color||'#e6c883';ctx.fillRect(item.x-1,item.y-23+Math.sin(time*4)*2,2,2);}
  if(battle){for(const e of enemies)if(e.boar)boarKingArt.ground(ctx,e);drawSwordEffects('ground');}
  const sorted=battle?[...enemies.map(e=>({depth:e.y,draw:()=>drawEnemy(e)})),{depth:player.y,draw:drawPlayer}]:
    [...world.scene.filter(sceneVisible).map(o=>({depth:o.depth,draw:()=>sceneObject(o)})),...world.animals.map(o=>({depth:o.depth,draw:()=>sceneObject(o)})),
    ...nodes.filter(n=>!n.respawn&&visible(n.x,n.y)).map(n=>({depth:n.y,draw:()=>drawNode(n)})),...mapEnemies.filter(e=>visible(e.x,e.y)).map(e=>({depth:e.y,draw:()=>drawMapEnemy(e)})),...(!TOWN?[{depth:smith.y,draw:drawSmith}]:[]),{depth:player.y,draw:drawPlayer}];
  sorted.sort((a,b)=>a.depth-b.depth);for(const o of sorted)o.draw();drawSwordEffects();
  for(const p of particles){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);}for(const n of numbers){ctx.globalAlpha=Math.min(1,n.life*2);worldText(n.text,n.x,n.y,n.color,10);}ctx.globalAlpha=1;
  const goal=objective();if(goal){const dx=goal.x-player.x,dy=goal.y-player.y;if(Math.hypot(dx,dy)>(battle?Math.min(115,screenW/zoom*.4):220)){const a=Math.atan2(dy,dx),r=Math.min(screenW/zoom*.36,screenH/zoom*.32),x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#e3c384';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();worldText(goal.label||'铁匠铺',x,y+14,'#e5cd95',8);}}
  updateMonsterHealthBars((mode==='battle'?enemies:[]).filter(e=>e.type!=='boss'),ctx.getTransform(),screenW,screenH,e=>{const frame=world.atlas[world.meadowClips?.[e.type]?.[0]];return MEADOW&&frame?frame.h*(ACTOR_SCALE[e.type]||1):MINE?(e.type==='elite'?95:62):e.type==='elite'?58:42;});
  positionBossBar();ctx.setTransform(1,0,0,1,0,0);
  renderCharacterPreview(stamp);
  // The phone UI hides this minimap. Render it only when a future layout exposes it.
  if($('#map-btn').offsetParent!==null){
  const mc=$('#minimap').getContext('2d');mc.imageSmoothingEnabled=false;mc.drawImage(battle?arenaImages[encounter.theme]:mini,0,0,160,112);for(const e of battle?enemies:mapEnemies){mc.fillStyle=e.type==='boss'?'#f1b879':'#e59778';mc.fillRect(e.x/width*160-1,e.y/height*112-1,2,2);}if(!battle){mc.fillStyle='#f5d58e';mc.fillRect(smith.x/width*160-1,smith.y/height*112-1,3,3);}mc.fillStyle='#fffbd5';mc.fillRect(player.x/width*160-1.5,player.y/height*112-1.5,3,3);
  }
}

function icon(kind='sword'){let body=kind==='armor'?'<path fill="#ad8255" d="M7 4h4l1 3 1-3h4l5 6-4 3-2-2v10H8V11l-2 2-4-3z"/><path fill="#e1c395" d="M8 5h3v3H8zm6 0h3v3h-3zM9 13h6v2H9z"/>':kind==='charm'?'<path fill="#8c9b8b" d="M5 2h3v3H5zm11 0h3v3h-3zM7 5h3v3H7zm7 0h3v3h-3zM10 8h4v3h-4z"/><path fill="#c0a7d8" d="M9 11h6v3h3v5h-3v3H9v-3H6v-5h3z"/><path fill="#eee3af" d="M10 14h4v5h-4z"/>':kind==='hammer'?'<path fill="#ac8957" d="M10 9h4v13h-4z"/><path fill="#99aeb0" d="M3 3h18v9H3z"/><path fill="#d2d5b8" d="M5 4h14v2H5z"/>':'<path fill="#b9c9c4" d="M17 2h5v5L10 19l-5-5z"/><path fill="#edf0d1" d="M19 3h2L8 16l-1-1z"/><path fill="#ba945c" d="M3 11l10 10-2 2L1 13zM6 17l2 2-5 5H0v-3z"/>';
  return `<span class="item-icon"><svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${body}</svg></span>`;}
const iconUrls={};
function materialIcon(id){if(!iconUrls[id]){const f=world.atlas['icon:'+id];if(!f)return '';const c=document.createElement('canvas');c.width=c.height=32;const cctx=c.getContext('2d');cctx.imageSmoothingEnabled=false;const s=24/Math.max(f.w,f.h);cctx.drawImage(atlas,f.x,f.y,f.w,f.h,(32-f.w*s)/2,(32-f.h*s)/2,f.w*s,f.h*s);iconUrls[id]=c.toDataURL();}return iconUrls[id];}
const QUESTS=[
  {title:'从第一份战利品开始',desc:'去镇外的林地，靠近怪物进入独立战斗场景。胜利后结算材料并返回；枯木可点击采集。',goal:()=>`${Math.min(3,totalKills())} / 3`,line:'赢得林地遭遇战'},
  {title:'把材料交给铁匠',desc:'收集木材 ×4、兽牙 ×2、凝胶 ×2，回铁匠老铎处打造兽牙短剑。打开手记可返回小镇。',goal:()=>state.crafted.includes('fangblade')?'已打造':'未打造',line:'打造兽牙短剑'},
  {title:'穿上自己的作品',desc:'在背包的装备页，或铁匠打造结果中穿戴兽牙短剑。攻击力、攻速与外观会立即改变。',goal:()=>state.equipped.weapon==='fangblade'?'已穿戴':'未穿戴',line:'穿戴兽牙短剑'},
  {title:'岩洞前的重甲守卫',desc:'带上新装备，沿西岸道路前往岩洞。守卫会蓄力攻击，利用闪避和重斩寻找机会。',goal:()=>state.kills.elite?'已完成':'0 / 1',line:'击败岩甲守卫'},
  {title:'原野中的野猪王',desc:'前往原野中央草地挑战荒牙野猪王。近身留意吼叫，中距离躲开跳扑，满怒时随时提防加宽冲撞。',goal:()=>state.kills.boss?'已完成':'0 / 1',line:'击败荒牙野猪王'},
  {title:'把黎明铸进剑里',desc:'将首领核心、铁矿和晶石交给铁匠，铸造传说武器「风脊·破晓」。',goal:()=>state.crafted.includes('coreblade')?'已完成':'未打造',line:'打造风脊·破晓'},
  {title:'溪谷记得你的名字',desc:'第一章已完成。你仍可探索山林、收集材料，尝试不同武器与饰品的搭配。',goal:()=> '已完成',line:'第一章 · 完成'},
];
function totalKills(){return state.kills.slime+state.kills.boar+state.kills.skeleton;}
function questCheck(){const checks=[()=>totalKills()>=3,()=>state.crafted.includes('fangblade'),()=>state.equipped.weapon==='fangblade',()=>state.kills.elite>0,()=>state.kills.boss>0,()=>state.crafted.includes('coreblade')];
  while(state.quest<6&&checks[state.quest]()){const old=state.quest++;if(old===0){addMaterials(state,{wood:2});state.potions+=2;toast('委托完成 · 获得木材 ×2、药水 ×2');}else{state.gold+=20;toast('委托完成 · +20 金币');}if(state.quest===3)state.tracked='leather';if(state.quest===4)state.tracked='ironsword';if(state.quest===5)state.tracked='coreblade';}renderUI();}
function renderHUD(){const st=stats(state);$('#hp-fill').style.width=clamp(state.hp/st.maxHp*100,0,100)+'%';$('#hp-label').textContent=`${Math.ceil(state.hp)} / ${st.maxHp}`;$('#stamina-fill').style.width=player.stamina+'%';$('#hero-level').textContent='Lv. '+state.level;$('#potion-count').textContent=state.potions;$('#heavy-cd').style.height=player.heavyCooldown/4.5*100+'%';
  showTownNavigation(TOWN&&mode==='exploration'&&phase==='playing'&&!modal&&!orientationBlocked);let zone=TOWN?'溪谷镇':mode==='battle'?THEME_NAMES[encounter.theme]:MEADOW?(safeZone()?'原野入口':'溪畔原野'):MINE?(safeZone()?'矿谷入口':player.y<750?'废矿深窟':player.x>2500?'废弃采场':'碎石矿谷'):safeZone()?'溪谷镇':heightAt(player.x,player.y)>0?'风脊山':player.x<1200&&player.y>1100?'禾风农庄':player.y>1100?'澄镜湖畔':'西岸林地';$('#zone-name').textContent=zone;$('#zone-type').textContent=TOWN?'安全城镇 · 店铺与装备打造':mode==='battle'?'独立即时战斗 · '+encounter.token.name:safeZone()?(FIELD?'安全入口 · 可休息恢复':'安全区域 · 铁匠与仓库'):MINE?'探索区域 · 所有怪物击败后立即刷新':'探索区域 · 靠近怪物进入战斗';
  const combat=mode==='battle'&&phase==='playing';for(const [id,def] of Object.entries(SWORD_SKILLS)){const b=$('#skill-'+id),cd=skillCooldowns[id];b.disabled=!combat||cd>0||player.stamina<def.cost;b.classList.toggle('ready',combat&&!b.disabled);b.querySelector('.skill-timer').textContent=cd>0?Math.ceil(cd)+'s':'';b.querySelector('.skill-shade').style.height=(cd/def.cooldown*100)+'%';b.setAttribute('aria-label',`${def.name}，快捷键主键盘或小键盘 ${def.key.replace('Digit','')}，体力 ${def.cost}，${cd>0?Math.ceil(cd)+' 秒后就绪':'已就绪'}`);}$('#attack-btn').disabled=!combat;$('#heavy-btn').disabled=!combat;$('#forge-btn').disabled=mode==='battle';$('#mobile-interact').hidden=false;
  $('#mobile-interact').textContent=mode==='battle'?'撤离':nearby()?.kind==='smith'?'打造':nearby()?.kind==='node'?'采集':'交互';
  $('.world-hint').textContent=mode==='battle'?'WASD 移动 · 左键 / J 攻击 · 空格闪避':'点击地图移动 · 靠近怪物遇敌 · E 采集';
  $('#return-btn').innerHTML=mode==='battle'?'↟ 撤离战斗 <kbd>R</kbd>':'↟ 返回原野入口 <kbd>R</kbd>';
  $('#map-btn span').innerHTML=mode==='battle'?'战斗场地 <kbd>M</kbd>':(MEADOW?'溪畔原野 <kbd>M</kbd>':MINE?'废矿深窟 <kbd>M</kbd>':'澄镜溪谷 <kbd>M</kbd>');
  const boss=enemies.find(e=>e.type==='boss');$('#boss-bar').hidden=!boss;document.body.classList.toggle('has-boss',!!boss);if(boss){$('#boss-hp').textContent=`${Math.ceil(boss.hp)} / ${boss.maxHp}`;$('#boss-health-fill').style.width=clamp(boss.hp/boss.maxHp*100,0,100)+'%';const rage=boss.boar?.rage||0;$('#boss-rage-fill').style.width=rage+'%';$('#boss-rage-label').textContent=`怒气 ${Math.floor(rage)} / 100`;$('#boss-rage').setAttribute('aria-valuenow',Math.floor(rage));$('#boss-bar').classList.toggle('enraged',rage>=100);$('#boss-action').textContent=BOAR_ACTIONS[boss.boar?.action]||'首领战';}
  $('#channel-bar').hidden=channel<=0;$('#channel-bar span').textContent=mode==='battle'?'撤离战斗…':'返回原野入口…';$('#channel-bar i').style.width=(1-channel/1.8)*100+'%';}
function renderUI(){sceneDirty=true;if(!world)return;const st=stats(state),q=QUESTS[state.quest];$('#quest-number').textContent=state.quest===6?'第一章 · 完成':`委托 0${state.quest+1}`;$('#quest-title').textContent=q.title;$('#quest-desc').textContent=q.desc;$('#quest-progress').innerHTML=`<div class="quest-progress-line">${q.line}<b>${q.goal()}</b></div>`;
  $('#quest-chip-text').textContent=q.title+' · '+q.goal();
  const tracked=GEAR[state.tracked];$('#tracked-icon').innerHTML=icon(tracked.icon);$('#tracked-name').textContent=tracked.name;$('#tracked-slot').textContent=`${tracked.tier} · ${SLOT_NAMES[tracked.slot]}`;
  $('#tracked-materials').innerHTML=Object.entries(tracked.recipe).map(([id,n])=>`<div class="mat-line"><span>${MATERIALS[id].name} <small>${MATERIALS[id].where}</small></span><b class="${materialTotal(state,id)>=n?'ready':'missing'}">${materialTotal(state,id)} / ${n}</b></div>`).join('');
  $('#loadout').innerHTML=Object.entries(SLOT_NAMES).map(([slot,name])=>{const g=GEAR[state.equipped[slot]];return `<div class="slot-row" data-open-equipment="1">${icon(g?.icon||(slot==='armor'?'armor':slot==='charm'?'charm':'sword'))}<div><span>${g?.name||'尚未穿戴'}</span><small>${name}</small></div></div>`;}).join('');$('#loadout').onclick=()=>{bagTab='equipment';openModal('bag');};
  $('#stat-atk').textContent=st.attack;$('#stat-def').textContent=st.defense;$('#stat-hp').textContent=st.maxHp;$('#gold-label').textContent=state.gold+' 金币';renderHUD();}
function openModal(type){if(phase!=='playing')return;if(type==='forge'&&TOWN&&!world.shops.some(s=>['forge','weapon','armor'].includes(s.id)&&distance(player,s)<90)){const shop=world.shops[0];setWalkTarget(shop.x,shop.y);targetMarker={...shop,label:shop.name};toast('正在前往锻造铺，到达后点击交互');return;}if(type==='forge'&&mode==='battle'){toast('战斗结束返回大地图后，才能找铁匠打造');return;}if(type==='forge'&&!TOWN&&distance(player,smith)>90){targetMarker={...smith,label:'铁匠铺'};toast('靠近铁匠点击交互打造，也可在手记中返回小镇');return;}modal=type;releaseControls(type==='map'&&mode==='exploration');$('#modal-backdrop').hidden=false;$('#modal').classList.toggle('map-modal',type==='map');$('#modal').classList.toggle('character-modal',type==='character');renderModal();}
function closeModal(){shopFilter=null;const keepWalk=modal==='map'&&mode==='exploration';characterPreview=null;modal=null;$('#modal-backdrop').hidden=true;releaseControls(keepWalk);canvas.focus({preventScroll:true});}
function equipItem(id){const before=stats(state);if(!equip(state,id))return;const after=stats(state);toast(`已穿戴 ${GEAR[id].name}`+(after.attack!==before.attack?` · 攻击 ${before.attack} → ${after.attack}`:''));sound(540,.12,'triangle');questCheck();persist();renderUI();renderModal();}
function renderModal(){if(!modal)return;previewRenderedAt=-1000;characterPreview=null;$('#modal-eyebrow').textContent=modal==='bag'?'PACK LIGHT, GO FAR':modal==='forge'?'EVERY MATERIAL HAS A PURPOSE':modal==='journal'?'FIELD NOTES':'THE VALLEY AT A GLANCE';$('#modal-title').textContent=modal==='bag'?'旅人的行囊':modal==='forge'?'老铎的铁匠铺':modal==='journal'?'旅人手记':'澄镜溪谷';const body=$('#modal-body');if(MEADOW&&modal==='map')$('#modal-title').textContent='溪畔原野';if(MINE&&modal==='map')$('#modal-title').textContent='废矿深窟';
  if(modal==='journal')$('#modal-title').innerHTML=`旅人手记 <small class="game-version" aria-label="游戏版本 ${GAME_VERSION}">v${GAME_VERSION}</small>`;
  if(modal==='character'){$('#modal-eyebrow').textContent='';$('#modal-title').textContent='✦ 旅人档案';characterPreview=mountCharacterPanel({body,state,st:stats(state),gear:GEAR,slots:SLOT_NAMES,icon,world,atlas,ground:arenaImages.forest,tab:characterTab,selected:characterSkill,onTab:tab=>{characterTab=tab;renderModal();},onSelect:id=>{characterSkill=id;renderModal();},onEquipment:()=>{bagTab='equipment';openModal('bag');}});return;}
  if(modal==='journal'){const q=QUESTS[state.quest],g=GEAR[state.tracked],st=stats(state);body.innerHTML=`<div class="journal-layout"><section class="journal-pane"><div class="quest-number">${state.quest===6?'第一章 · 完成':`委托 0${state.quest+1}`}</div><h3>${q.title}</h3><p>${q.desc}</p><div class="quest-progress-line">${q.line}<b>${q.goal()}</b></div><div class="journal-buttons"><button id="journal-return">${mode==='battle'?'撤离战斗':'返回原野入口'}</button><button id="journal-map">查看地图</button></div><p>攻击 ${st.attack} · 防御 ${st.defense} · 生命 ${st.maxHp}<br>金币 ${state.gold} · ${GEAR[state.equipped.weapon].name}</p></section><section class="journal-pane"><div class="section-cap">正在筹备</div><div class="tracked-item">${icon(g.icon)}<div><h3>${g.name}</h3><small>${g.tier} · ${SLOT_NAMES[g.slot]}</small></div></div>${Object.entries(g.recipe).map(([id,n])=>`<div class="mat-line"><span>${MATERIALS[id].name} <small>${MATERIALS[id].where}</small></span><b class="${materialTotal(state,id)>=n?'ready':'missing'}">${materialTotal(state,id)}/${n}</b></div>`).join('')}<div class="journal-buttons"><button id="journal-forge" ${mode==='battle'?'disabled':''}>铁匠打造</button><button id="journal-equipment">查看装备</button></div></section></div>`;
    $('#journal-return').onclick=()=>{closeModal();returnTown();};$('#journal-map').onclick=()=>openModal('map');$('#journal-forge').onclick=()=>{closeModal();openModal('forge');};$('#journal-equipment').onclick=()=>{bagTab='equipment';openModal('bag');};return;}
  if(modal==='map'&&mode==='battle'){body.innerHTML=`<div class="map-full" style="aspect-ratio:${ARENA.width}/${ARENA.height};background-image:url('./game/assets/arena-${MEADOW?'meadow':encounter.theme}.png')"><i class="map-point" style="left:${player.x/ARENA.width*100}%;top:${player.y/ARENA.height*100}%"></i>${enemies.map(e=>`<span class="map-label" style="left:${e.x/ARENA.width*100}%;top:${e.y/ARENA.height*100}%">${e.name}</span>`).join('')}</div><p class="map-note">当前为独立即时战斗场景。胜利后结算并返回遇敌地点；点击左侧「撤离」可尝试脱离战斗，撤离没有奖励。</p>`;return;}
  if(modal==='map'&&MEADOW){body.innerHTML=`<div class="map-full" style="aspect-ratio:${world.width}/${world.height};background-image:url('./game/assets/meadow-minimap.png')"><i class="map-point" style="left:${player.x/world.width*100}%;top:${player.y/world.height*100}%"></i>${mapEnemies.filter(e=>e.type==='boss').map(e=>`<span class="map-label" style="left:${e.x/world.width*100}%;top:${e.y/world.height*100}%">◆ 荒牙野猪王</span>`).join('')}</div><p class="map-note">溪畔原野 · 点击地图自动前往；入口可休息恢复。所有怪物（含精英和荒牙野猪王）击败后返回地图立即满血刷新，无需等待或远离。</p>`;body.querySelector('.map-full').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();closeModal();setWalkTarget((e.clientX-r.left)/r.width*world.width,(e.clientY-r.top)/r.height*world.height);};return;}
  if(modal==='map'&&MINE){body.innerHTML=`<div class="map-full" style="aspect-ratio:${world.width}/${world.height};background-image:url('./game/assets/mine-minimap.png')"><i class="map-point" style="left:${player.x/world.width*100}%;top:${player.y/world.height*100}%"></i><span class="map-label" style="left:20%;top:16%">◆ 熔岩石王 · 立即刷新</span><span class="map-label" style="left:94%;top:91%">返回溪谷镇</span></div><p class="map-note">沿山路探索矿谷，洞口前遇见首领。点击地图自动寻路；所有怪物击败后返回地图立即满血刷新，无需等待或远离。</p>`;body.querySelector('.map-full').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();closeModal();setWalkTarget((e.clientX-r.left)/r.width*world.width,(e.clientY-r.top)/r.height*world.height);};return;}
  if(modal==='map'){body.innerHTML=`<div class="map-full"><i class="map-point" style="left:${player.x/world.width*100}%;top:${player.y/world.height*100}%"></i><span class="map-label" style="left:${smith.x/world.width*100}%;top:${smith.y/world.height*100}%">⚒ 铁匠</span><span class="map-label" style="left:41%;top:43%">岩甲守卫</span><span class="map-label" style="left:29%;top:14%">荒骨领主</span></div><p class="map-note">点击缩略地图上的位置即可自动前往；障碍物会选择附近落点。靠近怪物进入战斗，铁匠位于东岸小镇。</p>`;body.querySelector('.map-full').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width,0,1)*world.width,y=clamp((e.clientY-r.top)/r.height,0,1)*world.height;closeModal();setWalkTarget(x,y);};return;}
  if(modal==='bag'){body.innerHTML=`<div class="modal-tabs"><button data-tab="materials" class="${bagTab==='materials'?'active':''}">材料</button><button data-tab="equipment" class="${bagTab==='equipment'?'active':''}">装备</button><span>${state.gold} 金币 · Lv. ${state.level}</span></div>`;
    if(bagTab==='materials'){body.innerHTML+=`<div class="inventory-grid">${Object.keys(MATERIALS).map(id=>`<article class="material-card" data-material="${id}"><img alt="" src="${materialIcon(id)}"><b>${state.bag[id]}</b><h3>${MATERIALS[id].name}</h3><small>仓库 ${state.bank[id]} · ${MATERIALS[id].where}</small></article>`).join('')}</div><div class="bag-footer"><p>死亡仅损失背包中 20% 的材料。仓库与装备始终保留。</p><button id="deposit-btn" ${safeZone()?'':'disabled'}>全部存入仓库</button></div><p class="map-note">${safeZone()?'铁匠打造时可直接使用背包和仓库的材料。':'回到溪谷镇后可以存入仓库。'}</p>`;
      $('#deposit-btn').onclick=()=>{if(!safeZone())return;deposit(state);toast('材料已安全存入仓库');persist();renderUI();renderModal();};}
    else body.innerHTML+=`<div class="comparison">当前：攻击 ${stats(state).attack} · 防御 ${stats(state).defense} · 生命上限 ${stats(state).maxHp}</div><div class="gear-grid">${state.owned.map(id=>{const g=GEAR[id],worn=state.equipped[g.slot]===id;return `<article class="gear-card" data-gear="${id}"><div class="gear-top">${icon(g.icon)}<div><h3>${g.name}</h3><small>${g.tier} · ${SLOT_NAMES[g.slot]}</small></div></div><p>${g.desc}</p><div class="gear-bottom"><span>${g.attack?'攻击 '+g.attack:g.defense?'防御 +'+g.defense:'闪避增伤'}</span><button data-equip="${id}" ${worn?'disabled':''}>${worn?'已穿戴':'穿戴'}</button></div></article>`;}).join('')}</div>`;
    body.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{bagTab=b.dataset.tab;renderModal();});}
  if(modal==='pharmacy'){$('#modal-title').textContent='药铺 · 旅途补给';body.innerHTML=`<p>药水可在探索与战斗中使用。</p><p>持有药水 ${state.potions} / 99 · 金币 ${state.gold}</p><button id="town-buy-potion" ${state.gold<12||state.potions>=99?'disabled':''}>购买药水 · 12 金币</button>`;$('#town-buy-potion').onclick=()=>{if(state.gold<12||state.potions>=99)return;state.gold-=12;state.potions++;persist();renderUI();renderModal();};return;}
  if(modal==='goods'){$('#modal-title').textContent='杂货店 · 材料寄存';body.innerHTML=`<p>背包与仓库中的材料均可用于打造。</p>${Object.keys(MATERIALS).map(id=>`<div class="mat-line"><span>${MATERIALS[id].name}</span><b>随身 ${state.bag[id]} · 仓库 ${state.bank[id]}</b></div>`).join('')}<button id="town-deposit">将随身材料存入仓库</button>`;$('#town-deposit').onclick=()=>{deposit(state);persist();renderUI();renderModal();};return;}
  if(modal==='forge'){if(TOWN)$('#modal-title').textContent=shopFilter==='weapon'?'武器店 · 装备打造':shopFilter==='armor'?'防具店 · 装备打造':'锻造铺 · 老铎';body.innerHTML=`<p class="forge-intro"><span>“材料带来了？这次想铸点什么？”<br><strong>背包与仓库材料可合并使用 · 打造必定成功</strong></span><button id="buy-potion" ${state.gold<12||state.potions>=99?'disabled':''}>药水 +1 · 12 金币</button></p><div class="comparison">已穿戴：${GEAR[state.equipped.weapon].name} · 攻击 ${stats(state).attack} / 防御 ${stats(state).defense} / 生命 ${stats(state).maxHp}</div><div class="recipe-grid">${RECIPES.filter(id=>!TOWN||!shopFilter||GEAR[id].slot===shopFilter).map(id=>{let g=GEAR[id],owned=state.owned.includes(id),worn=state.equipped[g.slot]===id;return `<article class="recipe-card ${owned?'owned':''}" data-recipe="${id}"><div class="gear-top">${icon(g.icon)}<div><h3>${g.name}</h3><small>${g.tier} · ${SLOT_NAMES[g.slot]}${g.attack?' · 攻击 '+g.attack:''}</small></div></div><p>${g.desc}</p><div class="recipe-mats">${Object.entries(g.recipe).map(([m,n])=>`<span class="recipe-mat ${materialTotal(state,m)<n?'lacking':''}">${MATERIALS[m].name} ${materialTotal(state,m)}/${n}</span>`).join('')}</div><div class="gear-bottom">${owned?`<button data-equip="${id}" ${worn?'disabled':''}>${worn?'已穿戴':'穿戴装备'}</button>`:`<button data-craft="${id}" ${canCraft(state,id)?'':'disabled'}>${canCraft(state,id)?'打造装备':'材料不足'}</button>`}<button class="track" data-track="${id}">${state.tracked===id?'追踪中':'追踪配方'}</button></div></article>`;}).join('')}</div>`;
    $('#buy-potion').onclick=()=>{if(state.gold<12||state.potions>=99)return;state.gold-=12;state.potions++;toast('获得恢复药水 ×1');persist();renderUI();renderModal();};
    body.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{const id=b.dataset.craft;if(TOWN?!world.shops.some(s=>['forge','weapon','armor'].includes(s.id)&&distance(player,s)<90):distance(player,smith)>90)return;const result=craft(state,id);if(result.ok){toast('打造成功 · '+GEAR[id].name+'，点击穿戴即可生效');sound(880,.18,'triangle');sparks(smith.x,smith.y-20,'#e6c479',20);questCheck();persist();renderUI();renderModal();}else toast(result.reason,true);});
    body.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{state.tracked=b.dataset.track;targetMarker=null;persist();renderUI();renderModal();});}
  body.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>equipItem(b.dataset.equip));}

function resize(){const rect=canvas.getBoundingClientRect();const w=Math.round(rect.width),h=Math.round(rect.height);if(w!==screenW||h!==screenH)releaseControls();screenW=w;screenH=h;canvas.width=screenW;canvas.height=screenH;const blocked=innerHeight>innerWidth;if(blocked!==orientationBlocked)releaseControls();orientationBlocked=blocked;ctx.imageSmoothingEnabled=false;}
function endAttackPointer(e){if(e.pointerId===attackPointer){pointer.down=false;attackPointer=null;}}
function bindTouch(){
  $('#profile-btn').onclick=()=>{characterTab='attributes';openModal('character');};
  const press=(button,action)=>{button.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();action();};button.onclick=e=>{if(e.detail===0)action();};};
  for(const id of Object.keys(SWORD_SKILLS))press($('#skill-'+id),()=>{pointer.touchAim=true;castSword(id);});
  press($('#dodge-btn'),dodge);press($('#heavy-btn'),()=>{pointer.touchAim=true;attack(true);});press($('#potion-btn'),heal);
  const stick=$('#joystick');stick.setAttribute('aria-hidden','true');stick.removeAttribute('role');stick.removeAttribute('tabindex');
  const updateStick=e=>{const radius=stick.getBoundingClientRect().width*.34,dx=e.clientX-joystick.originX,dy=e.clientY-joystick.originY,m=Math.max(radius,Math.hypot(dx,dy));joystick.x=dx/m;joystick.y=dy/m;$('#stick-knob').style.transform=`translate(${joystick.x*radius}px,${joystick.y*radius}px)`;pointer.active=false;};
  const covered=(x,y)=>[...document.querySelectorAll('.vitals,.zone-pill,#toast-stack')].some(el=>{const r=el.getBoundingClientRect();return !el.hidden&&r.width&&r.height&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
  canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();if(mode!=='battle'||e.button!==0||e.clientX>=r.left+r.width/2||covered(e.clientX,e.clientY)||joystick.id!==null||phase!=='playing'||modal||orientationBlocked)return;
    e.preventDefault();joystick.id=e.pointerId;joystick.active=true;joystick.originX=e.clientX;joystick.originY=e.clientY;joystick.x=joystick.y=0;stick.style.left=e.clientX+'px';stick.style.top=e.clientY+'px';stick.classList.add('active');canvas.setPointerCapture(e.pointerId);updateStick(e);
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerId!==joystick.id)return;e.preventDefault();updateStick(e);});
  const release=e=>{if(e.pointerId===joystick.id)resetJoystick();};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  const attackButton=$('#attack-btn');attackButton.onpointerdown=e=>{if(attackPointer!==null)return;e.preventDefault();attackPointer=e.pointerId;attackButton.setPointerCapture(e.pointerId);pointer.active=false;pointer.touchAim=true;pointer.down=true;attack();};attackButton.onpointerup=endAttackPointer;attackButton.onpointercancel=endAttackPointer;attackButton.onlostpointercapture=endAttackPointer;attackButton.onpointerleave=null;
  $('#mobile-interact').onclick=()=>mode==='battle'?returnTown():interact();
  $('#journal-btn').onclick=()=>openModal('journal');$('#quest-chip').onclick=()=>openModal('journal');$('#map-shortcut').onclick=()=>openModal('map');
  $('#pause-sound').onclick=()=>{$('#sound-btn').click();$('#pause-sound').textContent=muted?'开启音效':'关闭音效';};
  mountFullscreen({onHelp:()=>{if(phase==='playing')pause();}});
  const paths={sword:'M17 2h5v5L10 19l-5-5zM3 11l10 10-2 2L1 13zM6 17l2 2-5 5H0v-3z',run:'M14 1h4v4h-4zM10 5h5l4 5h4v3h-6l-3-3-2 4 5 3 1 6h-4l-1-5-5-2-4 7H0l6-11 2-4-3 2H1V7h3z',heavy:'M10 1h4l1 9 6-6 2 3-7 6 8 1v4l-9-1-2 7H9l1-8-8 4-2-3 9-5z',potion:'M8 1h8v3h-1v5l5 5v8H4v-8l5-5V4H8z'};
  for(const [id,name] of [['attack-btn','sword'],['dodge-btn','run'],['heavy-btn','heavy'],['potion-btn','potion']])$(`#${id} .ability-symbol`).innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path d="${paths[name]}"/></svg>`;
  $('#bag-btn').innerHTML='<svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true"><path fill="currentColor" d="M8 3h8v4h4v14H4V7h4zm2 2v2h4V5zM8 11v6h8v-6z"/></svg>';
  const face=world.atlas[world.clips['player.idle.down'][0]],ac=$('#hero-avatar').getContext('2d');ac.imageSmoothingEnabled=false;ac.drawImage(atlas,face.x,face.y,face.w,Math.min(14,face.h),(40-face.w*2.3)/2,4,face.w*2.3,Math.min(14,face.h)*2.3);
}
function pause(){if(phase==='playing'){closeModal();phase='paused';releaseControls();$('#pause-cover').hidden=false;persist();}else if(phase==='paused'){phase='playing';$('#pause-cover').hidden=true;canvas.focus();}}
function start(){state.started=true;phase='playing';$('#intro').hidden=true;canvas.focus();toast(TOWN?'点击地面行走 · 左侧快捷导航 · 到店门口点击交互':'点击地面行走 · 靠近怪物遇敌 · 入口交互返回城镇');persist();}
function bind(){new ResizeObserver(resize).observe(canvas);$('#start-btn').onclick=start;$('#pause-btn').onclick=pause;$('#resume-btn').onclick=pause;$('#bag-btn').onclick=()=>{bagTab='materials';openModal('bag');};$('#forge-btn').onclick=()=>openModal('forge');$('#map-btn').onclick=()=>openModal('map');$('#minimap').onclick=e=>{if(mode!=='exploration')return;e.stopPropagation();if(phase!=='playing'||modal||orientationBlocked)return;const r=e.currentTarget.getBoundingClientRect();setWalkTarget((e.clientX-r.left)/r.width*world.width,(e.clientY-r.top)/r.height*world.height);};$('#close-modal').onclick=closeModal;$('#modal-backdrop').onclick=e=>{if(e.target===$('#modal-backdrop'))closeModal();};$('#attack-btn').onpointerdown=e=>{e.preventDefault();pointer.active=false;pointer.down=true;attack();};$('#attack-btn').onpointerup=()=>pointer.down=false;$('#attack-btn').onpointerleave=()=>pointer.down=false;$('#dodge-btn').onclick=dodge;$('#heavy-btn').onclick=()=>attack(true);$('#potion-btn').onclick=heal;$('#return-btn').onclick=returnTown;$('#mobile-interact').onclick=interact;
  $('#return-map-btn').onclick=()=>{if(phase==='victory'&&encounter?.settled)leaveEncounter();};
  $('#sound-btn').onclick=()=>{muted=!muted;$('#sound-btn span').textContent=muted?'音效关':'音效开';sound(660,.08,'sine');};$('#revive-btn').onclick=()=>{if(encounter)leaveEncounter({town:true});else{mode='exploration';phase='playing';Object.assign(player,findFree(respawn.x,respawn.y));}$('#death-cover').hidden=true;player.invuln=3;player.stamina=100;channel=0;persist();renderUI();};
  document.addEventListener('keydown',e=>{if(orientationBlocked||e.target.matches('input,textarea')||(e.target.id==='profile-btn'&&['Space','Enter'].includes(e.code)))return;const code=e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();
    if(code==='Escape'){if(modal)closeModal();else pause();return;}if(code==='KeyP'){if(!e.repeat)pause();return;}if(phase!=='playing')return;
    if(code==='KeyB'){if(!e.repeat){if(modal)closeModal();else openModal('bag');}return;}if(code==='KeyM'){if(!e.repeat){if(modal)closeModal();else openModal('map');}return;}if(modal)return;
    keys.add(code);if(e.repeat)return;const skillId=Object.keys(SWORD_SKILLS).find(id=>[SWORD_SKILLS[id].key,SWORD_SKILLS[id].key.replace('Digit','Numpad')].includes(code));if(skillId){castSword(skillId);return;}if(code==='Space'||code==='ShiftLeft'||code==='ShiftRight')dodge();if(code==='KeyQ')attack(true);if(code==='KeyE')interact();if(code==='KeyF')openModal('forge');if(code==='KeyH')heal();if(code==='KeyR')returnTown();});
  document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{releaseControls();if(phase==='playing'&&!QA)pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();releaseControls();if(phase==='playing'&&!QA)pause();}});window.addEventListener('beforeunload',persist);
  canvas.addEventListener('pointerdown',e=>{if(mode!=='exploration'||e.button!==0||phase!=='playing'||modal||orientationBlocked)return;const r=canvas.getBoundingClientRect();e.preventDefault();canvas.focus({preventScroll:true});setWalkTarget((e.clientX-r.left)/zoom+camera.x,(e.clientY-r.top)/zoom+camera.y);});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||joystick.active)return;pointer.touchAim=false;const r=canvas.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.active=true;});canvas.addEventListener('pointerdown',e=>{if(mode!=='battle'||e.button!==0||e.pointerType==='touch'||e.clientX<canvas.getBoundingClientRect().left+screenW/2)return;canvas.focus();attackPointer=e.pointerId;pointer.touchAim=false;pointer.down=true;pointer.active=e.pointerType!=='touch';attack();});window.addEventListener('pointerup',endAttackPointer);window.addEventListener('pointercancel',endAttackPointer);canvas.oncontextmenu=e=>e.preventDefault();
  document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);mobileKeys.add(b.dataset.move);pointer.active=false;};const up=()=>mobileKeys.delete(b.dataset.move);b.onpointerup=up;b.onpointercancel=up;});}
function snapshot(){const enemyView=e=>({id:e.id,type:e.type,x:e.x,y:e.y,hp:e.hp,windup:e.windup,...(e.boar?{boar:{...e.boar}}:{})});return {version:GAME_VERSION,ambientFish:meadowFish?.positions(time)||[],region:TOWN?'town':MEADOW?'meadow':MINE?'mine':'valley',townShops:TOWN?world.shops:[],respawns:respawns.map(r=>({...r})),skills:{vfxStyle:'original-flat-v1',effectKinds:[...new Set(skillEffects.map(f=>f.id))],queued:queuedSword?.id??null,fields:swordFields.map(f=>({age:f.age,pulse:f.pulse})),cooldowns:{...skillCooldowns},active:swordCast?{id:swordCast.id,age:swordCast.age,pulse:swordCast.pulse}:null,uses:{...skillUses},effects:skillEffects.length},phase,mode,modal,walkPath:walkPath.map(p=>({...p})),orientationBlocked,attackHeld:pointer.down,joystick:{x:joystick.x,y:joystick.y,active:joystick.active,originX:joystick.originX,originY:joystick.originY},player:{x:player.x,y:player.y,hp:state.hp,stamina:player.stamina,roll:player.roll,heavyCooldown:player.heavyCooldown,rollCooldown:player.rollCooldown},stats:stats(state),bag:{...state.bag},bank:{...state.bank},owned:[...state.owned],equipped:{...state.equipped},kills:{...state.kills},quest:state.quest,gold:state.gold,potions:state.potions,enemies:(mode==='battle'?enemies:mapEnemies).map(enemyView),mapEnemies:mapEnemies.map(enemyView),encounter:encounter?{theme:encounter.theme,returnPoint:{...encounter.returnPoint},tokenId:encounter.token.id,settled:encounter.settled,pending:JSON.parse(JSON.stringify(encounter.pending))}:null,loot:loot.map(l=>({...l})),near:nearby()?.kind,lastPickup};}
function qaSetup(){window.__valleyforge={snapshot};if(!QA)return;window.__valleyQA={snapshot,walkTo(x,y){setWalkTarget(x,y);return snapshot();},navigation(){
    const cols=world.width/16,rows=world.height/16,start=[Math.floor(respawn.x/16),Math.floor(respawn.y/16)],seen=new Set([start.join(',')]),queue=[start];
    for(let head=0;head<queue.length;head++){const [x,y]=queue[head];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(nx<1||nx>=cols-1||ny<1||ny>=rows-1||seen.has(k))continue;
      if(pointFree(nx*16+8,ny*16+8,8)&&transition(x*16+8,y*16+8,nx*16+8,ny*16+8)){seen.add(k);queue.push([nx,ny]);}}}
    const targets={smith,elite:{x:1060,y:780},boss:{x:752,y:272},northBridge:{x:1424,y:880},southBridge:{x:1456,y:1520}};
    return Object.fromEntries(Object.entries(targets).map(([name,p])=>[name,queue.some(([x,y])=>Math.hypot(x*16+8-p.x,y*16+8-p.y)<48)]));
  },focus(kind,standOff=30){if(mode!=='exploration')throw Error('Return from the encounter before moving on the world map');closeModal();phase='playing';$('#intro').hidden=true;$('#death-cover').hidden=true;$('#pause-cover').hidden=true;state.started=true;clearActions();player.lastHurt=-100;encounterGrace=0;
    if(kind==='smith'){Object.assign(player,findFree(smith.x+38,smith.y+22));return snapshot();}
    let target=nodes.find(n=>n.type===kind&&!n.respawn);if(!target)target=mapEnemies.find(e=>e.type===kind);if(!target)throw Error('No encounter '+kind);
    for(let k=0;k<32;k++){let a=k*Math.PI*2/32,dist=standOff,px=target.x+Math.cos(a)*dist,py=target.y+Math.sin(a)*dist;
      if(pointFree(px,py,player.r)&&transition(px,py,target.x,target.y)){player.x=px;player.y=py;player.aim=Math.atan2(target.y-py,target.x-px);pointer.active=false;player.invuln=1;
        return snapshot();}}
    throw Error('No free adjacent encounter position');},bossScenario({range=90,rage=0,roll=0,invulnerable=false}={}){const e=enemies.find(e=>e.boar);if(!e||phase!=='playing')throw Error('Enter a live boss encounter first');clearActions();Object.assign(e,{x:650,y:280,stun:0,hit:0,boar:createBoarKing()});Object.assign(e.boar,{rage,cooldown:0,decision:0});Object.assign(player,{x:650-range,y:280,invuln:invulnerable?60:0});bossRandom=()=>roll;renderUI();return snapshot();},
    hitBoss(n=1,heavy=false){const e=enemies.find(e=>e.boar);if(!e)throw Error('No boss');hitEnemy(e,n,heavy);renderUI();return snapshot();},
    step(seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>30)throw Error('Invalid QA step');for(let elapsed=0;elapsed<seconds&&phase==='playing'&&!modal;elapsed+=.02)update(Math.min(.02,seconds-elapsed));renderUI();render();return snapshot();},
    damage(n){hurtPlayer(n);return snapshot();},canStand:pointFree,readSave(){return JSON.parse(localStorage.getItem(SAVE_KEY));},aim(){if(enemies[0]){pointer.active=false;player.aim=Math.atan2(enemies[0].y-player.y,enemies[0].x-player.x);}return snapshot();}};}
async function load(){try{const res=await fetch('./game/assets/'+(TOWN?'town-world.json':MEADOW?'meadow-world.json':MINE?'mine-world.json':'world.json')+'?v='+GAME_VERSION);if(!res.ok)throw Error('无法读取地图');world=await res.json();const loadImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('素材加载失败：'+url));im.src=url;});[ground,atlas,mini]=await Promise.all([TOWN?'town-minimap.png':MEADOW?'meadow-ground.png':MINE?'mine-ground.png':'ground.png','sprites.png',TOWN?'town-minimap.png':MEADOW?'meadow-minimap.png':MINE?'mine-minimap.png':'minimap.png'].map(n=>loadImage('./game/assets/'+n)));
    if(TOWN){[townAtlas,meadowAtlas]=await Promise.all(['town-atlas.png','meadow-atlas.png'].map(n=>loadImage('./game/assets/'+n+'?v='+GAME_VERSION)));Object.assign(respawn,world.entry);Object.assign(smith,world.shops[0]);showTownNavigation=mountTownNavigation(world.shops,shop=>{if(phase!=='playing'||modal||orientationBlocked)return false;setWalkTarget(shop.x,shop.y);if(!walkPath.length)return false;targetMarker={...shop,label:shop.name};canvas.focus();return true;});}
    if(MEADOW){boarKingArt=await loadBoarKingArt(loadImage,GAME_VERSION);const [mapAtlas,arena,river]=await Promise.all([loadImage('./game/assets/meadow-atlas.png'),loadImage('./game/assets/arena-meadow.png'),loadImage('./game/assets/meadow-river.png')]);meadowAtlas=mapAtlas;arenaImages.forest=arena;meadowFish=createMeadowFish({river,ground,atlas:meadowAtlas,world});meadowRipples=createMeadowRipples({river,ground,atlas:meadowAtlas,world});Object.assign(gateway,world.entry);Object.assign(respawn,world.entry);}
    if(MINE){mineAtlas=await loadImage('./game/assets/mine-tiles.png');Object.assign(gateway,world.entry);Object.assign(respawn,world.entry);for(const name of ['golem','wolf']){const im=await loadImage('./game/assets/mine-'+name+'.png');const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const cc=c.getContext('2d');cc.drawImage(im,0,0);const data=cc.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>64){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}mineSprites[name]={im,x:l,y:t,w:r-l+1,h:b-t+1};}}buildCollision();Object.assign(player,findFree(FIELD?respawn.x:state.position?.x??respawn.x,FIELD?respawn.y:state.position?.y??respawn.y,player.r));spawnWorld();bind();bindTouch();resize();phase=state.started?'playing':'ready';$('#intro').hidden=state.started;$('#loading').hidden=true;renderUI();qaSetup();requestAnimationFrame(loop);
  }catch(error){console.error(error);$('#loading-text').textContent=error.message;$('#reload-btn').hidden=false;$('#reload-btn').onclick=()=>location.reload();}}
function loop(t){if(document.hidden){last=t;requestAnimationFrame(loop);return;}const dt=Math.min(.035,(t-last)/1000||.016);last=t;if(!orientationBlocked){if(phase==='entering')updateEntering(dt);else if(phase==='playing'&&(!modal||(modal==='map'&&mode==='exploration')))update(dt);}if(modal==='map'&&mode==='exploration'){const dot=$('.map-full .map-point');if(dot){dot.style.left=player.x/world.width*100+'%';dot.style.top=player.y/world.height*100+'%';}}render();requestAnimationFrame(loop);}
mountPanelFit();
load();
