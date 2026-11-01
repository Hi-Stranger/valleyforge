// Small code-native pixel sprites. Limbs and silhouettes have distinct action poses.
import {WORLD_STYLES} from './adventure-world.mjs';
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const poly=(c,color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
export function drawProfession(c,job,x,y,{time=0,moving=false,attack=false,angle=0,scale=2,invulnerable=false}={}){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);if(Math.cos(angle)<-.1)c.scale(-1,1);
  const stride=moving?Math.sin(time*13)*3:0,pose=attack?1:0,back=Math.sin(angle)<-.55;
  const coat=job==='gunner'?'#385067':job==='cleric'?'#b9c3a1':'#4b8b80',dark=job==='gunner'?'#243645':'#4c6555';
  rect(c,'#26322c',-8,-4,6,4);rect(c,'#26322c',3,-4,6,4);rect(c,'#4c4a3c',-7,-10+stride,5,8);rect(c,'#53533e',3,-10-stride,5,8);
  poly(c,dark,[[-9,-23],[8,-23],[10,-6],[-10,-6]]);rect(c,coat,-7,-24,14,15);rect(c,'#b49460',-8,-13,16,3);
  if(job==='cleric'){rect(c,'#eee3b7',-6,-24,3,16);rect(c,'#eee3b7',4,-24,3,16);rect(c,'#b69b59',-1,-22,3,8);rect(c,'#d6c381',-4,-20,9,2);}
  rect(c,'#453e37',-7,-34,15,10);rect(c,back?'#574d3c':'#d8ac7e',-6,-32,13,10);rect(c,job==='gunner'?'#d3c6a8':'#715440',-7,-35,15,6);
  if(!back){rect(c,'#282d2c',4,-28,2,2);rect(c,'#b78968',0,-24,6,2);}else rect(c,'#77644a',-5,-29,11,5);
  if(job==='gunner'){
    rect(c,dark,-10,-23,4,10);c.save();c.translate(7,-22);c.rotate(Math.atan2(Math.sin(angle),Math.abs(Math.cos(angle))));rect(c,'#c6a17c',0,-1,7,4);rect(c,'#75858d',5-pose,-3,11,4);rect(c,'#c6d0cb',6-pose,-3,9,1);rect(c,'#29323a',6-pose,1,4,4);
    if(attack)poly(c,'#f4d17f',[[17,-4],[22,-2],[18,1],[22,3],[16,2]]);c.restore();
  }else if(job==='cleric'){
    rect(c,'#788668',-11,-23,5,10);rect(c,'#cda87f',9,-22,5,5);rect(c,'#8c6c45',14,-29-pose*3,3,28);rect(c,'#dbc887',11,-32-pose*3,9,7);rect(c,'#fff1bb',14,-35-pose*3,3,12);rect(c,'#b4c8bd',-13,-17,5,7);
  }else {rect(c,'#a7c9c8',11,-29,3,21);rect(c,'#b3975d',8,-10,9,3);}
  if(invulnerable){c.strokeStyle='#e2d5ab';c.lineWidth=.5;c.strokeRect(-12,-38,37,38);}c.restore();
}
const monsterFrames=new Map();
export function drawAdventureMonster(c,e,time,exploration=false){
  if(!e.family)return false;
  const action=e.boar?.action||'',clock=e.boar?.clock??time,frame=Math.floor(clock*12)%4;
  const pose=action==='roar'?(clock<.25?0:clock<.6?1:clock<1.4?2:3):action==='pounce'?(clock<.6?0:clock<.85?1:clock<1.2?2:3):frame;
  const key=[e.family,e.level,e.rank,action,pose,e.moving?1:0,e.windup>0?1:0,e.hit>0?1:0].join(':');
  let sprite=monsterFrames.get(key);
  if(!sprite){
    sprite=document.createElement('canvas');sprite.width=72;sprite.height=80;const p=sprite.getContext('2d',{willReadFrequently:true});
    paintMonster(p,{...e,x:36,y:76,angle:0,boar:e.boar?{...e.boar,height:0}:null},time);
    const pixels=p.getImageData(0,0,72,80),data=pixels.data;
    for(let y=0;y<80;y++)for(let x=0;x<72;x++){
      const i=(y*72+x)*4;if(data[i+3]<150)continue;
      const border=x===0||y===0||x===71||y===79||data[i-4+3]<150||data[i+4+3]<150||data[i-72*4+3]<150||data[i+72*4+3]<150;
      const cluster=((Math.floor(x/2)*13+Math.floor(y/2)*7)%9)-4;
      for(let channel=0;channel<3;channel++)data[i+channel]=Math.max(0,Math.min(255,border?data[i+channel]*.65:data[i+channel]+cluster*2.5));
      data[i+3]=255;
    }
    p.putImageData(pixels,0,0);if(monsterFrames.size>=192)monsterFrames.delete(monsterFrames.keys().next().value);monsterFrames.set(key,sprite);
  }
  const scale=e.rank==='boss'?3.4:e.rank==='elite'?2.7:2;
  c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(e.x),Math.round(e.y-(e.boar?.height||0)));if(Math.cos(e.angle)<0)c.scale(-1,1);c.drawImage(sprite,-36*scale,-76*scale,72*scale,80*scale);c.restore();return true;
}
function paintMonster(c,e,time){
  if(!e.family)return false;
  const s=1,phase=e.boar?.action||'',clock=e.boar?.clock??time;
  const walking=e.moving||phase==='charge',wind=phase==='chargeWindup'||e.windup>0;
  const roar=phase==='roar',jump=phase==='pounce';
  const leg=phase==='chargeWindup'?[0,-5,0,5][Math.floor(clock/.15)%4]:jump?(clock<.6?2:clock<.85?-3:clock<1.2?-5:2):walking?[0,3,0,-3][Math.floor(clock*12)%4]:0;
  const head=roar?(clock<.25?0:clock<.6?-3:clock<1.4?-5:-2):wind?3:jump&&clock<.6?3:0,base=e.level>=51?'#945b46':e.level>=41?'#8fb5bf':e.level>=31?'#b8975c':'#759264',light=e.level>=51?'#e4a168':e.level>=41?'#d9e9e8':e.level>=31?'#e0c38b':'#bdcb8c',dark=e.level>=51?'#463431':e.level>=41?'#476475':e.level>=31?'#77623f':'#3d5946';
  c.save();c.translate(Math.round(e.x),Math.round(e.y-(e.boar?.height||0)));c.scale(s,s);if(Math.cos(e.angle)<0)c.scale(-1,1);
  if(e.hit>0)c.filter='brightness(1.4)';
  const legAt=(x,y,dir=1)=>{rect(c,dark,x,y+leg*dir,4,9);rect(c,light,x-1,y+leg*dir+7,6,2);};
  if(['wolf','stag','drake','scorpion'].includes(e.family)){
    for(const [x,d] of [[-13,1],[-4,-1],[6,1],[12,-1]])legAt(x,-10,d);
    poly(c,dark,[[-18,-18],[-13,-26],[11,-25],[17,-13],[10,-7],[-13,-8]]);rect(c,base,-14,-25,29,15);rect(c,light,-11,-25,20,4);
    if(e.family==='scorpion'){
      poly(c,base,[[-12,-17],[-23,-23],[-27,-36],[-24,-40],[-22,-28],[-14,-25]]);rect(c,light,-28,-42,8,5);rect(c,base,10,-22+head,13,6);rect(c,light,20,-25+head,5,9);rect(c,base,8,-10,14,5);rect(c,light,20,-12,5,8);
    }else{
      poly(c,base,[[8,-22],[10,-33+head],[22,-32+head],[25,-20+head],[15,-16]]);rect(c,light,20,-22+head,8,5);rect(c,'#e7c98a',21,-28+head,2,2);rect(c,'#332d29',24,-21+head,5,roar?5:2);poly(c,dark,[[-13,-20],[-23,-24-leg],[-20,-16],[-14,-12]]);
      if(e.family==='stag'){for(const dx of [8,16]){rect(c,'#c8bc8b',dx,-45+head,3,16);rect(c,'#c8bc8b',dx-5,-43+head,6,3);rect(c,'#c8bc8b',dx+1,-39+head,6,3);}}
      if(e.family==='drake'){poly(c,'#63433c',[[-3,-24],[-19,-41-(jump?5:0)],[-24,-22],[0,-13]]);poly(c,'#b87750',[[0,-22],[1,-41-(jump?8:0)],[12,-27],[8,-16]]);rect(c,'#e5b66c',11,-38+head,3,7);}
    }
  }else if(['golem','knight','raider','imp'].includes(e.family)){
    legAt(-9,-11,1);legAt(4,-11,-1);rect(c,dark,-13,-31,27,21);rect(c,base,-11,-32,23,20);rect(c,light,-9,-31,17,5);rect(c,dark,-19,-27-(wind?4:0),7,18);rect(c,base,12,-29+(roar?-5:leg),8,17);rect(c,light,14,-30+(roar?-5:leg),5,4);
    rect(c,dark,-8,-43+head,17,13);rect(c,base,-6,-44+head,14,11);rect(c,light,-4,-42+head,9,2);rect(c,e.level>50?'#ffd38a':'#e5ddaf',2,-38+head,4,2);if(roar)rect(c,'#332c27',0,-34+head,7,4);
    if(e.family==='knight'){rect(c,'#d7d6b5',20,-42,3,33);rect(c,'#8e866a',16,-14,12,3);}if(e.family==='raider'){rect(c,'#69503d',-9,-45,20,4);rect(c,'#67747b',18,-25,12,4);}if(e.family==='imp'){poly(c,light,[[-5,-43],[-10,-51],[-1,-44]]);poly(c,light,[[4,-44],[10,-51],[11,-42]]);}
  }else if(e.family==='spider'||e.family==='beetle'){
    for(let i=0;i<4;i++){const yy=-7-i*4;rect(c,dark,-19-leg*(i%2?1:-1),yy,12,3);rect(c,dark,8,yy,12+leg*(i%2?1:-1),3);}
    poly(c,dark,[[-13,-24],[6,-28],[15,-19],[12,-5],[-7,-3],[-16,-11]]);rect(c,base,-11,-23,22,17);rect(c,light,-7,-22,14,4);rect(c,dark,2,-22,2,17);rect(c,light,11,-16,6,8);rect(c,'#e5c67b',13,-14,2,2);
  }else if(e.family==='wisp'){
    const flick=Math.floor(time*6)%3;poly(c,light,[[-10,-10],[-15,-22],[-5,-27],[-3,-38-flick],[6,-28],[13,-26],[10,-12],[0,-5]]);poly(c,base,[[-5,-11],[-8,-22],[0,-28],[6,-20],[4,-10]]);rect(c,'#f2fbef',-1,-23,5,8);
  }else{
    rect(c,dark,-8,-7,6,7);rect(c,dark,3,-7,6,7);rect(c,base,-9,-23,19,18);rect(c,light,-6,-23,11,4);poly(c,base,[[-4,-21],[-18,-35],[-17,-43],[0,-30],[5,-44],[14,-36],[8,-20]]);rect(c,'#e7d7ab',0,-16,3,3);rect(c,dark,5,-16,2,2);
  }
  c.restore();return true;
}
export function drawAdventureScenery(c,o,region){if(!o.custom)return false;const style=WORLD_STYLES[region];c.save();c.translate(Math.round(o.x),Math.round(o.y));c.scale(o.scale||1,o.scale||1);
  if(o.custom==='bridge'){
    rect(c,'#4b3b2d',-94,-62,188,124);for(let y=-57;y<60;y+=12){rect(c,'#a38b60',-91,y,182,10);rect(c,'#d0b17d',-89,y,178,2);}for(const x of [-92,85]){rect(c,'#6b5940',x,-67,7,138);for(const y of [-63,55]){rect(c,'#8e8971',x-8,y,23,21);rect(c,'#c8baa0',x-8,y,23,4);}}
  }else if(o.custom==='cactus'){rect(c,'#69784d',-9,-86,18,86);rect(c,'#a4ab6b',-6,-82,5,80);rect(c,'#69784d',-27,-58,20,10);rect(c,'#69784d',-29,-73,10,25);rect(c,'#69784d',8,-39,22,10);rect(c,'#69784d',22,-59,10,30);rect(c,'#d2b773',-8,-90,16,7);}
  else{const gate=o.custom==='gate',height=gate?108:58,width=gate?110:38;for(const x of gate?[-width/2,width/2-21]:[-19]){rect(c,'#4f5246',x,-height,23,height);rect(c,'#95937b',x+3,-height+3,17,height-3);rect(c,'#bcaf8b',x-4,-height,31,7);for(let y=15;y<height;y+=18)rect(c,'#707461',x+3,-y,17,2);}if(gate){rect(c,'#514d43',-59,-height-8,118,15);rect(c,'#ada17e',-56,-height-10,112,8);rect(c,style.accent,-30,-height-7,60,3);}}
  c.restore();return true;
}
