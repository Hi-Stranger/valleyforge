import {SKILL_BOOK,skillMultiplier} from './rpg-data.mjs';
import {stats} from './core.mjs';
import {segmentDistance} from './boar-king.mjs';

export function createProfessionCombat(api){
  const shots=[],fields=[],effects=[];let shield=0,shieldTime=0,blessing=0,blessingPower=1.25;
  const color=()=>api.state().job==='gunner'?'#e9bd79':'#f1e2a8';
  const attackPower=()=>{const s=api.state(),st=stats(s);return st.attack*(1+st.damageBonus)*(blessing>0?blessingPower:1)*(api.player().charmBuff>0?1+st.dodgeBonus:1);};
  const addShot=(angle,power,extra={})=>{const p=api.player();shots.push({x:p.x,y:p.y-12,angle,speed:580,life:1.05,power,color:color(),hit:new Set(),...extra});};
  function heal(fraction){const s=api.state(),max=stats(s).maxHp,amount=Math.min(max-s.hp,Math.round(max*fraction*stats(s).supportBonus));s.hp+=amount;if(amount>0)api.float('+'+amount,api.player().x,api.player().y-42,'#bee09f');}
  function giveShield(fraction){shield=Math.max(shield,Math.round(stats(api.state()).maxHp*fraction*stats(api.state()).supportBonus));shieldTime=10;}
  function cast(id,angle){const s=api.state(),p=api.player(),d=SKILL_BOOK[id],power=attackPower()*skillMultiplier(s,id)*d.power,c=s.job==='gunner'?'#e9ac6b':'#f1dda1';
    const radius=(d.radius||110)*(s.branch==='artillerist'?1.2:1),target=api.findFree(p.x+Math.cos(angle)*220,p.y+Math.sin(angle)*220,8);
    if(d.heal)heal(d.pattern==='sanctuary'?0:d.heal*skillMultiplier(s,id));if(d.shield)giveShield(d.shield*skillMultiplier(s,id));
    if(d.pattern==='heal'||d.pattern==='bless'){if(d.pattern==='bless'){blessing=8;blessingPower=1+.25*skillMultiplier(s,id);heal(.08*skillMultiplier(s,id));}effects.push({kind:'ring',x:p.x,y:p.y,radius:70,life:.7,max:.7,color:c});}
    if(d.pattern==='shot'){for(let i=0;i<(d.count||1);i++)addShot(angle,power/(d.count||1),{delay:i*.08});}
    if(d.pattern==='fan'){for(let i=0;i<d.count;i++)addShot(angle+(i-(d.count-1)/2)*.17,power/d.count,{life:.65});}
    if(d.pattern==='beam'){addShot(angle,power,{pierce:true,speed:900,life:.7,width:16});effects.push({kind:'beam',x:p.x,y:p.y-12,angle,life:.3,max:.3,color:c});}
    if(['grenade','field','sanctuary','turret','awakening'].includes(d.pattern))fields.push({id,kind:d.pattern,x:d.pattern==='turret'?p.x:target.x,y:d.pattern==='turret'?p.y:target.y,age:0,pulse:0,power,radius,color:c});
    if(['nova','guard'].includes(d.pattern)){effects.push({kind:'ring',x:p.x,y:p.y,radius,life:.6,max:.6,color:c});for(const e of [...api.enemies()])if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r)api.hit(e,power,true,true);}
  }
  function basic(angle,heavy){const s=api.state(),speed=heavy?800:600;addShot(angle,attackPower()*(heavy?2.3:1),{pierce:heavy,speed,life:stats(s).range*(heavy?1.25:1)/speed,width:heavy?13:5,color:s.job==='gunner'?'#f5ca83':'#f6e9ad'});}
  function enemyShot(e,angle){shots.push({x:e.x,y:e.y-10,angle,speed:225,life:2.5,power:e.attack,color:e.level>=50?'#e69c70':'#c2b2dd',enemy:true,hit:new Set()});}
  function update(dt){
    shieldTime=Math.max(0,shieldTime-dt);if(!shieldTime)shield=0;blessing=Math.max(0,blessing-dt);
    for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}
    for(let i=shots.length-1;i>=0;i--){const b=shots[i];if(b.delay>0){b.delay-=dt;continue;}const old={x:b.x,y:b.y},travel=Math.min(dt,Math.max(0,b.life));b.x+=Math.cos(b.angle)*b.speed*travel;b.y+=Math.sin(b.angle)*b.speed*travel;b.life-=dt;
      if(b.enemy){const p=api.player();if(segmentDistance({x:p.x,y:p.y-10},old,b)<p.r+7){api.hurt(b.power);b.life=0;}}
      else for(const e of [...api.enemies()])if(!b.hit.has(e.id)&&segmentDistance({x:e.x,y:e.y-10},old,b)<e.r+(b.width||5)){b.hit.add(e.id);api.hit(e,Math.round(b.power),!!b.pierce,true);if(!b.pierce)b.life=0;if(!api.active())return;if(!b.pierce)break;}
      if(b.x<35||b.x>925||b.y<62||b.y>428)b.life=0;if(b.life<=0)shots.splice(i,1);
    }
    for(const f of [...fields]){if(!fields.includes(f))continue;f.age+=dt;const single=['grenade','awakening'].includes(f.kind),beats=single?[f.kind==='awakening'?.8:.48]:[.3,.85,1.4,1.95];
      while(f.pulse<beats.length&&f.age>=beats[f.pulse]){f.pulse++;effects.push({kind:'ring',x:f.x,y:f.y,radius:f.radius,life:.48,max:.48,color:f.color});
        if(f.kind==='turret'){const target=api.enemies().reduce((a,b)=>!a||Math.hypot(b.x-f.x,b.y-f.y)<Math.hypot(a.x-f.x,a.y-f.y)?b:a,null);if(target){const a=Math.atan2(target.y-f.y,target.x-f.x);shots.push({x:f.x,y:f.y-14,angle:a,speed:650,life:1.2,power:f.power/4,color:f.color,hit:new Set()});}}
        else for(const e of [...api.enemies()])if(Math.hypot(e.x-f.x,e.y-f.y)<f.radius+e.r){api.hit(e,Math.round(f.power/beats.length),single,true);if(!api.active())return;}
        if(f.kind==='sanctuary')heal(SKILL_BOOK[f.id].heal*skillMultiplier(api.state(),f.id)/4);
      }
      if(f.pulse===beats.length&&f.age>beats.at(-1)+.35)fields.splice(fields.indexOf(f),1);
    }
  }
  function draw(c,pass){
    if(pass==='ground'){
      for(const f of fields){c.save();c.strokeStyle=f.color;c.fillStyle=f.color+'18';c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y,f.radius,f.radius*.65,0,0,Math.PI*2);c.fill();c.setLineDash([5,5]);c.stroke();c.restore();if(f.kind==='turret'){c.fillStyle='#394c4c';c.fillRect(f.x-10,f.y-18,20,16);c.fillStyle=f.color;c.fillRect(f.x-3,f.y-26,8,18);}}
      return;
    }
    for(const b of shots){if(b.delay>0)continue;c.save();c.translate(b.x,b.y);c.rotate(b.angle);c.fillStyle=b.color;c.fillRect(-12,-(b.width||3)/2,17,b.width||3);c.fillStyle='#fff1ca';c.fillRect(0,-1,6,2);c.restore();}
    for(const e of effects){c.save();c.globalAlpha=e.life/e.max;c.strokeStyle=e.color;c.lineWidth=3;c.beginPath();if(e.kind==='beam'){c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(e.angle)*380,e.y+Math.sin(e.angle)*380);}else c.ellipse(e.x,e.y,e.radius*(1-e.life/e.max*.5),e.radius*(1-e.life/e.max*.5)*.65,0,0,Math.PI*2);c.stroke();c.restore();}
    if(shield>0){const p=api.player();c.strokeStyle='#e1d9a8';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-22,25,34,0,0,Math.PI*2);c.stroke();}
  }
  return {cast,basic,enemyShot,update,draw,attackPower,absorb(n){const used=Math.min(shield,n);shield-=used;return n-used;},clear(){shots.length=fields.length=effects.length=0;shield=blessing=shieldTime=0;},snapshot(){return {projectiles:shots.length,fields:fields.length,shield,blessing};}};
}
