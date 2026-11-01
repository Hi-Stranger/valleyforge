import {prepareChunkTerrain,drawChunkTerrain,releaseChunkTerrain,chunkTerrainStats} from './chunk-terrain.mjs?v=2026.11.01.9';
const terrainViews=new WeakMap();
const staticGrounds=new WeakMap();

// Small static scenes keep their ground independently of camera coordinates.
// It is assembled from editable tile data, not from a concept/background image.
function drawStaticGround(ctx,image,world,view){
  const t=world.tileSize||32,cols=world.tileCols||world.cols;
  const x0=Math.max(0,Math.floor(view.x/t)),y0=Math.max(0,Math.floor(view.y/t));
  const x1=Math.min(cols,Math.ceil((view.x+view.width)/t)),y1=Math.min(world.height/t,Math.ceil((view.y+view.height)/t));
  if(x1<=x0||y1<=y0)return;
  let cached=staticGrounds.get(world);
  if(!cached||cached.image!==image||cached.layers!==world.tileLayers||cached.atlas!==world.atlas||cached.frames!==world.tileFrames||cached.width!==world.width||cached.height!==world.height||cached.tileSize!==t||cached.cols!==cols||cached.revision!==world.terrainRevision){
    const buffer=cached?.canvas||document.createElement('canvas');
    buffer.width=world.width;buffer.height=world.height;
    const paint=buffer.getContext('2d');paint.imageSmoothingEnabled=false;
    for(const layer of world.tileLayers)for(let y=0;y<world.height/t;y++)for(let x=0;x<cols;x++){
      const gid=layer.data[y*cols+x];if(!gid)continue;
      const frame=world.atlas[world.tileFrames[gid]];
      paint.drawImage(image,frame.x,frame.y,frame.w,frame.h,x*t,y*t,t,t);
    }
    cached={canvas:buffer,image,layers:world.tileLayers,atlas:world.atlas,frames:world.tileFrames,width:world.width,height:world.height,tileSize:t,cols,revision:world.terrainRevision};
    staticGrounds.set(world,cached);
  }
  // Preserve the original viewport-aligned sampling at fractional phone zooms.
  // Cropping an existing bitmap does not reassemble or resize its canvas.
  const x=x0*t,y=y0*t,w=(x1-x0)*t,h=(y1-y0)*t;
  ctx.drawImage(cached.canvas,x,y,w,h,x,y,w,h);
}

// Prepare outside the render loop, yielding between small row batches.
export async function prepareTerrainTiles(image,world,{signal,onProgress=()=>{},view}={}){
  if(world.renderCache==='chunks')return prepareChunkTerrain(image,world,view||{x:0,y:0,width:512,height:512},{signal,onProgress});
  const t=world.tileSize||32,cols=world.tileCols||world.cols;
  const canvas=document.createElement('canvas');canvas.width=world.width;canvas.height=world.height;
  const paint=canvas.getContext('2d');paint.imageSmoothingEnabled=false;
  try{
    const rows=world.height/t,total=rows*world.tileLayers.length;let done=0;
    for(const layer of world.tileLayers)for(let y=0;y<rows;y++){
      if(signal?.aborted)throw new DOMException('场景已离开','AbortError');
      for(let x=0;x<cols;x++){const gid=layer.data[y*cols+x];if(!gid)continue;const frame=world.atlas[world.tileFrames[gid]];paint.drawImage(image,frame.x,frame.y,frame.w,frame.h,x*t,y*t,t,t);}
      done++;if(done%8===0){onProgress(done,total);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    if(signal?.aborted)throw new DOMException('场景已离开','AbortError');
    const previous=staticGrounds.get(world);if(previous){previous.canvas.width=0;previous.canvas.height=0;}
    staticGrounds.set(world,{canvas,image,layers:world.tileLayers,atlas:world.atlas,frames:world.tileFrames,width:world.width,height:world.height,tileSize:t,cols,revision:world.terrainRevision});
    onProgress(total,total);
  }catch(error){canvas.width=0;canvas.height=0;throw error;}
}
export function releaseTerrainTiles(world){releaseChunkTerrain(world);for(const cache of [staticGrounds,terrainViews]){const value=cache.get(world);if(value){value.canvas.width=0;value.canvas.height=0;cache.delete(world);}}}
export function terrainCacheStats(world){if(!world)return {bytes:0};if(world.renderCache==='chunks')return chunkTerrainStats(world);const c=staticGrounds.get(world)||terrainViews.get(world);return {kind:world.renderCache||'view',bytes:c?c.canvas.width*c.canvas.height*4:0};}

// Assemble visible tiles at native resolution, then scale one continuous image.
// This avoids per-tile sampling edges in mobile GPU canvas implementations.
export function drawTerrainTiles(ctx,image,world,view){
  if(world.renderCache==='chunks'){drawChunkTerrain(ctx,image,world,view);return;}
  if(world.renderCache==='static'||world.camp?.style==='night-camp'){drawStaticGround(ctx,image,world,view);return;}
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
