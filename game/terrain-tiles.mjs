const terrainViews=new WeakMap();

// Assemble visible tiles at native resolution, then scale one continuous image.
// This avoids per-tile sampling edges in mobile GPU canvas implementations.
export function drawTerrainTiles(ctx,image,world,view){
  const t=world.tileSize||32,cols=world.tileCols||world.cols;
  const x0=Math.max(0,Math.floor(view.x/t)),y0=Math.max(0,Math.floor(view.y/t));
  const x1=Math.min(cols,Math.ceil((view.x+view.width)/t)),y1=Math.min(world.height/t,Math.ceil((view.y+view.height)/t));
  if(x1<=x0||y1<=y0)return;
  let cached=terrainViews.get(world);
  if(!cached){cached={canvas:document.createElement('canvas')};terrainViews.set(world,cached);}
  const key=`${x0}:${y0}:${x1}:${y1}`;
  if(cached.key!==key||cached.image!==image){
    const buffer=cached.canvas;
    buffer.width=(x1-x0)*t;buffer.height=(y1-y0)*t;
    const paint=buffer.getContext('2d');paint.imageSmoothingEnabled=false;
    for(const layer of world.tileLayers)for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const gid=layer.data[y*cols+x];
      if(!gid)continue;
      const frame=world.atlas[world.tileFrames[gid]];
      paint.drawImage(image,frame.x,frame.y,frame.w,frame.h,(x-x0)*t,(y-y0)*t,t,t);
    }
    cached.key=key;cached.image=image;
  }
  ctx.drawImage(cached.canvas,x0*t,y0*t);
}
