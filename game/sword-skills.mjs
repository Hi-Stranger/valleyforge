export const SWORD_SKILLS={
  triple:{name:'破风三连',short:'三连',cooldown:4,cost:18,key:'Digit1',duration:.54},
  dash:{name:'追影突刺',short:'突刺',cooldown:6,cost:22,key:'Digit2',duration:.32},
  crescent:{name:'回风拔斩',short:'拔斩',cooldown:9,cost:28,key:'Digit3',duration:.28},
  storm:{name:'千刃剑阵',short:'剑阵',cooldown:30,cost:45,key:'Digit4',duration:.22},
};
export function inSwordSector(origin,target,angle,radius,halfAngle){
  const dx=target.x-origin.x,dy=target.y-origin.y;
  return Math.hypot(dx,dy)<=radius+(target.r||0)&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<=halfAngle;
}
export function inSwordPath(start,end,target,width){
  const dx=end.x-start.x,dy=end.y-start.y,l=dx*dx+dy*dy;
  const t=l?Math.max(0,Math.min(1,((target.x-start.x)*dx+(target.y-start.y)*dy)/l)):0;
  return Math.hypot(target.x-start.x-dx*t,target.y-start.y-dy*t)<=width+(target.r||0);
}
