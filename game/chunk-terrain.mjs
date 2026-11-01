// World-aligned reusable chunks, with a one-tile sampling gutter.
const caches=new WeakMap(),DEFAULT_BUDGET=32*1024*1024;
function discard(cache){cache.alive=false;for(const stage of cache.stages.values())stage.canvas.width=stage.canvas.height=0;cache.stages.clear();cache.stageBytes=0;for(const chunk of cache.chunks.values())chunk.canvas.width=chunk.canvas.height=0;cache.chunks.clear();cache.bytes=0;}
function cacheFor(image,world){
  let c=caches.get(world);
  if(c&&(c.image!==image||c.revision!==world.terrainRevision||c.layers!==world.tileLayers||c.frames!==world.tileFrames||c.atlas!==world.atlas||c.width!==world.width||c.height!==world.height||c.tileSize!==world.tileSize)){discard(c);c=null;}
  if(!c){c={alive:true,image,revision:world.terrainRevision,layers:world.tileLayers,frames:world.tileFrames,atlas:world.atlas,width:world.width,height:world.height,tileSize:world.tileSize,chunks:new Map(),stages:new Map(),stageBytes:0,viewportSize:null,viewportReserve:0,bytes:0,builds:0,tileDraws:0,evictions:0,budget:world.terrainBudgetBytes||DEFAULT_BUDGET};caches.set(world,c);}
  return c;
}
function range(world,view,margin=0){
  const size=512,result=[];
  const left=Math.max(0,Math.floor(view.x/size)-margin),top=Math.max(0,Math.floor(view.y/size)-margin);
  const right=Math.min(Math.ceil(world.width/size)-1,Math.ceil((view.x+view.width)/size)-1+margin),bottom=Math.min(Math.ceil(world.height/size)-1,Math.ceil((view.y+view.height)/size)-1+margin);
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)result.push({key:x+':'+y,x:x*size,y:y*size,w:Math.min(size,world.width-x*size),h:Math.min(size,world.height-y*size)});
  return result;
}
function createChunk(world,box){
  const t=world.tileSize||32,left=Math.max(0,box.x-t),top=Math.max(0,box.y-t),right=Math.min(world.width,box.x+box.w+t),bottom=Math.min(world.height,box.y+box.h+t);
  const canvas=document.createElement('canvas');canvas.width=right-left;canvas.height=bottom-top;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;return {...box,left,top,right,bottom,canvas,ctx,bytes:canvas.width*canvas.height*4};
}
function paintRow(c,world,chunk,layer,y){
  const t=world.tileSize||32,cols=world.tileCols||world.cols;
  for(let x=chunk.left/t;x<chunk.right/t;x++){
    const gid=layer.data[y*cols+x];if(!gid)continue;const f=world.atlas[world.tileFrames[gid]];
    chunk.ctx.drawImage(c.image,f.x,f.y,f.w,f.h,x*t-chunk.left,y*t-chunk.top,t,t);c.tileDraws++;
  }
}
function retain(c,chunk){c.chunks.set(chunk.key,chunk);c.bytes+=chunk.bytes;c.builds++;}
function touch(c,key){const chunk=c.chunks.get(key);if(chunk){c.chunks.delete(key);c.chunks.set(key,chunk);}return chunk;}
function trim(c,pinned,reserve=0){
  for(const [key,chunk] of c.chunks){if(c.bytes+Math.max(c.stageBytes,c.viewportReserve)+reserve<=c.budget)break;if(pinned.has(key))continue;c.bytes-=chunk.bytes;chunk.canvas.width=chunk.canvas.height=0;c.chunks.delete(key);c.evictions++;}
}
export async function prepareChunkTerrain(image,world,view,{signal,onProgress=()=>{},neighbors=true}={}){
  const c=cacheFor(image,world),visible=range(world,view),pinned=new Set(visible.map(x=>x.key));
  const t=world.tileSize||32;c.viewportReserve=4*Math.min(world.width,(Math.ceil(view.width/t)+1)*t)*Math.min(world.height,(Math.ceil(view.height/t)+1)*t)*4;
  const nearby=neighbors?range(world,view,1).filter(x=>!pinned.has(x.key)).sort((a,b)=>Math.hypot(a.x+a.w/2-view.x-view.width/2,a.y+a.h/2-view.y-view.height/2)-Math.hypot(b.x+b.w/2-view.x-view.width/2,b.y+b.h/2-view.y-view.height/2)):[];
  const candidates=[...visible,...nearby];let done=0;
  for(const box of candidates){
    if(signal?.aborted||!c.alive)throw new DOMException('场景已离开','AbortError');
    if(touch(c,box.key)){pinned.add(box.key);onProgress(++done,candidates.length);continue;}
    const chunk=createChunk(world,box);trim(c,pinned,chunk.bytes);
    if(!pinned.has(box.key)&&c.bytes+Math.max(c.stageBytes,c.viewportReserve)+chunk.bytes>c.budget){chunk.canvas.width=chunk.canvas.height=0;continue;}
    try{
      let rows=0;for(const layer of world.tileLayers)for(let y=chunk.top/world.tileSize;y<chunk.bottom/world.tileSize;y++){
        if(signal?.aborted||!c.alive)throw new DOMException('场景已离开','AbortError');paintRow(c,world,chunk,layer,y);
        if(++rows%8===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(signal?.aborted||!c.alive)throw new DOMException('场景已离开','AbortError');
      retain(c,chunk);pinned.add(box.key);onProgress(++done,candidates.length);
    }catch(error){chunk.canvas.width=chunk.canvas.height=0;throw error;}
  }
  trim(c,pinned);
}
export function drawChunkTerrain(ctx,image,world,view){
  const c=cacheFor(image,world),boxes=range(world,view),pinned=new Set(boxes.map(x=>x.key)),t=world.tileSize||32;
  const left=Math.max(0,Math.floor(view.x/t)*t),top=Math.max(0,Math.floor(view.y/t)*t),right=Math.min(world.width,Math.ceil((view.x+view.width)/t)*t),bottom=Math.min(world.height,Math.ceil((view.y+view.height)/t)*t);
  // Preserve the old single-image sampling phase at fractional camera zooms.
  // Recompose only on tile-window changes; retain the few possible viewport sizes.
  const viewportSize=view.width+':'+view.height;
  if(c.viewportSize!==viewportSize){for(const stage of c.stages.values())stage.canvas.width=stage.canvas.height=0;c.stages.clear();c.stageBytes=0;c.viewportSize=viewportSize;c.viewportReserve=4*Math.min(world.width,(Math.ceil(view.width/t)+1)*t)*Math.min(world.height,(Math.ceil(view.height/t)+1)*t)*4;}
  const width=right-left,height=bottom-top;if(width<=0||height<=0)return;
  const key=width+':'+height,viewKey=left+':'+top+':'+right+':'+bottom;
  let stage=c.stages.get(key);
  if(!stage){
    if(c.stages.size>=4){const first=c.stages.keys().next().value,old=c.stages.get(first);c.stageBytes-=old.canvas.width*old.canvas.height*4;old.canvas.width=old.canvas.height=0;c.stages.delete(first);}
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const paint=canvas.getContext('2d');paint.imageSmoothingEnabled=false;
    stage={canvas,paint,viewKey:null};c.stages.set(key,stage);c.stageBytes+=width*height*4;
  }
  if(stage.viewKey===viewKey){ctx.drawImage(stage.canvas,left,top);return;}
  stage.paint.clearRect(0,0,width,height);
  for(const box of boxes){
    let chunk=touch(c,box.key);
    // A teleport or fast camera jump may reveal an unprepared chunk; build only it.
    if(!chunk){chunk=createChunk(world,box);trim(c,pinned,chunk.bytes);for(const layer of world.tileLayers)for(let y=chunk.top/t;y<chunk.bottom/t;y++)paintRow(c,world,chunk,layer,y);retain(c,chunk);}
    const x=Math.max(left,box.x),y=Math.max(top,box.y),w=Math.min(right,box.x+box.w)-x,h=Math.min(bottom,box.y+box.h)-y;
    if(w>0&&h>0)stage.paint.drawImage(chunk.canvas,x-chunk.left,y-chunk.top,w,h,x-left,y-top,w,h);
  }
  stage.viewKey=viewKey;ctx.drawImage(stage.canvas,left,top);trim(c,pinned);
}
export function chunkTerrainStats(world){const c=caches.get(world);return c?{kind:'chunks',chunks:c.chunks.size,bytes:c.bytes+c.stageBytes,chunkBytes:c.bytes,viewportBytes:c.stageBytes,budget:c.budget,overBudget:c.bytes+c.stageBytes>c.budget,builds:c.builds,tileDraws:c.tileDraws,evictions:c.evictions}:{kind:'chunks',chunks:0,bytes:0};}
export function releaseChunkTerrain(world){const c=caches.get(world);if(c){discard(c);caches.delete(world);}}
