import {REGIONS,REGIONAL_TYPES} from './rpg-data.mjs';

export const WORLD_STYLES={
  forest:{ground:'#58753d',road:'#b4a06e',water:'#3b8188',filter:'hue-rotate(14deg) saturate(.85) brightness(.82)',tint:'#274d35',accent:'#b5d68c'},
  dunes:{ground:'#bd985d',road:'#dfba78',water:'#4a9292',filter:'sepia(.8) saturate(.75) brightness(1.1)',tint:'#ca9b58',accent:'#f0cd90'},
  frost:{ground:'#b7ced4',road:'#8da6b4',water:'#547d9c',filter:'grayscale(.65) sepia(.2) hue-rotate(145deg) brightness(1.25)',tint:'#c5e0e7',accent:'#d5f5ff'},
  rift:{ground:'#514849',road:'#857064',water:'#cd623d',filter:'sepia(.6) saturate(.5) brightness(.55)',tint:'#633b31',accent:'#efac76'},
};
export function buildAdventureWorld(base,id){
  const index=Object.keys(WORLD_STYLES).indexOf(id),width=2048,height=1280,cols=width/32,rows=height/32;
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+index*97)*43758.5453;return n-Math.floor(n);};
  const mainY=x=>830-400*x/width+85*Math.sin(x/330+index*.6);
  const riverX=y=>1050+115*Math.sin(y/260+index*.8);
  const bridgeY=mainY(riverX(640));
  const bridge={x:riverX(bridgeY),y:bridgeY};
  const entry={x:150,y:mainY(150)},bossPoint={x:1820,y:260};
  const water=(x,y)=>Math.abs(x-riverX(y))<53&&Math.abs(y-bridge.y)>65;
  const loopY=x=>mainY(x)+210*Math.sin(Math.PI*(x-200)/1700)*Math.min(1,Math.max(0,(Math.abs(x-bridge.x)-90)/240));
  const road=(x,y)=>Math.abs(y-mainY(x))<60||Math.abs(y-loopY(x))<44||x>1600&&Math.abs(x-1730)<55&&y>240&&y<mainY(1700)+100;
  const protectedPoint=(x,y)=>water(x,y)||road(x,y)||Math.hypot(x-entry.x,y-entry.y)<140||Math.hypot(x-bossPoint.x,y-bossPoint.y)<160;
  const world={width,height,cell:32,cols,rows,elevation:Array(cols*rows).fill(0),cliffs:[],ramps:[],colliders:[],trunks:[],scene:[],groundObjects:[],effects:[],animals:[],atlas:{...base.atlas},clips:base.clips,doors:[],seed:20261101+index,name:REGIONS[id].name,entry,bossPoint,spawns:[],nodes:[],tileSize:32,tileCols:cols,tileFrames:{},tileLayers:[{name:'地形',data:[]}],region:id,bridge,artVersion:'rpg-60-1',sourceMap:`maps/${id}.tmj`};
  const addProp=(name,x,y,scale=1)=>{const frame=world.atlas['meadow:'+name];if(!frame)return;world.scene.push({x:x-frame.w*scale/2,y:y-frame.h*scale,depth:y,scale,frames:[{key:'meadow:'+name,ms:1000}]});if(['pine','tree-green','tree-gold'].includes(name))world.trunks.push([x,y-8,9*scale]);};
  for(let y=48;y<height;y+=90)for(let x=48;x<width;x+=95){const px=x+(hash(x,y)-.5)*65,py=y+(hash(y,x)-.5)*65,edge=px<120||px>width-100||py<160||py>height-70;
    if(protectedPoint(px,py))continue;
    if(hash(x+5,y)<(edge?.76:id==='dunes'?.2:.38)){
      if(id==='dunes'){world.scene.push({custom:hash(x,y)>.4?'cactus':'ruin',x:px,y:py,depth:py,scale:.8+hash(y,x)*.4});world.trunks.push([px,py-7,9]);}
      else addProp(id==='frost'?'pine':hash(x,y)>.55?'tree-green':'pine',px,py,.67+hash(x+9,y)*.32);
      if(hash(y,x)>.45)addProp('bush',px+23,py+6,.55);
    }else if(hash(x+8,y)<.16)addProp('rocks',px,py,.65);
  }
  world.scene.push({custom:'gate',x:bossPoint.x,y:bossPoint.y-56,depth:bossPoint.y-56,scale:1.4});
  for(const offset of [-77,48])world.colliders.push({x:bossPoint.x+offset,y:bossPoint.y-66,w:32,h:12,kind:'gate-foot'});
  world.groundObjects.push({custom:'bridge',x:bridge.x,y:bridge.y,depth:bridge.y,scale:1});
  addProp('sign',entry.x-52,entry.y+24,.65);
  // Wide ford under the bridge; water blocks only the visibly wet channel.
  for(let y=16;y<height;y+=16){const left=riverX(y)-53;if(Math.abs(y-bridge.y)<65)continue;world.colliders.push({x:left,y:y-8,w:106,h:16,kind:id==='rift'?'lava':'water'});}
  const valid=(x,y,r=20)=>x>60&&x<width-60&&y>70&&y<height-40&&!water(x,y)&&world.trunks.every(([tx,ty,tr])=>Math.hypot(x-tx,y-ty)>r+tr);
  const safePoint=(x,y)=>{for(let k=0;k<400;k++){const a=k*2.399,rr=Math.sqrt(k)*12,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(valid(px,py))return {x:Math.round(px),y:Math.round(py)};}throw Error('No free adventure point '+id);};
  const types=REGIONAL_TYPES[id];
  for(let i=0;i<18;i++){const x=330+(i%6)*275+(hash(i,2)-.5)*70,y=mainY(x)+(i<6?-150:i<12?160:330);const p=safePoint(x,Math.min(height-80,Math.max(150,y)));if(Math.hypot(p.x-entry.x,p.y-entry.y)<200)continue;world.spawns.push({type:types[i%2],...p});}
  for(const p of [{x:740,y:400},{x:1600,y:850}])world.spawns.push({type:types[2],...safePoint(p.x,p.y)});
  world.spawns.push({type:types[3],...bossPoint});
  for(let i=0;i<10;i++){const x=350+i%5*340,y=mainY(x)+(i<5?240:-220);world.nodes.push({type:REGIONS[id].resource,...safePoint(x,Math.min(height-80,Math.max(150,y)))});}
  for(const [i,type] of ['wood','iron','crystal'].entries())world.nodes.push({type,...safePoint(450+i*420,950-i*190)});
  for(let i=0;i<cols*rows;i++){const gid=i+1;world.tileLayers[0].data.push(gid);world.tileFrames[gid]='adventure:tile-'+i;world.atlas['adventure:tile-'+i]={x:i%64*32,y:Math.floor(i/64)*32,w:32,h:32,ox:0,oy:0};}
  return world;
}

// Build only ground into tiles; vegetation and landmarks remain separate objects.
export function paintAdventureTerrain(ctx,world,texture){
  const id=world.region,style=WORLD_STYLES[id],{width:w,height:h}=world;
  const mainY=x=>830-400*x/w+85*Math.sin(x/330+Object.keys(WORLD_STYLES).indexOf(id)*.6);
  const riverX=y=>1050+115*Math.sin(y/260+Object.keys(WORLD_STYLES).indexOf(id)*.8);
  const material=(part,tint)=>{const c=document.createElement('canvas');c.width=c.height=512;const p=c.getContext('2d');p.imageSmoothingEnabled=false;p.drawImage(texture,part*texture.width/3,0,texture.width/3,texture.height,0,0,512,512);p.globalCompositeOperation='color';p.fillStyle=tint;p.fillRect(0,0,512,512);p.globalCompositeOperation='source-over';p.globalAlpha=.3;p.fillRect(0,0,512,512);return c;};
  ctx.fillStyle=ctx.createPattern(material(0,style.ground),'repeat');ctx.fillRect(0,0,w,h);
  const trail=(offset=0,width=100)=>{ctx.beginPath();for(let x=-20;x<w+30;x+=8){const y=mainY(x)+(offset?offset*Math.sin(Math.PI*(x-200)/1700)*Math.min(1,Math.max(0,(Math.abs(x-world.bridge.x)-90)/240)):0);if(x===-20)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();};
  ctx.strokeStyle=ctx.createPattern(material(1,style.road),'repeat');trail();trail(210,65);ctx.beginPath();ctx.moveTo(1730,mainY(1730)+30);ctx.lineTo(1730,260);ctx.lineTo(1820,260);ctx.lineWidth=80;ctx.stroke();
  // Sparse, coherent road edges preserve the original quiet grass/soil texture.
  for(let x=0;x<w;x+=9){const y=mainY(x),j=Math.sin(x*1.81)*5;ctx.fillStyle=style.road;ctx.fillRect(x,y-52+j,5,4);ctx.fillRect(x+3,y+49-j,4,5);}
  ctx.strokeStyle=id==='rift'?'#382b2a':'#757e60';ctx.beginPath();for(let y=-40;y<h+40;y+=8){const x=riverX(y);if(y===-40)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.lineWidth=135;ctx.stroke();
  ctx.strokeStyle=ctx.createPattern(material(2,style.water),'repeat');ctx.lineWidth=104;ctx.stroke();
  ctx.strokeStyle=id==='rift'?'#f2a35e':'#a6c7b4';ctx.lineWidth=3;ctx.beginPath();for(let y=0;y<h;y+=8){const x=riverX(y)-53;if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  ctx.fillStyle=style.road;ctx.fillRect(world.bridge.x-88,world.bridge.y-60,176,120);
}
