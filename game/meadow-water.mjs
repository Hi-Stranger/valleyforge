// Both effects read the same terrain/river/occlusion raster once.
export function prepareMeadowWater({river,ground,atlas,world}){
  const W=world.width,H=world.height,scratch=document.createElement('canvas');scratch.width=W;scratch.height=H;
  const read=scratch.getContext('2d',{willReadFrequently:true});
  read.drawImage(ground,0,0);const base=read.getImageData(0,0,W,H).data;
  read.clearRect(0,0,W,H);read.drawImage(river,0,0);const source=read.getImageData(0,0,W,H).data;
  read.clearRect(0,0,W,H);read.imageSmoothingEnabled=false;
  for(const o of [...world.groundObjects,...world.scene]){const f=world.atlas[o.frames[0].key];read.drawImage(atlas,f.x,f.y,f.w,f.h,o.x,o.y,f.w*o.scale,f.h*(o.scaleY||o.scale));}
  const cover=read.getImageData(0,0,W,H).data,wet=new Uint8Array(W*H),cells=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const pixel=y*W+x,i=pixel*4,r=base[i],g=base[i+1],b=base[i+2],rr=source[i],rg=source[i+1],rb=source[i+2];
    if(cover[i+3]>16||source[i+3]<128||!(b>r*1.35&&g>r*1.2&&b>g*.85&&rb>rr*1.35&&rg>rr*1.2&&rb>rg*.85))continue;
    wet[pixel]=1;cells.push(pixel);
  }
  scratch.width=0;scratch.height=0;
  return {base,wet,cells,dispose(){this.base=null;this.wet=null;this.cells.length=0;}};
}
