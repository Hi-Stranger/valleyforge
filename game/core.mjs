export const SAVE_KEY = 'valleyforge-save-v1';
export const MATERIALS = {
  gel:{name:'凝胶',color:'#9cd8af',where:'林地史莱姆'},
  skin:{name:'兽皮',color:'#dba576',where:'荒野野猪'},
  fang:{name:'兽牙',color:'#e9e3ce',where:'荒野野猪'},
  wood:{name:'木材',color:'#bc8b60',where:'枯木、任务奖励'},
  iron:{name:'铁矿',color:'#a6b8c6',where:'矿点、骷髅'},
  bone:{name:'骨片',color:'#d8d7c4',where:'山地骷髅'},
  crystal:{name:'晶石',color:'#b5a4e4',where:'晶矿、岩甲守卫'},
  core:{name:'首领核心',color:'#edbd6e',where:'荒牙野猪王'},
};
export const GEAR = {
  starter:{name:'旅人木剑',slot:'weapon',attack:6,cooldown:.43,range:47,tier:'初始',desc:'一柄可靠的旧木剑。'},
  fangblade:{name:'兽牙短剑',slot:'weapon',attack:11,cooldown:.29,range:49,tier:'精良',recipe:{wood:4,fang:2,gel:2},desc:'轻快锋利，攻击速度提高。',icon:'sword'},
  leather:{name:'林行皮甲',slot:'armor',defense:3,hp:24,tier:'精良',recipe:{skin:4,gel:3},desc:'防御 +3，生命上限 +24。',icon:'armor'},
  ironsword:{name:'铁刃长剑',slot:'weapon',attack:19,cooldown:.42,range:63,tier:'稀有',recipe:{iron:8,fang:3,wood:3},desc:'更长的剑刃，攻击范围提高。',icon:'sword'},
  bonecharm:{name:'骨纹护符',slot:'charm',tier:'稀有',recipe:{bone:6,crystal:2},desc:'闪避后 3 秒内，伤害提高 35%。',icon:'charm'},
  stonehammer:{name:'岩甲重锤',slot:'weapon',attack:29,cooldown:.65,range:60,breakArmor:true,tier:'稀有',recipe:{iron:10,crystal:3,bone:4},desc:'沉重一击，忽略敌人的护甲减伤。',icon:'hammer'},
  coreblade:{name:'风脊·破晓',slot:'weapon',attack:38,cooldown:.34,range:70,tier:'传说',recipe:{core:1,iron:8,crystal:4},desc:'首领核心铸成。攻击附带生命汲取。',icon:'sword'},
};
export const RECIPES=Object.keys(GEAR).filter(id=>GEAR[id].recipe);
export const SLOT_NAMES={weapon:'武器',armor:'护甲',charm:'饰品'};
export function blankMats(){return Object.fromEntries(Object.keys(MATERIALS).map(id=>[id,0]));}
export function newState(){return {version:1,bag:blankMats(),bank:blankMats(),owned:['starter'],equipped:{weapon:'starter',armor:null,charm:null},
  hp:100,level:1,xp:0,gold:0,potions:3,crafted:[],kills:{slime:0,boar:0,skeleton:0,elite:0,boss:0},quest:0,
  tracked:'fangblade',position:null,started:false,playtime:0};}
export function stats(s){const w=GEAR[s.equipped.weapon]||GEAR.starter,a=GEAR[s.equipped.armor]||{};
  return {attack:w.attack+(s.level-1)*1.5,defense:a.defense||0,maxHp:100+(s.level-1)*6+(a.hp||0),range:w.range,cooldown:w.cooldown,breakArmor:!!w.breakArmor};}
export function materialTotal(s,id){return (s.bag[id]||0)+(s.bank[id]||0);}
export function addMaterials(s,items){for(const [id,count] of Object.entries(items))if(id in MATERIALS&&Number.isFinite(count))s.bag[id]=Math.min(9999,s.bag[id]+Math.max(0,Math.floor(count)));}
export function canCraft(s,id){const g=GEAR[id];return !!g?.recipe&&!s.owned.includes(id)&&Object.entries(g.recipe).every(([m,n])=>materialTotal(s,m)>=n);}
export function craft(s,id){if(!canCraft(s,id))return {ok:false,reason:s.owned.includes(id)?'已经拥有这件装备':'材料不足'};
  for(const [m,n] of Object.entries(GEAR[id].recipe)){const fromBag=Math.min(n,s.bag[m]);s.bag[m]-=fromBag;s.bank[m]-=n-fromBag;}
  s.owned.push(id);s.crafted.push(id);return {ok:true,item:id};}
export function equip(s,id){const g=GEAR[id];if(!g||!s.owned.includes(id))return false;s.equipped[g.slot]=id;s.hp=Math.min(s.hp,stats(s).maxHp);return true;}
export function unequip(s,slot){if(!['armor','charm','weapon'].includes(slot))return false;s.equipped[slot]=slot==='weapon'?'starter':null;s.hp=Math.min(s.hp,stats(s).maxHp);return true;}
export function deposit(s){for(const id of Object.keys(MATERIALS)){s.bank[id]+=s.bag[id];s.bag[id]=0;}}
export function awardXp(s,n){s.xp+=n;let levels=0;while(s.level<20&&s.xp>=s.level*60){s.xp-=s.level*60;s.level++;levels++;}if(levels)s.hp=stats(s).maxHp;return levels;}
export function die(s){const lost={};for(const id of Object.keys(MATERIALS)){const n=Math.floor(s.bag[id]*.2);if(n){s.bag[id]-=n;lost[id]=n;}}s.hp=stats(s).maxHp;return lost;}
export function saveState(s,position){return JSON.stringify({...s,position:{x:position.x,y:position.y}});}
export function loadState(raw){let v;try{v=JSON.parse(raw);}catch{return newState();}if(!v||v.version!==1)return newState();const s=newState();
  const count=(n,max=9999)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
  for(const key of ['bag','bank'])for(const id of Object.keys(MATERIALS))s[key][id]=count(v[key]?.[id]);
  s.owned=[...new Set(['starter',...(Array.isArray(v.owned)?v.owned:[]).filter(id=>Object.hasOwn(GEAR,id))])];
  for(const slot of Object.keys(s.equipped)){const id=v.equipped?.[slot];if(s.owned.includes(id)&&GEAR[id].slot===slot)s.equipped[slot]=id;}
  s.level=Math.max(1,count(v.level,20));s.xp=count(v.xp,s.level*60-1);s.gold=count(v.gold,999999);s.potions=count(v.potions,99);
  s.hp=Number.isFinite(v.hp)?Math.max(1,Math.min(stats(s).maxHp,v.hp)):stats(s).maxHp;
  s.crafted=(Array.isArray(v.crafted)?v.crafted:[]).filter(id=>s.owned.includes(id)&&RECIPES.includes(id));
  for(const id of Object.keys(s.kills))s.kills[id]=count(v.kills?.[id],99999);
  s.quest=count(v.quest,6);s.tracked=RECIPES.includes(v.tracked)?v.tracked:'fangblade';s.started=!!v.started;s.playtime=count(v.playtime,1e9);
  if(Number.isFinite(v.position?.x)&&Number.isFinite(v.position?.y))s.position={x:Math.max(16,Math.min(2544,v.position.x)),y:Math.max(16,Math.min(1776,v.position.y))};
  return s;}
