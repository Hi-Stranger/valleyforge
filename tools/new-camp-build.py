from PIL import Image, ImageDraw, ImageFilter
import json,random,shutil
from pathlib import Path
random.seed(19)
ref=Path('C:/Users/JJBOY/.codex/generated_images/01a20e3b-71ae-7371-afa6-f47594d1b8b5/exec-e7f128c6-4f59-404e-b0de-16a4403118c6.png')
shutil.copyfile(ref,'source-assets/new-camp-reference.png')
im=Image.open(ref).convert('RGBA')
# The approved concept contains static smoke. Reduce its bright neutral pixels
# so the runtime's independent animated steam supplies the visible motion.
pix=im.load()
for cx,cy,rx,ry in [(559,39,30,45),(361,633,26,58)]:
 for yy in range(max(0,cy-ry),min(im.height,cy+ry)):
  for xx in range(max(0,cx-rx),min(im.width,cx+rx)):
   if ((xx-cx)/rx)**2+((yy-cy)/ry)**2>1:continue
   r,g,b,a=pix[xx,yy]
   if max(r,g,b)-min(r,g,b)<24 and min(r,g,b)>95:
    pix[xx,yy]=(int(r*.70),int(g*.72),int(b*.75),a)
# Replace the reference-only person with nearby cobblestones before extracting
# the plaza surface. This image is an intermediate, never a full-scene layer.
plaza_source=im.copy()
patch=im.crop((727,550,807,670))
feather=Image.new('L',patch.size);ImageDraw.Draw(feather).rectangle((8,8,71,111),fill=255)
plaza_source.paste(patch,(775,432),feather.filter(ImageFilter.GaussianBlur(6)))
objects={
 'hall':[(438,166),(474,138),(519,125),(518,83),(542,80),(542,29),(581,28),(581,80),(610,71),(641,0),(1134,0),(1143,127),(1080,143),(1080,274),(1072,323),(967,337),(947,389),(876,399),(805,390),(768,365),(660,408),(628,397),(620,366),(582,361),(557,351),(557,395),(510,393),(501,374),(504,219)],
 'forge':[(0,262),(42,235),(88,201),(123,184),(188,178),(188,121),(256,120),(256,178),(311,197),(449,270),(487,306),(469,326),(467,460),(515,459),(513,492),(468,509),(434,493),(394,528),(355,522),(351,541),(284,550),(275,530),(244,520),(203,539),(184,578),(127,585),(123,555),(69,558),(51,531),(52,486),(24,470),(0,473)],
 'market':[(1162,294),(1209,286),(1234,247),(1260,247),(1309,268),(1358,279),(1401,297),(1452,302),(1518,366),(1490,407),(1463,418),(1460,471),(1417,489),(1352,486),(1330,505),(1298,497),(1267,471),(1204,461),(1206,413),(1176,411),(1141,435),(1130,425),(1140,382),(1173,374)],
 'store':[(1129,566),(1189,535),(1322,507),(1324,469),(1406,440),(1470,431),(1583,404),(1583,445),(1559,449),(1559,602),(1516,628),(1483,634),(1447,658),(1396,666),(1338,655),(1302,671),(1243,678),(1223,661),(1176,674),(1145,648)],
 'tent':[(90,794),(124,702),(147,660),(178,661),(259,629),(283,629),(300,683),(336,759),(325,789),(286,777),(249,801),(214,797),(204,848),(140,853),(109,847)],
 'firepit':[(306,790),(326,767),(328,704),(343,697),(344,691),(355,689),(355,703),(389,698),(396,690),(404,692),(397,707),(411,757),(432,784),(442,803),(423,815),(387,824),(339,821),(315,811)],
 'bridge':[(823,716),(838,700),(910,684),(917,670),(930,670),(936,688),(977,679),(980,651),(1001,654),(1009,681),(1066,707),(1122,682),(1137,681),(1135,710),(1207,737),(1211,718),(1229,716),(1236,745),(1301,770),(1305,748),(1322,749),(1324,782),(1355,800),(1355,824),(1313,845),(1304,866),(1288,865),(1288,844),(1233,839),(1229,856),(1215,856),(1210,827),(1144,802),(1134,824),(1124,822),(1124,793),(1056,765),(1049,789),(1035,788),(1035,756),(980,727),(938,742),(934,764),(921,764),(919,748),(847,749),(845,769),(830,769)],
 'forest-left':[(0,0),(445,0),(450,166),(407,164),(388,154),(364,176),(320,168),(310,186),(262,180),(260,117),(186,118),(186,178),(116,178),(68,204),(0,254)],
 'forest-right':[(1150,0),(1671,0),(1671,192),(1653,201),(1623,192),(1593,211),(1571,249),(1537,247),(1515,267),(1480,249),(1450,256),(1435,229),(1400,235),(1378,206),(1345,217),(1314,195),(1282,202),(1252,176),(1219,181),(1180,143),(1150,126)],
 'shore-left':[(0,560),(76,575),(126,578),(154,598),(194,607),(211,626),(169,645),(134,641),(116,665),(105,699),(82,726),(83,805),(70,849),(88,885),(152,900),(266,899),(319,885),(386,870),(435,853),(482,824),(521,827),(556,803),(593,803),(602,826),(649,823),(674,845),(721,844),(743,875),(781,883),(776,908),(729,929),(649,940),(0,940)],
 'shore-right':[(1510,372),(1554,374),(1590,391),(1628,421),(1671,451),(1671,940),(1608,940),(1588,912),(1576,899),(1591,871),(1627,858),(1630,833),(1593,809),(1567,800),(1545,777),(1583,747),(1603,716),(1571,700),(1539,699),(1536,654),(1569,624),(1571,550),(1591,513),(1594,471),(1579,453),(1593,430),(1569,408),(1538,413)],
 'upper-road':[(1461,0),(1671,0),(1671,202),(1640,215),(1636,248),(1595,261),(1560,290),(1531,321),(1504,344),(1476,321),(1451,297),(1432,268),(1451,246),(1469,219),(1496,200),(1509,177),(1534,162),(1538,128),(1513,101),(1490,70)]}
objects.update({
 'plaza':[(484,405),(625,403),(700,394),(770,390),(817,402),(932,395),(1030,372),(1130,343),(1202,352),(1202,414),(1161,458),(1124,479),(1123,530),(1108,574),(1122,626),(1070,658),(1013,667),(941,685),(858,697),(777,711),(690,704),(616,727),(539,719),(473,701),(399,675),(337,650),(290,611),(328,585),(420,553),(488,516),(512,479)],
 'water-left':[(575,940),(773,940),(853,912),(941,872),(1010,833),(1050,842),(1058,866),(1020,900),(981,940)],
 'water-right':[(1268,852),(1352,836),(1414,812),(1479,792),(1539,766),(1570,739),(1604,702),(1588,681),(1550,692),(1505,690),(1469,703),(1425,708),(1372,721),(1321,738),(1339,768),(1368,798),(1366,827)]
})
# The remaining visible environment is split by semantic role. All object
# silhouettes are subtracted below, so these layers can sit behind actors.
objects['plaza']=[(0,350),(1671,350),(1671,940),(0,940)]
objects['background-forest']=[(0,0),(1671,0),(1671,349),(0,349)]
objects['water-left']=[(530,940),(1020,940),(1070,870),(1030,810),(940,825),(850,865),(750,895),(650,910)]
objects['water-right']=[(1260,860),(1450,825),(1540,785),(1590,735),(1630,695),(1610,670),(1535,680),(1440,700),(1360,720),(1280,745),(1300,790)]
objects['bridge-rails']=[(1036,726),(1058,730),(1058,744),(1130,772),(1130,749),(1148,754),(1148,780),(1202,801),(1202,777),(1221,782),(1221,809),(1285,833),(1285,805),(1307,811),(1307,857),(1285,857),(1285,845),(1221,822),(1221,854),(1204,852),(1204,817),(1148,795),(1148,823),(1130,820),(1130,788),(1058,760),(1058,787),(1037,785)]
items=[]
for name,poly in objects.items():
 x0=min(p[0] for p in poly); y0=min(p[1] for p in poly); x1=max(p[0] for p in poly)+1;y1=max(p[1] for p in poly)+1
 mask=Image.new('L',(x1-x0,y1-y0));ImageDraw.Draw(mask).polygon([(x-x0,y-y0) for x,y in poly],fill=255)
 if name in ('plaza','background-forest','water-left','water-right'):
  draw=ImageDraw.Draw(mask)
  for other,shape in objects.items():
   if other not in ('plaza','background-forest','water-left','water-right'):
    draw.polygon([(x-x0,y-y0) for x,y in shape],fill=0)
  if name=='plaza':
   for water in ('water-left','water-right'):
    draw.polygon([(x-x0,y-y0) for x,y in objects[water]],fill=0)
 cut=(plaza_source if name=='plaza' else im).crop((x0,y0,x1,y1));cut.putalpha(mask);items.append((name,cut,x0+12,y0+9))
def tile(kind,variant):
 rng=random.Random(1000+kind*31+variant); c=[(69,76,58),(91,78,66),(32,75,86)][kind]
 out=Image.new('RGBA',(32,32),(*c,255));p=out.load()
 for y in range(1,31):
  for x in range(1,31):
   n=rng.randrange(-5,6);p[x,y]=tuple(max(0,min(255,v+n)) for v in c)+(255,)
 d=ImageDraw.Draw(out)
 if kind==0:
  for _ in range(9):
   x=rng.randrange(3,28);y=rng.randrange(3,28);d.line((x,y,x+rng.randrange(1,4),y-1),fill=(82,91,65,255))
 if kind==1 and variant>0:
  x=rng.randrange(3,10);y=rng.randrange(5,12);w=rng.randrange(14,21);h=rng.randrange(8,13)
  d.polygon([(x,y+3),(x+4,y),(x+w-3,y),(x+w,y+3),(x+w-2,y+h),(x+3,y+h)],fill=(109,101,93,255));d.line([(x,y+3),(x+4,y),(x+w-3,y)],fill=(130,119,106,255))
 if kind==2:
  for _ in range(5):
   x=rng.randrange(3,26);y=rng.randrange(3,29);d.line((x,y,min(x+rng.randrange(2,6),29),y),fill=(51,108,120,255))
 return out
atlas=Image.new('RGBA',(2048,3072));meta={};x=y=row=0
for kind,label in enumerate(['grass','soil','water']):
 for v in range(4):
  img=tile(kind,v);key=f'town:new-{label}-{v}';atlas.alpha_composite(img,(x,y));meta[key]={'x':x,'y':y,'w':32,'h':32,'ox':0,'oy':0};x+=34
x=0;y=36;row=0
for name,img,px,py in items:
 w,h=img.size
 if x+w+2>2048:x=0;y+=row+2;row=0
 if y+h>3072:raise ValueError('atlas full')
 atlas.alpha_composite(img,(x,y));meta['town:new-'+name]={'x':x,'y':y,'w':w,'h':h,'ox':0,'oy':0};x+=w+2;row=max(row,h)
atlas=atlas.crop((0,0,2048,y+row));atlas.save('game/assets/new-camp-atlas.png',optimize=True)
W,H=1696,960;cols=W//32;rows=H//32;land=[]
for cy in range(rows):
 for cx in range(cols):
  px=cx*32+16;py=cy*32+16;plaza=((px-820)/720)**2+((py-575)/370)**2<1
  water=(py>900-(px-570)*.29 and px>580 and py>680 and not (930<px<1350 and 680<py<860)) or (px>1450 and 685<py<820)
  kind=2 if water else 1 if plaza else 0;land.append(kind*4+1+random.randrange(4))
old=json.load(open('game/assets/town-world.json',encoding='utf8'));world={k:v for k,v in old.items() if k not in ['campActors','camp']}
world.update(width=W,height=H,cell=32,cols=cols,rows=rows,elevation=[0]*(cols*rows),cliffs=[],ramps=[],trunks=[],effects=[],animals=[],groundObjects=[],spawns=[],nodes=[],doors=[],name='溪谷营地',tileSize=32,tileCols=cols,tileLayers=[{'name':'可编辑地表','data':land}],tileFrames={str(i+1):f'town:new-{label}-{v}' for i,(label,v) in enumerate((l,v) for l in ['grass','soil','water'] for v in range(4))},atlas={**{k:v for k,v in old['atlas'].items() if not k.startswith('town:')},**meta},sourceMap='source-assets/new-camp-layout.json',referenceSize=[1672,941],artVersion=5)
depths={'forest-left':260,'forest-right':250,'upper-road':220,'shore-left':940,'shore-right':940,'hall':399,'forge':557,'market':501,'store':679,'tent':855,'firepit':824,'bridge':0,'bridge-rails':865,'plaza':0,'background-forest':0,'water-left':0,'water-right':0}
ground_names=('plaza','background-forest','water-left','water-right','bridge')
world['groundObjects']=[{'x':px,'y':py,'scale':1,'depth':0,'frames':[{'key':'town:new-'+name,'ms':1000}]} for name,img,px,py in sorted(items,key=lambda v: 1 if v[0]=='bridge' else 0) if name in ground_names]
world['scene']=[{'x':px,'y':py,'scale':1,'depth':depths[name],'frames':[{'key':'town:new-'+name,'ms':1000}]} for name,img,px,py in items if name not in ground_names]
world['colliders']=[{'x':x,'y':y,'w':w,'h':h,'kind':k} for x,y,w,h,k in [(465,221,600,172,'hall'),(65,329,400,199,'forge'),(1215,338,245,145,'market'),(1160,543,400,116,'store'),(123,700,217,115,'tent'),(325,769,105,45,'firepit'),(0,0,1696,180,'forest'),(0,180,45,780,'edge'),(1660,180,36,780,'edge'),(0,900,540,60,'shore')]]
# Approximate the water silhouette with compact 16px scanline rectangles.
# The bridge footprint is explicitly removed to preserve a continuous route.
watermask=Image.new('1',(W,H));d=ImageDraw.Draw(watermask)
for name in ('water-left','water-right'):
 d.polygon([(x+12,y+9) for x,y in objects[name]],fill=1)
d.polygon([(x+12,y+9) for x,y in objects['bridge']],fill=0)
for yy in range(0,H,16):
 start=None
 for xx in range(0,W+16,16):
  occupied=xx<W and bool(watermask.getpixel((min(xx+8,W-1),min(yy+8,H-1))))
  if occupied and start is None:start=xx
  if not occupied and start is not None:
   world['colliders'].append({'x':start,'y':yy,'w':xx-start,'h':16,'kind':'water'});start=None
world.update(entry={'x':760,'y':670},exit={'x':1580,'y':260},shops=[{'id':'forge','name':'铁匠','x':390,'y':568},{'id':'potion','name':'药剂','x':1190,'y':510},{'id':'goods','name':'杂货','x':1120,'y':665}],campAnimation={'water':[{'points':[[590,960],[930,960],[1048,850],[997,816],[911,851],[809,889],[676,916]]},{'points':[[1293,835],[1400,815],[1465,794],[1547,771],[1583,735],[1618,704],[1595,690],[1514,701],[1454,715],[1377,726],[1325,746]]}],'steam':[{'x':567,'y':88,'depth':332,'kind':'chimney'},{'x':380,'y':748,'depth':813,'kind':'pot'}]})
json.dump(world,open('game/assets/new-camp-world.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
json.dump({'reference':'new-camp-reference.png','referenceOffset':[12,9],'worldSize':[W,H],'objects':{n:{'polygon':p,'depth':depths[n]} for n,p in objects.items()},'tiles':{'size':32,'layers':world['tileLayers']},'colliders':world['colliders'],'entry':world['entry'],'exit':world['exit'],'shops':world['shops'],'campAnimation':world['campAnimation'],'notes':'Hand polygon masks from user-approved image; terrain uses newly drawn reusable tiles. Polygon interiors can retain reference background and exposed cuts require visual review. No added third-party assets.'},open('source-assets/new-camp-layout.json','w',encoding='utf8'),ensure_ascii=False,indent=2)
# Render a diagnostic overview and minimap from the exact atlas and map data.
view=Image.new('RGBA',(W,H))
for i,gid in enumerate(land):
 f=meta[world['tileFrames'][str(gid)]];view.alpha_composite(atlas.crop((f['x'],f['y'],f['x']+32,f['y']+32)),((i%cols)*32,(i//cols)*32))
for o in world['groundObjects']+sorted(world['scene'],key=lambda a:a['depth']):
 f=meta[o['frames'][0]['key']];view.alpha_composite(atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(o['x'],o['y']))
view.convert('RGB').resize((424,240),Image.Resampling.LANCZOS).save('game/assets/new-camp-minimap.png')
view.save('source-assets/new-camp-overview.png')
print('atlas',atlas.size,'objects',len(items),'world',W,H)
