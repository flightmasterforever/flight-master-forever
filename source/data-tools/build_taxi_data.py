import json,csv,io
d=json.load(open('/mnt/user-data/uploads/Downloads/forever-taxi-data.json'))
rd=lambda s:list(csv.DictReader(io.StringIO(s)))
tn,tp,um,ua=rd(d['tn']),rd(d['tp']),rd(d['um']),rd(d['ua'])
reg={}
for r in ua:
    if r['OrderIndex']!='0' and r['UiMapID']!='947':pass
    reg.setdefault(r['UiMapID'],r)
def uv(mapid,x,y):
    r=reg[mapid];x0,y0,x1,y1=float(r['Region_0']),float(r['Region_1']),float(r['Region_3']),float(r['Region_4'])
    return ((y1-y)/(y1-y0),(x1-x)/(x1-x0))
cont={'1':'1414','0':'1415'}
skip={1,3,15,24,34,35,36,46,47,50,51,54,57,59,60,78,84,85,86,87}
nodes={}
for r in tn:
    i=int(r['ID']);fl=int(r['Flags']);name=r['Name_lang']
    if i in skip or name.startswith(('zz','Quest Path','Transport','Generic')) or r['ContinentID'] not in cont: continue
    fac=('A' if fl&1 else '')+('H' if fl&2 else '')
    u,v=uv(cont[r['ContinentID']],float(r['Pos_0']),float(r['Pos_1']))
    parts=name.split(', ',1)
    nodes[i]=dict(id=i,name=parts[0],zone=parts[1] if len(parts)>1 else parts[0],c='K' if r['ContinentID']=='1' else 'E',u=round(u,5),v=round(v,5),f=fac,druid=int(name.startswith('Nighthaven')))
edges=[]
for r in tp:
    a,b=int(r['FromTaxiNode']),int(r['ToTaxiNode'])
    if a in nodes and b in nodes and a!=b: edges.append([a,b,int(r['Cost'])])
# zones
zones=[]
names={r['ID']:r['Name_lang'] for r in um}
for r in um:
    if r['ParentUiMapID'] in ('1414','1415') and r['Type']=='3' and r['ID'] in reg:
        p=r['ParentUiMapID'];z=reg[r['ID']]
        u0,v0=uv(p,float(z['Region_3']),float(z['Region_4']));u1,v1=uv(p,float(z['Region_0']),float(z['Region_1']))
        zones.append(dict(name=r['Name_lang'],c='K' if p=='1414' else 'E',u0=round(u0,4),v0=round(v0,4),u1=round(u1,4),v1=round(v1,4)))
active=[n for n in nodes.values() if n['f']]
print(len(nodes),'nodes;',len(active),'with faction flags;',len(edges),'edges')
for n in sorted(nodes.values(),key=lambda n:(n['c'],n['name'])):
    deg=sum(1 for e in edges if n['id'] in e[:2])
    print(n['c'],n['id'],n['name'],'|',n['zone'],n['f'] or '-',n['u'],n['v'],'deg',deg)
print(len(zones),'zones')
json.dump(dict(nodes=list(nodes.values()),edges=edges,zones=zones),open('data.json','w'))
