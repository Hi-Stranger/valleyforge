import {LEVEL_CAP,JOBS,BASE_LOADOUT,EXTRA_GEAR,EXTRA_MATERIALS,SKILL_BOOK,NEW_ENEMIES,REGIONS,ADVENTURE_REGIONS,spentSp} from './rpg-data.mjs';
export const SAVE_KEY = 'valleyforge-save-v1';
export const MATERIALS = {
  gel:{name:'凝胶',color:'#9cd8af',where:'林地史莱姆'},
  skin:{name:'兽皮',color:'#dba576',where:'荒野野猪'},
  fang:{name:'兽牙',color:'#e9e3ce',where:'荒野野猪'},
  wood:{name:'木材',color:'#bc8b60',where:'枯木、任务奖励'},
  iron:{name:'铁矿',color:'#a6b8c6',where:'矿点、骷髅'},
  bone:{name:'骨片',color:'#d8d7c4',where:'山地骷髅'},
  crystal:{name:'晶石',color:'#b5a4e4',where:'晶矿、岩甲守卫'},
  core:{name:'首领核心',color:'#edbd6e',where:'各区域首领'},
  ...EXTRA_MATERIALS,
};
export const GEAR = {
  starter:{job:'swordsman',name:'旅人木剑',slot:'weapon',attack:6,cooldown:.43,range:47,tier:'初始',desc:'一柄可靠的旧木剑。'},
  fangblade:{job:'swordsman',name:'兽牙短剑',slot:'weapon',attack:11,cooldown:.29,range:49,tier:'精良',recipe:{wood:4,fang:2,gel:2},desc:'轻快锋利，攻击速度提高。',icon:'sword'},
  leather:{name:'林行皮甲',slot:'armor',defense:3,hp:24,tier:'精良',recipe:{skin:4,gel:3},desc:'防御 +3，生命上限 +24。',icon:'armor'},
  ironsword:{job:'swordsman',name:'铁刃长剑',slot:'weapon',attack:19,cooldown:.42,range:63,tier:'稀有',recipe:{iron:8,fang:3,wood:3},desc:'更长的剑刃，攻击范围提高。',icon:'sword'},
  bonecharm:{dodgeBonus:.35,name:'骨纹护符',slot:'charm',tier:'稀有',recipe:{bone:6,crystal:2},desc:'闪避后 3 秒内，伤害提高 35%。',icon:'charm'},
  stonehammer:{job:'swordsman',name:'岩甲重锤',slot:'weapon',attack:29,cooldown:.65,range:60,breakArmor:true,tier:'稀有',recipe:{iron:10,crystal:3,bone:4},desc:'沉重一击，忽略敌人的护甲减伤。',icon:'hammer'},
  coreblade:{job:'swordsman',name:'风脊·破晓',slot:'weapon',attack:38,cooldown:.34,range:70,tier:'传说',recipe:{core:1,iron:8,crystal:4},desc:'首领核心铸成。攻击附带生命汲取。',icon:'sword'},
  ...EXTRA_GEAR,
};
export const RECIPES=Object.keys(GEAR).filter(id=>GEAR[id].recipe);
export const SLOT_NAMES={weapon:'武器',armor:'护甲',charm:'饰品'};
export function blankMats(){return Object.fromEntries(Object.keys(MATERIALS).map(id=>[id,0]));}
export function newState(job='swordsman'){if(!Object.hasOwn(JOBS,job))job='swordsman';const starter=JOBS[job].starter;return {version:1,bag:blankMats(),bank:blankMats(),owned:[starter],equipped:{weapon:starter,armor:null,charm:null},
  hp:100,level:1,xp:0,gold:0,potions:3,crafted:[],kills:{slime:0,boar:0,skeleton:0,elite:0,boss:0,...Object.fromEntries(Object.keys(NEW_ENEMIES).map(id=>[id,0]))},quest:0,
  tracked:job==='swordsman'?'fangblade':`${job}_weapon_0`,position:null,started:false,playtime:0,
  job,branch:null,skillRanks:{},loadout:[...BASE_LOADOUT[job]],legacySkills:[],enhancements:{},story:0,
  visited:[],regionKills:{},bossWins:{},gathered:blankMats(),commissionClaims:{},region:'town',
  bestiary:Object.fromEntries(Object.keys(NEW_ENEMIES).map(id=>[id,0]))};}
export function stats(s){const w=GEAR[s.equipped.weapon]||GEAR.starter,a=GEAR[s.equipped.armor]||{},c=GEAR[s.equipped.charm]||{};
  const boost=id=>1+(s.enhancements?.[id]||0)*.04,round=n=>Math.round(n*10)/10;
  const guardian=s.branch==='guardian',level=s.level||1,branchDamage=['blade','ranger','artillerist'].includes(s.branch) ? .15 : s.branch==='inquisitor' ? .2 : 0;
  return {attack:round(w.attack*boost(s.equipped.weapon)+(level-1)*1.5),defense:round((a.defense||0)*boost(s.equipped.armor)+(guardian?12:0)+(level>=60&&s.branch?6:0)),maxHp:Math.round((100+(level-1)*6+(a.hp||0)*boost(s.equipped.armor)+(c.hp||0)*boost(s.equipped.charm))*(guardian?1.15:1)),range:w.range,cooldown:w.cooldown,breakArmor:!!w.breakArmor,damageBonus:(c.damageBonus||0)*boost(s.equipped.charm)+branchDamage+(level>=60&&s.branch ? .05 : 0),dodgeBonus:(c.dodgeBonus||0)*boost(s.equipped.charm),supportBonus:s.branch==='oracle'?1.25:1};}
export function materialTotal(s,id){return (s.bag[id]||0)+(s.bank[id]||0);}
export function addMaterials(s,items){for(const [id,count] of Object.entries(items))if(Object.hasOwn(MATERIALS,id)&&Number.isFinite(count)){const n=Math.max(0,Math.floor(count));s.bag[id]=Math.min(9999,(s.bag[id]||0)+n);if(s.gathered)s.gathered[id]=Math.min(999999,(s.gathered[id]||0)+n);}}
export function canCraft(s,id){const g=GEAR[id];return !!g?.recipe&&!s.owned.includes(id)&&(!g.job||g.job===s.job)&&s.level>=(g.level||1)&&Object.entries(g.recipe).every(([m,n])=>materialTotal(s,m)>=n);}
export function craft(s,id){if(!canCraft(s,id))return {ok:false,reason:s.owned.includes(id)?'已经拥有这件装备':'材料不足'};
  for(const [m,n] of Object.entries(GEAR[id].recipe)){const fromBag=Math.min(n,s.bag[m]);s.bag[m]-=fromBag;s.bank[m]-=n-fromBag;}
  s.owned.push(id);s.crafted.push(id);return {ok:true,item:id};}
export function equip(s,id){const g=GEAR[id];if(!g||!s.owned.includes(id)||(g.job&&g.job!==s.job)||s.level<(g.level||1))return false;s.equipped[g.slot]=id;s.hp=Math.min(s.hp,stats(s).maxHp);return true;}
export function unequip(s,slot){if(!['armor','charm','weapon'].includes(slot))return false;s.equipped[slot]=slot==='weapon'?JOBS[s.job||'swordsman'].starter:null;s.hp=Math.min(s.hp,stats(s).maxHp);return true;}
export function deposit(s){for(const id of Object.keys(MATERIALS)){const n=Math.min(s.bag[id],Math.max(0,9999-s.bank[id]));s.bank[id]+=n;s.bag[id]-=n;}}
export function awardXp(s,n){if(!Number.isFinite(n)||n<=0)return 0;s.xp+=Math.floor(n);let levels=0;while(s.level<LEVEL_CAP&&s.xp>=s.level*60){s.xp-=s.level*60;s.level++;levels++;}if(s.level===LEVEL_CAP)s.xp=0;if(levels)s.hp=stats(s).maxHp;return levels;}
export function enhancementCost(s,id){const g=GEAR[id],rank=s.enhancements?.[id]||0;if(!g||!s.owned.includes(id)||rank>=10||g.tier==='初始')return null;const material=g.recipe?Object.keys(g.recipe)[0]:'iron';return {rank,gold:(rank+1)*(25+Math.floor((g.level||1)/10)*20),materials:{[material]:2+rank,crystal:1+Math.floor(rank/3)}};}
export function enhance(s,id){const cost=enhancementCost(s,id);if(!cost||s.gold<cost.gold||Object.entries(cost.materials).some(([m,n])=>materialTotal(s,m)<n))return {ok:false,reason:'材料或金币不足，或已强化至上限'};for(const [m,n] of Object.entries(cost.materials)){const bag=Math.min(s.bag[m],n);s.bag[m]-=bag;s.bank[m]-=n-bag;}s.gold-=cost.gold;s.enhancements[id]=cost.rank+1;return {ok:true,rank:cost.rank+1};}
export function sellMaterial(s,id,n=1){if(!Object.hasOwn(MATERIALS,id)||!Number.isInteger(n)||n<=0||s.bag[id]<n)return false;s.bag[id]-=n;s.gold+=n*(id==='core'?60:id in EXTRA_MATERIALS?8:id==='wood'||id==='gel'?2:4);return true;}
export function die(s){const lost={};for(const id of Object.keys(MATERIALS)){const n=Math.floor(s.bag[id]*.2);if(n){s.bag[id]-=n;lost[id]=n;}}s.hp=stats(s).maxHp;return lost;}
export function saveState(s,position){return JSON.stringify({...s,position:{x:position.x,y:position.y}});}
export function loadState(raw){let v;try{v=JSON.parse(raw);}catch{return newState();}if(!v||v.version!==1)return newState();const s=newState(Object.hasOwn(JOBS,v.job)?v.job:'swordsman');
  const count=(n,max=9999)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
  for(const key of ['bag','bank'])for(const id of Object.keys(MATERIALS))s[key][id]=count(v[key]?.[id]);
  s.owned=[...new Set([JOBS[s.job].starter,...(Array.isArray(v.owned)?v.owned:[]).filter(id=>Object.hasOwn(GEAR,id))])];
  for(const slot of Object.keys(s.equipped)){const id=v.equipped?.[slot];if(s.owned.includes(id)&&GEAR[id].slot===slot&&(!GEAR[id].job||GEAR[id].job===s.job))s.equipped[slot]=id;}
  s.level=Math.max(1,count(v.level,LEVEL_CAP));s.xp=s.level===LEVEL_CAP?0:count(v.xp,s.level*60-1);s.gold=count(v.gold,999999);s.potions=count(v.potions,99);
  s.crafted=(Array.isArray(v.crafted)?v.crafted:[]).filter(id=>s.owned.includes(id)&&RECIPES.includes(id));
  for(const id of Object.keys(s.kills))s.kills[id]=count(v.kills?.[id],99999);
  s.quest=count(v.quest,6);s.tracked=RECIPES.includes(v.tracked)&&(!GEAR[v.tracked].job||GEAR[v.tracked].job===s.job)?v.tracked:s.tracked;s.started=!!v.started;s.playtime=count(v.playtime,1e9);
  s.branch=Object.hasOwn(JOBS[s.job].branches,v.branch)&&s.level>=15?v.branch:null;
  s.legacySkills=!v.job&&s.job==='swordsman'?[...BASE_LOADOUT.swordsman]:(Array.isArray(v.legacySkills)?v.legacySkills.filter(id=>BASE_LOADOUT.swordsman.includes(id)&&s.job==='swordsman'):[]);
  for(const [id,d] of Object.entries(SKILL_BOOK))if(d.job===s.job&&(!d.branch||d.branch===s.branch)&&s.level>=d.level){const cap=id.endsWith('awakening')?Math.min(3,1+Math.floor((s.level-50)/5)):Math.min(10,1+Math.floor((s.level-d.level)/3));s.skillRanks[id]=Math.max(1,count(v.skillRanks?.[id],cap));}
  if(spentSp(s)>s.level-1)s.skillRanks={};
  const slots=Array.isArray(v.loadout)?v.loadout:BASE_LOADOUT[s.job];s.loadout=Array.from({length:4},(_,i)=>{const id=slots[i],d=SKILL_BOOK[id];return d?.job===s.job&&(!d.branch||d.branch===s.branch)?id:BASE_LOADOUT[s.job][i];});if(new Set(s.loadout).size!==4)s.loadout=[...BASE_LOADOUT[s.job]];
  for(const id of s.owned)s.enhancements[id]=count(v.enhancements?.[id],10);
  s.story=count(v.story,24);s.visited=(Array.isArray(v.visited)?v.visited:[]).filter(id=>Object.hasOwn(REGIONS,id));s.region=Object.hasOwn(REGIONS,v.region)?v.region:'town';
  for(const id of ADVENTURE_REGIONS){s.regionKills[id]=count(v.regionKills?.[id],999999);s.commissionClaims[id]=count(v.commissionClaims?.[id],99999);}
  for(const id of ['boss',...Object.keys(NEW_ENEMIES)]){s.bossWins[id]=count(v.bossWins?.[id],99999);s.bestiary[id]=count(v.bestiary?.[id],999999);}
  for(const id of Object.keys(MATERIALS))s.gathered[id]=count(v.gathered?.[id],999999);
  s.hp=Number.isFinite(v.hp)?Math.max(1,Math.min(stats(s).maxHp,v.hp)):stats(s).maxHp;
  if(Number.isFinite(v.position?.x)&&Number.isFinite(v.position?.y))s.position={x:Math.max(16,Math.min(16000,v.position.x)),y:Math.max(16,Math.min(16000,v.position.y))};
  return s;}
