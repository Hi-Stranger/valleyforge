from PIL import Image
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parent.parent
assets=root/'game/assets'; source=root/'source-assets'; tiles=source/'new-camp-tiles'; tmj=source/'new-camp-map.tmj'
worldpath=assets/'new-camp-world.json'; atlaspath=assets/'new-camp-atlas.png'
def prop(name,value):return {'name':name,'type':'string' if isinstance(value,str) else 'float' if isinstance(value,float) else 'int','value':value}
def props(obj):return {p['name']:p['value'] for p in obj.get('properties',[])}
def create():
 w=json.loads(worldpath.read_text(encoding='utf8'));atlas=Image.open(atlaspath).convert('RGBA');tiles.mkdir(exist_ok=True)
 keys=list(w['tileFrames'].values())+[o['frames'][0]['key'] for o in w['groundObjects']+w['scene']];keys=list(dict.fromkeys(keys));entries=[];gids={}
 for i,key in enumerate(keys):
  f=w['atlas'][key];name=key.replace(':','-')+'.png';img=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));img.save(tiles/name)
  entries.append({'id':i,'image':'new-camp-tiles/'+name,'imagewidth':f['w'],'imageheight':f['h'],'properties':[prop('worldKey',key)]});gids[key]=i+1
 layers=[];lid=0;oid=0
 def objlayer(name,items):
  nonlocal lid
  lid+=1;layers.append({'id':lid,'name':name,'type':'objectgroup','visible':True,'opacity':1,'draworder':'index','objects':items})
 lid+=1;layers.append({'id':lid,'name':'地形瓦片','type':'tilelayer','width':w['cols'],'height':w['rows'],'x':0,'y':0,'visible':True,'opacity':1,'data':[gids[w['tileFrames'][str(g)]] if g else 0 for g in w['tileLayers'][0]['data']]})
 for lname,kind in [('地面景物','groundObjects'),('深度景物','scene')]:
  arr=[]
  for o in w[kind]:
   oid+=1;key=o['frames'][0]['key'];f=w['atlas'][key];scale=o.get('scale',1);sy=o.get('scaleY',scale)
   arr.append({'id':oid,'name':key,'type':'sprite','gid':gids[key],'x':o['x'],'y':o['y']+f['h']*sy,'width':f['w']*scale,'height':f['h']*sy,'rotation':0,'visible':True,'properties':[prop('depth',o['depth'])]})
  objlayer(lname,arr)
 arr=[]
 for c in w['colliders']:
  oid+=1;arr.append({'id':oid,'name':c['kind'],'type':'collider','x':c['x'],'y':c['y'],'width':c['w'],'height':c['h'],'rotation':0,'visible':True})
 objlayer('碰撞',arr);arr=[]
 for role,points in [('shop',w['shops']),('entry',[w['entry']]),('exit',[w['exit']])]:
  for p in points:
   oid+=1;properties=[prop('role',role)]
   if role=='shop':properties += [prop('shopId',p['id']),prop('shopName',p['name'])]
   arr.append({'id':oid,'name':p.get('name',role),'type':role,'point':True,'x':p['x'],'y':p['y'],'width':0,'height':0,'rotation':0,'visible':True,'properties':properties})
 objlayer('交互与出入口',arr);arr=[]
 for wat in w['campAnimation']['water']:
  oid+=1;x=min(p[0] for p in wat['points']);y=min(p[1] for p in wat['points'])
  arr.append({'id':oid,'name':'water','type':'water','x':x,'y':y,'polygon':[{'x':p[0]-x,'y':p[1]-y} for p in wat['points']],'rotation':0,'visible':True})
 for falls in w['campAnimation'].get('falls',[]):
  oid+=1;x=min(p[0] for p in falls['points']);y=min(p[1] for p in falls['points'])
  arr.append({'id':oid,'name':'falls','type':'falls','x':x,'y':y,'polygon':[{'x':p[0]-x,'y':p[1]-y} for p in falls['points']],'rotation':0,'visible':True,'properties':[prop('depth',falls['depth'])]})
 for steam in w['campAnimation']['steam']:
  oid+=1;arr.append({'id':oid,'name':steam['kind'],'type':'steam','point':True,'x':steam['x'],'y':steam['y'],'width':0,'height':0,'rotation':0,'visible':True,'properties':[prop('kind',steam['kind']),prop('depth',steam['depth'])]})
 objlayer('环境动画',arr)
 data={'type':'map','version':'1.10','tiledversion':'1.10.2','orientation':'orthogonal','renderorder':'right-down','infinite':False,'width':w['cols'],'height':w['rows'],'tilewidth':32,'tileheight':32,'nextlayerid':lid+1,'nextobjectid':oid+1,'layers':layers,'tilesets':[{'firstgid':1,'name':'new-camp','tilewidth':max(e['imagewidth'] for e in entries),'tileheight':max(e['imageheight'] for e in entries),'tilecount':len(entries),'columns':0,'tiles':entries}]}
 tmj.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');print('created',tmj)
def export():
 m=json.loads(tmj.read_text(encoding='utf8'));w=json.loads(worldpath.read_text(encoding='utf8'));t=m['tilesets'][0];first=t['firstgid'];bygid={first+i['id']:i for i in t['tiles']}; images={};keys={}
 for layer in m['layers']:
  for obj in layer.get('objects',[]):
   if obj.get('rotation',0):raise ValueError('Rotated objects are not supported: '+obj.get('name',''))
   if obj.get('gid',0) & 0xF0000000:raise ValueError('Flipped tile objects are not supported')
  if any(gid & 0xF0000000 for gid in layer.get('data',[])):raise ValueError('Flipped terrain tiles are not supported')
 for gid,e in bygid.items():
  key=props(e)['worldKey'];keys[gid]=key;images[key]=Image.open(source/e['image']).convert('RGBA')
 atlas=Image.new('RGBA',(2048,4096));x=y=row=0;meta={}
 for key,img in images.items():
  iw,ih=img.size
  if iw>2048:raise ValueError('image too wide: '+key)
  if x+iw>2048:x=0;y+=row+2;row=0
  if y+ih>4096:raise ValueError('atlas exceeds 4096 height')
  atlas.alpha_composite(img,(x,y));meta[key]={'x':x,'y':y,'w':iw,'h':ih,'ox':0,'oy':0};x+=iw+2;row=max(row,ih)
 atlas=atlas.crop((0,0,2048,y+row));atlas.save(atlaspath,optimize=True)
 layers={l['name']:l for l in m['layers']};tiledata=layers['地形瓦片']['data'];used=sorted(set(tiledata)-{0});lookup={gid:i+1 for i,gid in enumerate(used)}
 w.update(width=m['width']*32,height=m['height']*32,cols=m['width'],rows=m['height'],tileCols=m['width'],elevation=[0]*(m['width']*m['height']),tileLayers=[{'name':'可编辑地表','data':[lookup.get(gid,0) for gid in tiledata]}],tileFrames={str(v):keys[k] for k,v in lookup.items()})
 w['atlas']={**{k:v for k,v in w['atlas'].items() if not k.startswith('town:new-')},**meta}
 for lname,kind in [('地面景物','groundObjects'),('深度景物','scene')]:
  result=[]
  for o in layers[lname]['objects']:
   gid=o['gid'];key=keys[gid];f=meta[key];sx=o['width']/f['w'];sy=o['height']/f['h'];entry={'x':o['x'],'y':o['y']-o['height'],'scale':sx,'depth':props(o).get('depth',round(o['y'])),'frames':[{'key':key,'ms':1000}]}
   if abs(sx-sy)>1e-6:entry['scaleY']=sy
   result.append(entry)
  w[kind]=result
 w['colliders']=[{'x':o['x'],'y':o['y'],'w':o['width'],'h':o['height'],'kind':o['name']} for o in layers['碰撞']['objects']]
 w['shops']=[]
 for o in layers['交互与出入口']['objects']:
  p=props(o);role=p['role'];point={'x':o['x'],'y':o['y']}
  if role=='shop':w['shops'].append({'id':p['shopId'],'name':p['shopName'],**point})
  elif role in ('entry','exit'):w[role]=point
 w['campAnimation']={'water':[],'steam':[],'falls':[]}
 for o in layers['环境动画']['objects']:
  p=props(o)
  kind=o.get('class',o.get('type'))
  if kind=='water':w['campAnimation']['water'].append({'points':[[o['x']+q['x'],o['y']+q['y']] for q in o['polygon']]})
  elif kind=='falls':w['campAnimation']['falls'].append({'points':[[o['x']+q['x'],o['y']+q['y']] for q in o['polygon']],'depth':p['depth']})
  elif kind=='steam':w['campAnimation']['steam'].append({'x':o['x'],'y':o['y'],'depth':p['depth'],'kind':p['kind']})
 worldpath.write_text(json.dumps(w,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 view=Image.new('RGBA',(w['width'],w['height']))
 for i,gid in enumerate(tiledata):
  if gid:view.alpha_composite(images[keys[gid]],((i%w['cols'])*32,(i//w['cols'])*32))
 for o in w['groundObjects']+sorted(w['scene'],key=lambda item:item['depth']):
  img=images[o['frames'][0]['key']];sx=o['scale'];sy=o.get('scaleY',sx)
  if sx!=1 or sy!=1:img=img.resize((max(1,round(img.width*sx)),max(1,round(img.height*sy))),Image.Resampling.NEAREST)
  view.alpha_composite(img,(round(o['x']),round(o['y'])))
 view.convert('RGB').resize((424,240),Image.Resampling.LANCZOS).save(assets/'new-camp-minimap.png')
 print('exported',worldpath,'atlas',atlas.size)
if '--create' in sys.argv:create()
else:export()
