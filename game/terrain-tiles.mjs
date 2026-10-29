// Snap shared tile edges in canvas pixels so fractional zoom cannot expose gaps.
export function drawTerrainTiles(ctx,image,world,view){
  const t=world.tileSize||32,cols=world.tileCols||world.cols;
  const x0=Math.max(0,Math.floor(view.x/t)),y0=Math.max(0,Math.floor(view.y/t));
  const x1=Math.min(cols,Math.ceil((view.x+view.width)/t)),y1=Math.min(world.height/t,Math.ceil((view.y+view.height)/t));
  const {a,d,e,f}=ctx.getTransform();
  const xs=[],ys=[];
  for(let x=x0;x<=x1;x++)xs.push(Math.round(x*t*a+e));
  for(let y=y0;y<=y1;y++)ys.push(Math.round(y*t*d+f));
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  for(const layer of world.tileLayers)for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const gid=layer.data[y*cols+x];
    if(!gid)continue;
    const frame=world.atlas[world.tileFrames[gid]],i=x-x0,j=y-y0;
    ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,xs[i],ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j]);
  }
  ctx.restore();
}
