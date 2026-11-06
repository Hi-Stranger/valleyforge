// Shared player identity; camp art is loaded only while visiting town.
export async function loadCharacterArt(resources,{camp=false}={}){
  const [playerImage,player,npcImage,npc]=await Promise.all([
    resources.image('./game/assets/player-leather.png'),resources.json('./game/assets/player-leather.json'),
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

// All portraits derive from the same runtime sprite, without transparent margins.
export function drawPlayerPortrait(ctx,image,world,{x,y,height,headOnly=false}){
  const f=world.atlas[world.clips['player.idle.down'][0]],b=f.bounds;
  if(!b)return;
  const sourceHeight=headOnly?Math.round(b.h*.49):b.h,scale=height/sourceHeight;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,f.x+b.x,f.y+b.y,b.w,sourceHeight,x-b.w*scale/2,y-height,b.w*scale,height);
}
