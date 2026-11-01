// Content shared by the game, map builder and progression checks.
export const LEVEL_CAP=60;
export const JOBS={
  swordsman:{name:'剑士',tag:'近战 · 连击 · 打断',color:'#8fcddd',starter:'starter',branches:{blade:{name:'御剑者',desc:'剑技伤害提高 15%，擅长连续出招。'},guardian:{name:'铁壁卫士',desc:'生命提高 15%，防御提高 12，适合稳健近战。'}}},
  gunner:{name:'枪手',tag:'远程 · 弹道 · 爆发',color:'#dda76d',starter:'traininggun',branches:{ranger:{name:'游击枪手',desc:'射击伤害提高 15%，擅长穿透与机动。'},artillerist:{name:'重炮专家',desc:'爆炸范围提高 20%，重火力伤害提高 15%。'}}},
  cleric:{name:'圣职者',tag:'辅助 · 治疗 · 圣光输出',color:'#ddd69b',starter:'pilgrimstaff',branches:{oracle:{name:'祈光使',desc:'治疗与护盾提高 25%，圣光同样可以独立作战。'},inquisitor:{name:'裁决者',desc:'圣光伤害提高 20%，以攻击维持战斗节奏。'}}},
};
const skill=(job,name,level,pattern,cost,cooldown,power,extra={})=>({job,name,short:name,level,pattern,cost,cooldown,power,duration:.25,...extra});
export const SKILL_BOOK={
  triple:skill('swordsman','破风三连',1,'classic',18,4,3.5,{duration:.54,desc:'三段剑击，末段打断。'}),
  dash:skill('swordsman','追影突刺',5,'classic',22,6,2.3,{duration:.32,desc:'直线突进，短暂无敌，命中同一目标一次。'}),
  crescent:skill('swordsman','回风拔斩',10,'classic',28,9,3.2,{duration:.28,desc:'大扇形剑气，打断敌人蓄力。'}),
  storm:skill('swordsman','千刃剑阵',20,'classic',45,30,7.5,{duration:.22,desc:'五次剑击与终结爆发，落阵后可自由行动。'}),
  bladewave:skill('swordsman','流光剑波',30,'beam',26,7,3.8,{branch:'blade',color:'#8cdeed',desc:'斩出贯穿直线的剑波。'}),
  bladestorm:skill('swordsman','回旋剑域',40,'field',40,18,7.2,{branch:'blade',radius:145,desc:'在前方展开持续剑域，分四次造成伤害。'}),
  shieldbash:skill('swordsman','铁壁冲击',30,'nova',25,8,3.5,{branch:'guardian',shield:.12,radius:110,desc:'近身冲击并获得生命上限 12% 的护盾。'}),
  steelguard:skill('swordsman','不屈壁垒',40,'guard',35,18,2.8,{branch:'guardian',shield:.3,radius:120,desc:'冲击周围敌人，获得 30% 生命上限护盾。'}),
  swordawakening:skill('swordsman','觉醒 · 天穹断界',50,'awakening',60,50,14,{radius:260,desc:'短暂蓄力后斩击大范围敌人。'}),
  doubleshot:skill('gunner','疾速双射',1,'shot',14,3,2.3,{count:2,desc:'向瞄准方向射出两发快速子弹。'}),
  scatter:skill('gunner','散射弹幕',5,'fan',20,6,3.6,{count:5,desc:'扇形发射五颗弹丸，可命中不同目标。'}),
  grenade:skill('gunner','爆破手雷',10,'grenade',26,9,4,{radius:100,desc:'向前投出手雷，落点爆炸造成范围伤害。'}),
  turret:skill('gunner','哨戒机炮',20,'turret',36,22,7,{desc:'部署机炮，自动瞄准并射击四次。'}),
  piercing:skill('gunner','贯甲狙击',30,'beam',28,8,4.5,{branch:'ranger',desc:'远距离贯穿射击。'}),
  bulletdance:skill('gunner','环身弹雨',40,'nova',38,16,7,{branch:'ranger',radius:190,desc:'向周围连续倾泻弹幕。'}),
  rocket:skill('gunner','烈焰火箭',30,'grenade',30,9,5,{branch:'artillerist',radius:135,desc:'发射远程火箭，爆炸覆盖更广区域。'}),
  bombard:skill('gunner','定点轰炸',40,'field',42,20,8,{branch:'artillerist',radius:155,desc:'标记前方区域，分四轮轰炸。'}),
  gunawakening:skill('gunner','觉醒 · 终幕齐射',50,'awakening',60,50,14,{radius:260,desc:'锁定前方区域，以密集火力终结战斗。'}),
  holybolt:skill('cleric','光矢',1,'shot',12,3,2.5,{color:'#f1dda1',desc:'射出可用于独立作战的圣光弹。'}),
  prayer:skill('cleric','治愈祷言',5,'heal',24,12,0,{heal:.22,desc:'恢复生命上限 22% 的生命，不超过上限。'}),
  sanctuary:skill('cleric','守护圣印',10,'guard',28,14,2,{shield:.22,radius:100,desc:'获得护盾并以圣印伤害周围敌人。'}),
  judgment:skill('cleric','裁决光柱',20,'field',36,18,6.5,{radius:125,desc:'在前方降下四次圣光裁决。'}),
  blessing:skill('cleric','祈光祝福',30,'bless',24,16,0,{branch:'oracle',desc:'八秒内提高自身伤害 25%，并恢复少量生命。'}),
  healingfield:skill('cleric','净化圣域',40,'sanctuary',40,22,5,{branch:'oracle',radius:150,heal:.12,desc:'四次圣光伤害，同时持续治疗自己。'}),
  holyspear:skill('cleric','破邪光枪',30,'beam',25,7,4.5,{branch:'inquisitor',desc:'以贯穿的圣光长枪制敌。'}),
  verdict:skill('cleric','神罚烙印',40,'nova',38,17,7.5,{branch:'inquisitor',radius:180,desc:'在周围爆发圣光，打断敌人蓄力。'}),
  clericawakening:skill('cleric','觉醒 · 晨曦降临',50,'awakening',60,50,11,{radius:260,heal:.35,desc:'圣光爆发伤害敌人并恢复自身生命。'}),
};
export const BASE_LOADOUT={swordsman:['triple','dash','crescent','storm'],gunner:['doubleshot','scatter','grenade','turret'],cleric:['holybolt','prayer','sanctuary','judgment']};
export const REGIONS={
  town:{name:'溪谷镇',min:1,max:60,theme:'town',desc:'五间店铺、仓库、转职与休整。'},
  meadow:{name:'溪畔原野',min:1,max:10,theme:'meadow',resource:'wood',boss:'boss',desc:'沿溪采木，打造第一件装备。'},
  mine:{name:'废矿深窟',min:11,max:20,theme:'mine',resource:'iron',boss:'mineking',desc:'探索矿轨与废弃采场，寻找铁矿和晶石。'},
  forest:{name:'幽苔森林',min:21,max:30,theme:'forest',resource:'moss',boss:'elderstag',desc:'苔木林、曲溪与遗忘树庭。'},
  dunes:{name:'赤砂荒原',min:31,max:40,theme:'dunes',resource:'amber',boss:'sandking',desc:'穿越绿洲木桥与遗迹，追猎赤砂蝎王。'},
  frost:{name:'霜脊雪岭',min:41,max:50,theme:'frost',resource:'frost',boss:'iceking',desc:'沿冰河与雪松山径抵达冰晶祭坛。'},
  rift:{name:'余烬裂谷',min:51,max:60,theme:'rift',resource:'ember',boss:'cinderdrake',desc:'熔流、焦林与古龙巢，完成终章锻造。'},
};
export const ADVENTURE_REGIONS=Object.keys(REGIONS).filter(id=>id!=='town');
export const EXTRA_MATERIALS={moss:{name:'灵苔',color:'#9fc496',where:'幽苔森林 · 灵苔采集点'},amber:{name:'赤琥珀',color:'#d8a368',where:'赤砂荒原 · 琥珀矿'},frost:{name:'霜晶',color:'#abdbe6',where:'霜脊雪岭 · 霜晶矿'},ember:{name:'余烬石',color:'#e4a180',where:'余烬裂谷 · 余烬矿'}};
export const EXTRA_GEAR={
  traininggun:{name:'练习短铳',slot:'weapon',job:'gunner',attack:6,cooldown:.45,range:350,tier:'初始',desc:'可靠的远程练习枪。',icon:'gun'},
  pilgrimstaff:{name:'旅祷短杖',slot:'weapon',job:'cleric',attack:6,cooldown:.48,range:280,tier:'初始',desc:'能够发射圣光的短杖。',icon:'staff'},
};
const tierNames=['精良','稀有','稀有','史诗','史诗','传说'];
const materials=['wood','iron','moss','amber','frost','ember'];
const gearNames={gunner:['兽牙短铳','精铁连铳','苔纹猎枪','赤砂穿甲枪','霜痕重铳','余烬·逐日'],cleric:['凝光短杖','晶铁祷杖','幽林灵杖','琥珀圣典','霜华权杖','晨曦·归途'],swordsman:['兽牙短剑','铁刃长剑','幽苔长刃','赤砂战刃','霜脊断锋','终焰·铸途']};
for(let t=0;t<6;t++){
  const level=[1,11,21,31,41,51][t],mat=materials[t],recipe={[mat]:[4,8,10,12,14,16][t],crystal:t+1};
  for(const job of Object.keys(JOBS)){
    if(job==='swordsman'&&t<2)continue;
    EXTRA_GEAR[`${job}_weapon_${t}`]={name:gearNames[job][t],slot:'weapon',job,level,attack:[11,28,52,80,114,154][t],cooldown:job==='gunner'?.38:job==='cleric'?.47:.37,range:job==='gunner'?400:job==='cleric'?320:65,tier:tierNames[t],recipe:{...(t===0?{wood:4,gel:2}:recipe),fang:t+2},icon:job==='gunner'?'gun':job==='cleric'?'staff':'sword',desc:`${level}级${JOBS[job].name}武器，攻击力与职业技能共同成长。`};
  }
  if(t>0)EXTRA_GEAR[`armor_${t}`]={name:['','矿工锁甲','幽苔战衣','赤砂护甲','霜脊重衣','余烬守望'][t],slot:'armor',level,defense:[3,9,17,27,40,55][t],hp:[24,60,110,180,270,380][t],tier:tierNames[t],recipe:{...recipe,skin:4+t*2},icon:'armor',desc:'提升防御与生命上限，适用于所有职业。'};
  EXTRA_GEAR[`charm_${t}`]={name:['溪谷坠饰','矿晶护符','灵苔徽记','赤琥珀印','霜华指环','归途誓约'][t],slot:'charm',level,damageBonus:.03+t*.025,hp:10+t*15,tier:tierNames[t],recipe:{[mat]:3+t*2,gel:3+t,bone:t*2},icon:'charm',desc:`伤害提高 ${3+t*2.5}%，并增加生命上限。`};
}
const enemy=(name,family,level,hp,attack,drop,extra={})=>({name,family,level,hp,attack,drop,speed:52,range:30,aggro:190,r:11,scale:1.5,delay:.65,color:'#b3bd92',xp:Math.round(level*7),gold:Math.round(level*2.4),rank:'normal',...extra});
export const NEW_ENEMIES={
  mineking:enemy('晶岩巨像','golem',20,1800,32,{core:1,iron:10,crystal:5},{rank:'boss',r:26,xp:650,gold:200}),
  mossling:enemy('苔芽精','plant',23,420,28,{moss:2,gel:2}),
  webspider:enemy('织影蛛','spider',25,380,30,{moss:1,skin:2},{ranged:true,range:205,speed:38}),
  thornwarden:enemy('荆棘守卫','golem',27,1050,38,{moss:4,crystal:3},{rank:'elite',r:17,armor:.2,xp:330}),
  elderstag:enemy('古树灵鹿','stag',30,3600,45,{core:1,moss:8,crystal:5},{rank:'boss',r:26,xp:1050,gold:320}),
  sandcrawler:enemy('赤砂甲虫','beetle',33,700,43,{amber:2,skin:2}),
  dustraider:enemy('流砂掠夺者','raider',35,650,47,{amber:1,bone:2},{ranged:true,range:230}),
  scarabguard:enemy('重壳沙卫','beetle',37,1650,55,{amber:4,iron:5},{rank:'elite',r:18,armor:.25,xp:470}),
  sandking:enemy('赤砂蝎王','scorpion',40,6000,65,{core:1,amber:8,crystal:6},{rank:'boss',r:26,xp:1450,gold:440}),
  frostwolf:enemy('霜牙狼','wolf',43,1050,58,{frost:2,skin:3},{speed:78}),
  icewisp:enemy('冰原灵火','wisp',45,900,62,{frost:2,crystal:1},{ranged:true,range:210}),
  frostknight:enemy('冰甲骑卫','knight',47,2400,75,{frost:4,bone:4},{rank:'elite',r:17,armor:.25,xp:610}),
  iceking:enemy('冰川巨灵','golem',50,8500,90,{core:1,frost:8,crystal:7},{rank:'boss',r:26,xp:1850,gold:560}),
  emberimp:enemy('灰烬小鬼','imp',53,1450,78,{ember:2,gel:3},{speed:70}),
  ashsentinel:enemy('焦土哨兵','raider',55,1350,85,{ember:2,bone:3},{ranged:true,range:240}),
  lavaguard:enemy('熔铠守卫','knight',57,3300,100,{ember:4,iron:6},{rank:'elite',r:18,armor:.3,xp:750}),
  cinderdrake:enemy('余烬古龙','drake',60,12000,120,{core:2,ember:10,crystal:8},{rank:'boss',r:26,xp:2400,gold:800}),
};
export const REGIONAL_TYPES={forest:['mossling','webspider','thornwarden','elderstag'],dunes:['sandcrawler','dustraider','scarabguard','sandking'],frost:['frostwolf','icewisp','frostknight','iceking'],rift:['emberimp','ashsentinel','lavaguard','cinderdrake']};
export function xpNeeded(level){return level>=LEVEL_CAP?0:level*60;}
export function skillAvailable(s,id){const d=SKILL_BOOK[id];return !!d&&d.job===s.job&&(!id.endsWith('awakening')||!!s.branch)&&(!d.branch||d.branch===s.branch)&&(s.level>=d.level||(s.legacySkills||[]).includes(id));}
export function skillRank(s,id){return skillAvailable(s,id)?Math.max(1,Math.min(id.endsWith('awakening')?3:10,s.skillRanks?.[id]||1)):0;}
export function skillMultiplier(s,id){return 1+(skillRank(s,id)-1)*.12;}
export function spentSp(s){return Object.entries(s.skillRanks||{}).reduce((sum,[id,rank])=>sum+(SKILL_BOOK[id]?Math.max(0,rank-1)*(id.endsWith('awakening')?3:1):0),0);}
export function availableSp(s){return Math.max(0,s.level-1-spentSp(s));}
export function skillRankLimit(s,id){return id.endsWith('awakening')?Math.min(3,1+Math.floor((s.level-50)/5)):Math.max(1,Math.min(10,1+Math.floor((s.level-(SKILL_BOOK[id]?.level||1))/3)));}
export function upgradeSkill(s,id){const rank=skillRank(s,id),cost=id.endsWith('awakening')?3:1;if(!rank||rank>=skillRankLimit(s,id)||availableSp(s)<cost)return {ok:false,reason:'等级或 SP 不足，或已达当前上限'};s.skillRanks[id]=rank+1;return {ok:true};}
export function assignSkill(s,id,slot){if(!skillAvailable(s,id)||!Number.isInteger(slot)||slot<0||slot>3)return false;const previous=s.loadout.indexOf(id),old=s.loadout[slot];s.loadout[slot]=id;if(previous>=0&&previous!==slot)s.loadout[previous]=old;return true;}
export function chooseBranch(s,branch){if(s.level<15||!Object.hasOwn(JOBS[s.job].branches,branch))return false;s.branch=branch;s.skillRanks={};s.loadout=[...BASE_LOADOUT[s.job]];return true;}
export function resetSkills(s){s.skillRanks={};}
export function canEnterRegion(s,id){if(id==='town'||id==='meadow')return true;const i=ADVENTURE_REGIONS.indexOf(id);return i>=0&&(s.level>=REGIONS[id].min||s.story>=i*4);}
export function currentStory(s){
  const chapter=Math.min(5,Math.floor(s.story/4)),step=s.story%4,id=ADVENTURE_REGIONS[chapter],region=REGIONS[id];
  if(s.story>=24)return {done:true,title:'溪谷铸途 · 终章完成',desc:'自由探索、培养其他职业、打造终章装备，或继续区域委托。',line:'六章冒险完成',goal:'24 / 24',progress:1,region:id};
  const values=[s.visited?.includes(id)?1:0,s.regionKills?.[id]||0,s.gathered?.[region.resource]||0,s.bossWins?.[region.boss]||0],targets=[1,8,6,1],value=Math.min(targets[step],values[step]);
  const names=['踏入新的旅途','清理沿途威胁','收集锻造材料','挑战区域首领'];
  return {chapter:chapter+1,step,region:id,title:`${region.name} · ${names[step]}`,desc:[`从安全城镇或区域入口前往${region.name}，开启本章。`,`在${region.name}击败八次怪物，可重复挑战普通怪与精英。`,`采集或通过战斗收集六份${EXTRA_MATERIALS[region.resource]?.name||({wood:'木材',iron:'铁矿'})[region.resource]}，用于本阶段装备。`,`挑战${region.name}的固定首领地标，完成本章。`][step],line:names[step],goal:`${value} / ${targets[step]}`,progress:value/targets[step],complete:value>=targets[step],xp:Math.round((2400+chapter*5600)*[.08,.19,.23,.5][step]),gold:60+chapter*65};
}
