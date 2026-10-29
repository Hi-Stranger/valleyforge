// Distances are arena/world units. Random decisions use a timer, never frame rate.
export const BOAR_KING={near:115,medium:290,roarRadius:122,pounceRadius:55,rageRate:3,rageOnHit:12,
  roarChance:.8,pounceChance:.5,roarWindup:.6,pounceWindup:.6,pounceFlight:.75,
  chargeWindup:1.2,chargeLock:.9,chargeSpeed:520,chargeDuration:1.1,recovery:2.2};
export const BOAR_ACTIONS={idle:'观察距离',roar:'近身吼叫',pounce:'跃起扑击',chargeWindup:'跺脚蓄力',charge:'怒气冲撞',recover:'喘息 · 反击机会'};
export function createBoarKing(){return {rage:0,action:'idle',clock:0,cooldown:1.1,decision:0,height:0,target:null,start:null,direction:0,hit:false,landed:false,recovery:0,stomps:0};}
export function enrageBoarKing(e){e.boar.rage=Math.min(100,e.boar.rage+BOAR_KING.rageOnHit);}
export function interruptBoarKing(e){const b=e.boar;if((b.action==='roar'&&b.clock<BOAR_KING.roarWindup)||(b.action==='pounce'&&b.clock<BOAR_KING.pounceWindup)){b.action='recover';b.clock=0;b.recovery=.65;b.height=0;b.landingPose=false;return true;}return false;}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export function updateBoarKing(e,dt,{player,move,findFree,damage,emit=()=>{},random=Math.random}){
 const b=e.boar,c=BOAR_KING;let dist=Math.hypot(player.x-e.x,player.y-e.y);e.moving=false;b.clock+=dt;
 if(b.action!=='charge'&&b.action!=='recover')b.rage=Math.min(100,b.rage+c.rageRate*dt);
 const start=action=>{b.action=action;b.clock=0;b.hit=false;b.landed=false;b.stomps=0;b.height=0;emit(action,e);};
 const recover=(duration,landingPose=false)=>{start('recover');b.recovery=duration;b.landingPose=landingPose;};
 const face=()=>{e.angle=Math.atan2(player.y-e.y,player.x-e.x);};
 const strike=(amount,radius,point=e)=>{if(!b.hit){b.hit=true;if(Math.hypot(player.x-point.x,player.y-point.y)<=radius+player.r)damage(amount);}};
 if(b.action==='roar'){
  if(b.clock<c.roarWindup)face();
  if(b.clock>=c.roarWindup&&!b.hit){strike(14,c.roarRadius);emit('roarImpact',e);}
  if(b.clock>=1.8)recover(.65);return;
 }
 if(b.action==='pounce'){
  if(b.clock<c.pounceWindup)return;
  const p=Math.min(1,(b.clock-c.pounceWindup)/c.pounceFlight);
  e.x=b.start.x+(b.target.x-b.start.x)*p;e.y=b.start.y+(b.target.y-b.start.y)*p;b.height=Math.sin(p*Math.PI)*65;e.moving=p<1;
  if(p>=1&&!b.landed){b.landed=true;b.height=0;strike(18,c.pounceRadius);emit('pounceImpact',e);}
  if(p>=1)recover(.85,true);return;
 }
 if(b.action==='chargeWindup'){
  if(b.clock<c.chargeLock)face();b.direction=e.angle;
  const stomps=b.clock>=.9?2:b.clock>=.3?1:0;if(stomps>b.stomps){b.stomps=stomps;emit('stomp',e);}
  if(b.clock>=c.chargeWindup){b.rage=0;start('charge');}return;
 }
 if(b.action==='charge'){
  const from={x:e.x,y:e.y},dx=Math.cos(b.direction)*c.chargeSpeed*dt,dy=Math.sin(b.direction)*c.chargeSpeed*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));let moved=0;
  for(let i=0;i<steps;i++)moved+=move(e,dx/steps,dy/steps);e.moving=true;
  if(!b.hit&&segmentDistance(player,from,e)<=e.r+player.r+6){b.hit=true;damage(26);}
  if(b.clock>=c.chargeDuration||moved<Math.hypot(dx,dy)*.85){emit('chargeImpact',e);recover(c.recovery);}return;
 }
 if(b.action==='recover'){if(b.clock>=b.recovery){start('idle');b.cooldown=.65;b.decision=0;}return;}
 b.cooldown=Math.max(0,b.cooldown-dt);b.decision=Math.max(0,b.decision-dt);if(e.stun>0)return;
 face();
 if(b.cooldown<=0&&b.decision<=0){b.decision=.9+random()*.5;
  if(dist>c.medium&&b.rage>=100){start('chargeWindup');b.direction=e.angle;return;}
  if(dist<=c.near&&random()<c.roarChance){start('roar');return;}
  if(dist>c.near&&dist<=c.medium&&random()<c.pounceChance){start('pounce');b.start={x:e.x,y:e.y};b.target=findFree(player.x,player.y,e.r);return;}
 }
 // A failed random roll leaves a readable pause; it cannot be retried every frame.
 if(dist>c.near*.78){e.moving=move(e,Math.cos(e.angle)*e.speed*dt,Math.sin(e.angle)*e.speed*dt)>.01;}
}

export function boarKingFrame(e,time){const b=e.boar;
 if(!b)return {sheet:'motion',frame:e.moving?Math.floor(time*9)%4:4,height:0};
 const t=b.clock;
 if(b.action==='roar')return {sheet:'motion',frame:t<.25?4:t<.6?5:t<1.4?6:7,height:0};
 if(b.action==='pounce'){const p=(t-BOAR_KING.pounceWindup)/BOAR_KING.pounceFlight;return {sheet:'pounce',frame:t<.25?0:t<.6?1:p<.22?2:p<.65?3:4,height:b.height};}
 if(b.action==='chargeWindup')return {sheet:'motion',frame:8+Math.min(3,Math.floor((t%.6)/.15)),height:0};
 if(b.action==='charge')return {sheet:'motion',frame:12+Math.floor(t*14)%4,height:0};
 if(b.action==='recover')return b.landingPose?{sheet:'pounce',frame:t<.13?5:t<.35?6:7,height:0}:{sheet:'motion',frame:Math.sin(t*7)>.3?5:4,height:0};
 return {sheet:'motion',frame:e.moving?Math.floor(time*9)%4:4,height:0};
}
