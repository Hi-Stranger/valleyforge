// Shared player identity; camp art is loaded only while visiting town.
export async function loadCharacterArt(resources,{camp=false}={}){
  const [playerImage,player,npcImage,npc]=await Promise.all([
    resources.image('./game/assets/player-ninjagreen.png'),resources.json('./game/assets/player-ninjagreen.json'),
    camp?resources.image('./game/assets/camp-humanoids.png'):null,
    camp?resources.json('./game/assets/camp-humanoids.json'):null,
  ]);
  return {
    playerImage,npcImage,
    attach(world){
      world.atlas={...world.atlas,...player.frames,...npc?.frames};
      world.clips={...world.clips,...player.clips};
      if(!npc)return;
      world.campActors={...world.campActors};
      for(const [name,frames] of Object.entries(npc.clips)){
        world.campActors[name]={...(world.campActors[name]||{x:1070,y:672}),frames,scale:1};
      }
      // The new seated sprite carries its own small seat. Keep collision data.
      world.scene=world.scene.filter(o=>!o.frames?.some(f=>['town:camp-bench','town:camp-merchant'].includes(f.key)));
      world.scene.push({custom:'camp-actor',actor:'merchant',x:1070,y:672,depth:672});
      // The old semantic terrain contains hard-edged fills underneath these
      // silhouettes. Restore exposed ground from nearby editable terrain tiles.
      world.terrainRepairs=[
        {x:816,y:400,w:160,h:128,dx:160,feather:24},
        {x:1008,y:528,w:128,h:176,dx:-128,feather:24},
      ];
    },
  };
}

// The archive and battle share the same cast poses while skill effects run
// on the existing independent timing and hit logic.
export function swordCastFrame(clips,direction,id,age){
  const attack=clips[`player.attack.${direction}`];
  switch(id){
    case 'triple':{
      const beat=age>=.45?.45:age>=.25?.25:.06;
      const offset=age-beat;
      return attack[offset<0||offset>=.14?0:offset<.06?1:2];
    }
    case 'dash':
      return age<.055?clips[`player.brace.${direction}`][0]:attack[age<.26?2:3];
    case 'crescent':
      return attack[age<.16?0:age<.22?1:2];
    case 'storm':
      return clips['player.cast'][age<.085?0:1];
    default:
      return attack[0];
  }
}

// All portraits derive from the same runtime sprite, without transparent margins.
export function drawPlayerPortrait(ctx,image,world,{x,y,height,headOnly=false}){
  const f=world.atlas[world.clips['player.idle.down'][0]],b=f.bounds;
  if(!b)return;
  const sourceHeight=headOnly?Math.round(b.h*.8):b.h;
  const scale=headOnly?Math.min(height/sourceHeight,(ctx.canvas.width-4)/b.w):height/sourceHeight;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,f.x+b.x,f.y+b.y,b.w,sourceHeight,x-b.w*scale/2,y-height,b.w*scale,height);
}
