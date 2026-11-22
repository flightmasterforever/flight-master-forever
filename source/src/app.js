{
// ---- where Zephras Isle sits on the world map ----
// Blizzard gives it no world-map position (it floats in Skywall), so it's placed here by hand: the centre of the
// island in world-map units (the map is 3006 x 2004) and a size factor (1 = true scale, same yards as the continents).
// Move it by changing these numbers; the art, towns, docks, skyship paths and label all follow.
const ISLE_AT={x:1410,y:480,scale:1};
(()=>{const L=G.isleLocal;if(!L)return;const YD=0.06727*ISLE_AT.scale,sx=L.ydPerPx[0]*YD,sy=L.ydPerPx[1]*YD;
  const W=L.size[0]*sx,H=L.size[1]*sy,x0=ISLE_AT.x-W/2,y0=ISLE_AT.y-H/2;
  const P=([px,py])=>[+(x0+(px-L.crop[0])*sx).toFixed(1),+(y0+(py-L.crop[1])*sy).toFixed(1)];
  G.isle=[x0,y0,W,H];
  for(const n of G.nodes){const p=L.nodes[n[0]];if(p){const q=P(p);n[4]=q[0];n[5]=q[1]}}
  for(const r in L.sails){const pcs=G.sails[r];if(pcs)pcs[pcs.length-1]=L.sails[r].map(P)}
  G.skydocks=(G.skydocks||[]).concat(L.docks.map(([p,r])=>["b",...P(p),[r]]));
  for(const z of G.zones)if(z[0]=="Zephras Isle"){z[2]=x0;z[3]=y0;z[4]=W;z[5]=H}})();
const MW=G.W,MH=G.H;const slug=n=>n.toLowerCase().replace(/[^a-z]+/g,"-");
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/'/g,"&#39;").replace(/"/g,"&quot;");
// nodes: [id, name, zone, factions, x, y, new, druid]; id>0 flight master, -1..-99 dock, <=-100 inn town / city
const N={};for(const [id,name,zone,f,x,y,nw,dr] of G.nodes)N[id]={id,name,zone,f:new Set(f.split("")),x,y,isNew:nw,druid:dr,fp:id>0,dock:id<0&&id>-100,town:id<=-100};
// dungeon and raid entrances (positions from the OpenMap addon's Places.lua, MIT; converted with UiMapAssignment)
// [id, name, zone, raid, minLevel, maxLevel, x, y, newInForever]
const INST=[[-201,"Shadowfang Keep","Silverpine Forest",0,20,30,2087.2,681.1],[-202,"The Stockade","Stormwind City",0,24,32,2135.9,1254.9],[-203,"The Deadmines","Westfall",0,17,26,2079.8,1419.4],
 [-204,"Wailing Caverns","The Barrens",0,15,24,732.3,1043.4],[-205,"Razorfen Kraul","The Barrens",0,29,38,695.5,1291.8],[-206,"Blackfathom Deeps","Ashenvale",0,24,32,534.2,708.4],
 [-207,"Uldaman","Badlands",0,41,51,2391.7,1073.1],[-208,"Gnomeregan","Dun Morogh",0,29,38,2130.3,1012.8],[-209,"Sunken Temple","Swamp of Sorrows",0,50,60,2461.7,1349.6],
 [-210,"Razorfen Downs","The Barrens",0,37,46,754.2,1305.4],[-211,"Scarlet Monastery","Tirisfal Glades",0,30,46,2247.5,471],[-212,"Zul'Farrak","Tanaris",0,44,54,778,1447.9],
 [-213,"Lower Blackrock Spire","Blackrock Mountain",0,55,60,2275.9,1171.5],[-214,"Upper Blackrock Spire","Blackrock Mountain",0,59,60,2275.9,1171.5],[-217,"Blackrock Depths","Blackrock Mountain",0,52,60,2255.4,1148.3],
 [-219,"Scholomance","Western Plaguelands",0,58,60,2364.6,579.8],[-221,"Stratholme","Eastern Plaguelands",0,58,60,2420.2,437.4],[-222,"Maraudon","Desolace",0,46,55,388.4,1089],
 [-223,"Ragefire Chasm","Orgrimmar",0,13,18,880.6,871.4],[-224,"Dire Maul","Feralas",0,54,60,508.6,1254.8],
 [-227,"City of Dalaran","Alterac Mountains",0,28,35,2156.2,639.1,1],[-228,"The Drowned City","Stranglethorn Vale",0,35,42,2135,1496.3,1],[-229,"Blackmaw Hold","Azshara",0,55,60,934.9,710.4,1],
 [-230,"Alcaz Prison","Dustwallow Marsh",0,48,55,914.4,1162.3,1],[-231,"Excavation Site: Wetlands","Wetlands",0,26,33,2352.1,914.2,1],[-232,"Ruins of Lordaeron","Tirisfal Glades",0,15,22,2181,544.1,1],
 [-233,"Shaper's Terrace","Un'Goro Crater",0,58,60,667.8,1402.8,1],[-234,"Krol'dok Stronghold","Riverglades",0,40,47,2442.5,1181.6,1],[-235,"The Hall of Thanes","Ironforge",0,13,20,2255.7,989.8,1],
 [-215,"Molten Core","Blackrock Mountain",1,60,60,2275.9,1171.5],[-216,"Blackwing Lair","Blackrock Mountain",1,60,60,2275.9,1171.5],[-218,"Onyxia's Lair","Dustwallow Marsh",1,60,60,835.7,1311.5],
 [-220,"Zul'Gurub","Stranglethorn Vale",1,60,60,2275.3,1467],[-225,"Ruins of Ahn'Qiraj","Silithus",1,60,60,482.1,1536.6],[-226,"Temple of Ahn'Qiraj","Silithus",1,60,60,482.1,1536.6]];
for(const [id,name,zone,raid,a,b,x,y,nw] of INST)N[id]={id,name,zone,f:new Set(["A","H"]),x,y,isNew:nw?1:0,druid:0,fp:false,dock:false,town:false,inst:true,raid:!!raid,lv:a==b?`${a}`:`${a}–${b}`};
const INSTAT={};for(const o of Object.values(N))if(o.inst)(INSTAT[o.x+","+o.y]=INSTAT[o.x+","+o.y]||[]).push(o.id);
// boat docks and zeppelin towers (positions from the OpenMap addon's Places.lua); [kind b|z, x, y, routes]
const DOCKS=[["b", 841.6, 1060.4, ["Booty Bay - Ratchet"]], ["b", 2153.7, 1625.8, ["Booty Bay - Ratchet"]], ["z", 2177.3, 1503.8, ["Grom'gol - Orgrimmar", "Orgrimmar Zepplins"]], ["z", 894.5, 901.9, ["Grom'gol - Orgrimmar", "Orgrimmar Zepplins"]], ["b", 2232.3, 928.2, ["Menethil Ships", "Menethil - Southshore - Auberdine"]], ["b", 901.9, 1262.1, ["Menethil Ships"]], ["b", 515.8, 421.5, ["Rut'theran - Auberdine"]], ["b", 533.4, 551.3, ["Rut'theran - Auberdine", "Menethil - Southshore - Auberdine", "Stormwind - Auberdine"]], ["z", 2177.1, 526.8, ["Orgrimmar Zepplins"]], ["b", 364.2, 1274.2, ["Feathermoon - Feralas"]], ["b", 420.6, 1284.3, ["Feathermoon - Feralas"]], ["b", 2230.2, 739.7, ["Menethil - Southshore - Auberdine"]], ["b", 915.9, 1457.5, ["Steamwheedle Port - Powderfuse Port"]], ["b", 2583.1, 1219.2, ["Steamwheedle Port - Powderfuse Port"]], ["b", 2102.5, 1247.6, ["Stormwind - Auberdine"]]];
DOCKS.push(...(G.skydocks||[]));
// one dock icon per boat or zeppelin, not per town: Auberdine has three piers (Rut'theran, Stormwind, and the
// Menethil-Southshore loop), Menethil two (Theramore and the loop), and each zeppelin tower one platform per
// destination. Each is placed at that route's own pier, taken from where its path starts or ends
const PIERS=[];
for(const [kd,x,y,rs] of DOCKS){const groups=new Map();
  for(const t of G.trans){if(!rs.includes(t[1])||!t[5]||!t[5].length)continue;const ends=[[t[5][0],t[3]],[t[5][t[5].length-1],t[4]]];
    for(const [p,node] of ends){if(Math.hypot(p[0]-x,p[1]-y)>40)continue;
      const key=t[1]=="Menethil - Southshore - Auberdine"?t[1]:t[1]+":"+[t[3],t[4]].sort().join(">");const g=groups.get(key)||{route:t[1],pts:[],pairs:[],town:node};
      g.pts.push(p);if(!g.pairs.some(q=>q[0]==t[3]&&q[1]==t[4]))g.pairs.push([t[3],t[4]]);groups.set(key,g)}}
  if(!groups.size){PIERS.push({kd,x,y,route:rs[0],pairs:null,town:null,rs});continue}
  for(const g of groups.values())PIERS.push({kd,x:g.pts.reduce((a,p)=>a+p[0],0)/g.pts.length,y:g.pts.reduce((a,p)=>a+p[1],0)/g.pts.length,route:g.route,pairs:g.pairs,town:g.town,rs:[g.route]})}
const NEUT=(()=>{const m={};for(const o of Object.values(N))for(const f of o.f)(m[o.name]=m[o.name]||new Set).add(f);return new Set(Object.keys(m).filter(k=>m[k].size>1))})();
const facOf=o=>o.f.size>1||NEUT.has(o.name)?"B":[...o.f][0],FACN={A:"Alliance",H:"Horde",B:"Both factions"};
// Forever adds Teleport: Dalaran for mages at 50 (spell 1297659). The client files don't hold its landing point,
// so it lands at the Dalaran entrance above Hillsbrad.
// capital cities' flight paths (Rut'theran Village is Darnassus's): almost every character has them, so no backup route goes around them
const CAPITAL=new Set([2,6,27,11,22,23]);
const DALARAN=-227,GNOMER=-208,TRANSPONDER="Gnomeregan Teleporter";
const MAGE={A:{20:"Stormwind, Ironforge",30:"Darnassus"},H:{20:"Orgrimmar, Undercity",30:"Thunder Bluff"}};
function mageHint(){const m=ch.mage,t=MAGE[fac],h=$("mageHint");if(!m){h.hidden=true;return}
  const tele=[t[20],m>=30?t[30]:null,m>=50?"Dalaran":null].filter(Boolean).join(", ");
  h.innerHTML=`Teleports: ${tele}.`+(m>=40?` Portals${m>=50?"":` to ${t[20]}`} are for your party and don't change your own route.`:"")+(m<50?` Dalaran opens at 50.`:"");h.hidden=false}
const catOf=o=>o.inst?(o.raid?"R":"Dg"):o.druid?"Dr":facOf(o);
const CATN={A:"Alliance",H:"Horde",B:"Both",Dr:"Druid",Dg:"Dungeons",R:"Raids"},CATO={A:0,H:0,B:1,Dr:2,Dg:3,R:4};
const EDG=G.edges.filter(e=>N[e[0]]&&N[e[1]]);
const SPEED=30;const secs=e=>e[3]/SPEED;
const EDGE=new Map();for(const e of G.edges)EDGE.set(e[0]+">"+e[1],e);
const FLC={};
// ex: flight points the character hasn't learned. The game won't fly through them, or to them
function flights(ex){const key=fac+(ch.druid?"d":"")+(ex&&ex.size?":"+[...ex].sort().join(","):"");if(FLC[key])return FLC[key];const out=[];
  const ids=Object.values(N).filter(o=>o.fp&&fly(o.id)&&!(ex&&ex.has(o.id))).map(o=>o.id),ok=new Set(ids);
  for(const a of ids){
    // shortest chains from a, by flight-path length (yards), over the faction's flight points
    const D={[a]:0},P={},done=new Set();
    for(;;){let u=null;for(const k in D)if(!done.has(+k)&&(u==null||D[k]<D[u]))u=+k;if(u==null)break;done.add(u);
      for(const e of G.edges)if(e[0]==u&&ok.has(e[1])){const nd=D[u]+e[3];if(D[e[1]]==null||nd<D[e[1]]){D[e[1]]=nd;P[e[1]]=u}}}
    for(const b of ids){if(a==b||D[b]==null)continue;let via=[];
      if(!EDGE.has(a+">"+b)){let c=P[b];while(c!=a){via.unshift(c);c=P[c]}}
      const seq=[a,...via,b];let t=0,cost=0;for(let i=0;i+1<seq.length;i++){const e=EDGE.get(seq[i]+">"+seq[i+1]);t+=secs(e);cost+=e[2]}
      out.push({a,b,t,cost,via})}}
  return FLC[key]=out}
const flightPts=l=>{const seq=[l.a,...(l.via||[]),l.b];const p=[];for(let i=0;i+1<seq.length;i++){const e=EDGE.get(seq[i]+">"+seq[i+1]);if(e)p.push(...e[4])}return p};
const fmtT=t=>fmtTot(t);
// one way of writing times everywhere: "45 sec", "2 min 27 sec", and whole minutes from 10 min up
// times in whole minutes, like the game's own estimates; under a minute reads "<1 min"
const fmtTot=t=>t<30?"<1 min":`${Math.round(t/60)} min`;
// costs with the game's own coin icons (coin-gold/silver/copper-20x20); alt text keeps "1g 2s 3c" when copied
const COIN={g:["gold","g"],s:["silver","s"],c:["copper","c"]};
const coin=(n,k)=>`<span class="coin">${n}<img src="icons/coin-${COIN[k][0]}.png" alt="${COIN[k][1]}" title="${COIN[k][0]}"></span>`;
const money=c=>{const g=Math.floor(c/10000),s=Math.floor(c%10000/100),cp=c%100;return `<span class="money">${[g?coin(g,"g"):"",s?coin(s,"s"):"",cp||(!g&&!s)?coin(cp,"c"):""].filter(Boolean).join("")}</span>`};
const NEWR=new Set(["Menethil - Southshore - Auberdine","Steamwheedle Port - Powderfuse Port","Stormwind - Auberdine","Dalaran - Zephras Isle","Mulgore - Zephras Isle","Alterac Mountains - Zephras Isle","Mulgore - Zephras Isle"]);
const TR=G.trans.filter(t=>t[3]!=null&&t[4]!=null&&N[t[3]]&&N[t[4]]).map(t=>t.slice(0,5));TR.push(["Tram","Deeprun Tram","A",2,6],["Tram","Deeprun Tram","A",6,2]);
const LOOP="Menethil - Southshore - Auberdine";
let YPU=15;{const r=[];for(const e of G.edges){const p=e[4];let L=0;for(let k=2;k<p.length;k+=2)L+=Math.hypot(p[k]-p[k-2],p[k+1]-p[k-1]);if(L>20)r.push(e[3]/L)}r.sort((a,b)=>a-b);if(r.length)YPU=r[r.length>>1]}
const dist=(a,b)=>Math.hypot(N[a].x-N[b].x,N[a].y-N[b].y);
const uniq=new Map();for(const [a,b] of EDG){const k=a<b?a+"~"+b:b+"~"+a;if(!uniq.has(k))uniq.set(k,[Math.min(a,b),Math.max(a,b)])}
const lines=[...uniq.values()];
const findNode=(name,f)=>Object.values(N).find(o=>o.name==name&&o.f.has(f)&&!o.druid);

// ---- state (remembered in this browser) ----
let fac="A",ch={hearth:{A:null,H:null},mage:0,druid:false,gadget:false,ever:false,gnome:false};
try{fac=localStorage.getItem("fmf-fac")||"A";const c=JSON.parse(localStorage.getItem("fmf-char")||"null");if(c)ch={...ch,...c,hearth:{...ch.hearth,...(c.hearth||{})}}}catch(e){}
const save=()=>{try{localStorage.setItem("fmf-fac",fac);localStorage.setItem("fmf-char",JSON.stringify(ch))}catch(e){}};
let from=null,to=null,routes=[],ri=0,popId=null;
// Nighthaven's flight master is druid-only, but anyone can go there: it is shown and routed to (on foot from Moonglade) when picked
const vis=id=>{const o=N[id];return !!o&&o.f.has(fac)&&(!o.druid||ch.druid||o.id==from||o.id==to)};
const fly=id=>vis(id)&&(!N[id].druid||ch.druid);
const tUse=t=>t[2].includes(fac);

// ---- icons ----
const IC={
 fly:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 13c3-1 6-1 9 0l-3-6 3 1 5 6c2 0 4 .5 6 1.5-2 1-4 1.5-6 1.5l-5 4-3 1 2-5c-3 .5-6 .2-8-1z"/></svg>',
 Boat:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 2h2v3l5 2-5 2v4h7l-3 5H7l-4-5h8V2zM2 20c2 1.3 4 1.3 6 0 2 1.3 4 1.3 6 0 2 1.3 4 1.3 6 0v2c-2 1.3-4 1.3-6 0-2 1.3-4 1.3-6 0-2 1.3-4 1.3-6 0z"/></svg>',
 Zeppelin:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="9" rx="10" ry="5"/><path d="M8 15h8l-1 3H9z"/></svg>',
 Tram:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h12a2 2 0 012 2v10a3 3 0 01-3 3l2 3h-2.5l-2-3h-5l-2 3H5l2-3a3 3 0 01-3-3V5a2 2 0 012-2zm0 3v5h12V6zm2 8a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z"/></svg>',
 walk:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="M10 8l3-1 3 3 3 1-.5 2-4-1-1.5-1.5-1 4 3 3v5h-2v-4l-3-2.5-1.5 6.5H6l2.3-10.5L7 11v3H5V10z"/></svg>',
 tele:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9zM5 15l.7 1.6L7.3 17l-1.6.7L5 19.3l-.7-1.6L2.7 17l1.6-.4z"/></svg>',
 hearth:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3L3 10.5V21h6.5v-6h5v6H21V10.5z"/></svg>'};
const icon=l=>l.kind=="fly"?IC.fly:l.kind=="ride"?IC[l.label]||IC.Boat:l.kind=="walk"?IC.walk:l.label=="Hearthstone"?IC.hearth:IC.tele;

// ---- map drawing ----
const svg=$("map");const home={x:0,y:0,w:MW,h:MH};let vb={...home};
// the view stays on the parchment: dragging or zooming stops at its edges (if the view is ever wider or taller
// than the sheet, it's centred on it instead). Set KEEP_ON_MAP to false to allow dragging off the edge again
const KEEP_ON_MAP=true;
// keep one axis on the parchment: inside it while zoomed in; while zoomed out past it (tall phone screens), the parchment
// stays wholly in view but can sit anywhere, so a route can be framed above the bottom sheet
const keepOn=(v,size,M)=>size>=M?Math.min(0,Math.max(M-size,v)):Math.max(0,Math.min(M-size,v));
// on phones the bottom sheet covers the lower part of the map, so only the part above it has to stay on the parchment
let shownFrac=()=>1;
const clampVB=()=>{if(KEEP_ON_MAP){const f=shownFrac();vb.x=keepOn(vb.x,vb.w,MW);vb.y=keepOn(vb.y,vb.h*f,MH)}};
const setVB=()=>{clampVB();svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`)};
// while a finger or wheel is moving the map, the drawn map is just slid and scaled as a picture (cheap for the phone's
// graphics chip); the real view is set and redrawn once the gesture ends
let live=null;
const mapBox=()=>live?live.r:svg.getBoundingClientRect();
const liveStart=()=>{if(!live){live={vb:{...vb},r:svg.getBoundingClientRect()};svg.classList.add("moving")}};
const liveShow=()=>{clampVB();const r=live.r,o=live.vb;const at=v=>{const k=Math.max(v.w/r.width,v.h/r.height);return{k,x:v.x-(r.width*k-v.w)/2,y:v.y-(r.height*k-v.h)/2}};
  const a=at(o),b=at(vb),S=a.k/b.k,tx=(a.x-b.x)/b.k,ty=(a.y-b.y)/b.k;
  // the picture only holds what was on screen when the gesture began: once it's slid or scaled far enough to show
  // a blank edge, set the real view (no full redraw) and carry on from there, at most a few times a second
  const now=performance.now();if((Math.abs(tx)>r.width*.2||Math.abs(ty)>r.height*.2||S<.75)&&now-(live.t||0)>180){
    live.t=now;live.vb={...vb};svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);svg.style.transform="";return}
  svg.style.transform=`translate(${tx}px,${ty}px) scale(${S})`};
const liveEnd=()=>{if(!live)return;live=null;svg.style.transform="";svg.classList.remove("moving");setVB();draw();placePop()};
const pathD=p=>{let d="M"+p[0]+","+p[1];for(let k=2;k<p.length;k+=2)d+="L"+p[k]+","+p[k+1];return d};
const sailPts=route=>{const out=[];for(const pc of (G.sails[route]||[]))for(const q of pc)out.push(q);return out};
function curve(a,b){const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,d=Math.hypot(a.x-b.x,a.y-b.y);return `M${a.x},${a.y}Q${mx},${my-Math.min(300,d*.15)} ${b.x},${b.y}`}
function sailD(route){const pcs=(G.sails[route]||[]).map(pc=>pc.slice());
  const stops=[...new Set(G.trans.filter(t=>t[1]==route).flatMap(t=>[t[3],t[4]]).filter(id=>id!=null&&N[id]))].map(id=>N[id]);
  for(const pc of pcs){if(!pc.length)continue;for(const end of [0,1]){const q=end?pc[pc.length-1]:pc[0];let best=null,bd=60;
    for(const o of stops){const dd=Math.hypot(o.x-q[0],o.y-q[1]);if(dd<bd){bd=dd;best=o}}
    if(best){if(end)pc.push([best.x,best.y]);else pc.unshift([best.x,best.y])}}}
  let d="";for(const o of stops){let bq=null,bd=130;for(const pc of pcs)for(let i=1;i<pc.length;i++){const [ax,ay]=pc[i-1],[bx,by]=pc[i];const vx=bx-ax,vy=by-ay,L=vx*vx+vy*vy||1;
      const t=Math.max(0,Math.min(1,((o.x-ax)*vx+(o.y-ay)*vy)/L));const px=ax+t*vx,py=ay+t*vy;const dd=Math.hypot(o.x-px,o.y-py);if(dd<bd){bd=dd;bq=[px,py]}}
    if(bq&&bd>2)d+=`M${o.x},${o.y}L${bq[0]},${bq[1]}`}
  pcs.forEach((pc,i)=>{if(!pc.length)return;
    if(i&&pcs[i-1].length){const a=pcs[i-1][pcs[i-1].length-1],b=pc[0];d+=`M${a[0]},${a[1]}Q${(a[0]+b[0])/2},${(a[1]+b[1])/2-Math.min(260,Math.hypot(a[0]-b[0],a[1]-b[1])*.18)} ${b[0]},${b[1]}`}
    d+="M"+pc.map(q=>q[0]+","+q[1]).join("L")});return d}
function rideD(l){const a=N[l.a],b=N[l.b];const P=sailPts(l.route);if(P.length<2)return curve(a,b);
  const near=o=>{let bi=0,bd=1e9;P.forEach((q,i)=>{const d=Math.hypot(q[0]-o.x,q[1]-o.y);if(d<bd){bd=d;bi=i}});return bi};
  let ia=near(a),ib=near(b),seg;if(ia<=ib)seg=P.slice(ia,ib+1);else if(l.route==LOOP)seg=P.slice(ia).concat(P.slice(0,ib+1));else seg=P.slice(ib,ia+1).reverse();
  return "M"+[[a.x,a.y],...seg,[b.x,b.y]].map(q=>q[0]+","+q[1]).join("L")}
const legD=l=>{const a=N[l.a],b=N[l.b];return l.kind=="ride"?(l.label=="Tram"?`M${a.x},${a.y}L${b.x},${b.y}`:rideD(l)):l.kind=="fly"?pathD(flightPts(l)):l.kind=="tele"?curve(a,b):`M${a.x},${a.y}L${b.x},${b.y}`};
const inView=(x,y,w,h)=>!(x+w<vb.x||x>vb.x+vb.w||y+h<vb.y||y>vb.y+vb.h);

// labels never overlap: route names first, then flight points, then dungeons and the isle, then zone names.
// A flight point's name tries the right, left, below and above its dot before it's hidden (hover still shows it)
// hover text for a dock: what kind of transport leaves from it, and where to. "Boat: Booty Bay ↔ Ratchet"
// hover text for a pier: what kind of transport leaves from it, and where to. "Boat: Booty Bay ↔ Ratchet"
function dockTip(d){const t0=TR.find(t=>t[1]==d.route),kind=t0?t0[0]:"Boat",nm2=id=>N[id].name+(/Zephras/.test(N[id].zone||"")?" (Zephras Isle)":"");
  if(d.route==LOOP)return `${kind}: Menethil Harbor → Southshore → Auberdine → Menethil Harbor (one way)`;
  const pairs=d.pairs||TR.filter(t=>t[1]==d.route).map(t=>[t[3],t[4]]);const seen=[];
  for(const [a,b] of pairs){const s=[a,b].map(nm2).sort().join(" ↔ ");if(!seen.includes(s))seen.push(s)}
  return `${kind}: ${seen.join(", ")}`}
let PIER_BOXES=[];
function declutter(k){
  const placed=[],hit=b=>placed.some(p=>b.x<p.x+p.w&&b.x+b.w>p.x&&b.y<p.y+p.h&&b.y+b.h>p.y);
  // every marker on the map is in the way too
  for(const id in N){const o=N[id];if(!vis(id)||(o.town&&o.id!=from&&o.id!=to))continue;const m=(o.inst?9:6)*k;placed.push({x:o.x-m,y:o.y-m,w:2*m,h:2*m,id:o.id})}
  // and so is the route line: names move off it rather than sit underneath
  const lineBits=[];for(const pth of svg.querySelectorAll("path.rline")){const L=pth.getTotalLength(),st=10*k,m=5*k;for(let d=0;d<=L;d+=st){const pt=pth.getPointAtLength(d);lineBits.push({x:pt.x-m,y:pt.y-m,w:2*m,h:2*m})}}
  // boat and zeppelin icons are in the way too
  placed.push(...PIER_BOXES.map(b=>({...b,pier:true})));
  const labels=[...svg.querySelectorAll("text.lb")].sort((a,b)=>a.dataset.p-b.dataset.p),pad=2.5*k;
  for(const t of labels){const p=+t.dataset.p;
    // a zone name can sit anywhere inside its zone: the middle first, then up, down, left, right and the corners
    const zspots=t.dataset.zr?(([x,y,w,h])=>{const cx=x+w/2,cy=y+h/2,o=[];for(const [dx,dy] of [[0,0],[0,-.25],[0,.25],[-.22,0],[.22,0],[-.2,-.22],[.2,-.22],[-.2,.22],[.2,.22],[0,-.38],[0,.38]])o.push([cx+dx*w,cy+dy*h,"middle"]);return o})(t.dataset.zr.split(",").map(Number)):null;
    const spots=zspots||(t.dataset.fp?(([x,y,r])=>[[x+r+4*k,y+4*k,"start"],[x-r-4*k,y+4*k,"end"],[x,y+r+13*k,"middle"],[x,y-r-5*k,"middle"]])(t.dataset.fp.split(",").map(Number)):[null]);
    const own=t.dataset.fp?t.dataset.fp.split(",").map(Number):null;let ok=false;
    // a flight point's name may sit over a boat icon as a last resort, rather than be hidden
    for(const pass of p==1?[0,1]:[0]){if(ok)break;for(const sp of spots){if(sp){t.setAttribute("x",sp[0]);t.setAttribute("y",sp[1]);t.setAttribute("text-anchor",sp[2])}
      const bb=t.getBBox(),b={x:bb.x-pad,y:bb.y-pad,w:bb.width+2*pad,h:bb.height+2*pad};
      const clash=placed.some(q=>!(pass&&q.pier)&&!(own&&Math.abs(q.x+q.w/2-own[0])<.01&&Math.abs(q.y+q.h/2-own[1])<.01)&&b.x<q.x+q.w&&b.x+b.w>q.x&&b.y<q.y+q.h&&b.y+b.h>q.y);
      const onLine=p>0&&lineBits.some(q=>b.x<q.x+q.w&&b.x+b.w>q.x&&b.y<q.y+q.h&&b.y+b.h>q.y);
      if(p==0||(!clash&&!onLine)){placed.push(b);ok=true;break}}}
    if(!ok){if(spots[0]){t.setAttribute("x",spots[0][0]);t.setAttribute("y",spots[0][1]);t.setAttribute("text-anchor",spots[0][2])}
      t.style.display="none";const g=t.parentNode;if(g&&g.classList&&g.classList.contains("n")&&!g.querySelector("title")){const ti=document.createElementNS("http://www.w3.org/2000/svg","title");ti.textContent=t.textContent;g.appendChild(ti)}}}
}
function draw(){
  const pw=svg.clientWidth||900,ph=svg.clientHeight||600;const k=Math.max(vb.w/pw,vb.h/ph);
  const route=routes[ri];const onRoute=new Set(route?route.nodes:[]);
  const hop=k<2.4?Math.min(1,(2.4-k)/0.7):0;
  const tone=`filter:saturate(${1-0.35*hop}) sepia(${0.3*hop}) brightness(${1-0.08*hop})`;
  // a soft shadow under the parchment, so it reads as a sheet lying on the desk (stacked rings: cheap to pan)
  let s="";for(let k=6;k>=1;k--)s+=`<rect x="${-k*7}" y="${-k*7+10}" width="${MW+k*14}" height="${MH+k*14}" rx="${k*9}" fill="#000" opacity="${.045}"/>`;
  s+=`<image href="azeroth.jpg" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" style="${tone}"/>`;
  if(hop>0){s+=`<image href="azeroth-clean.jpg" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" style="opacity:${hop};${tone}"/>
    <defs><mask id="landM" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}"><image href="landmask.png" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none"/></mask>
    <mask id="seaM" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}"><image href="seamask.png" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none"/></mask>
    <pattern id="grainP" patternUnits="userSpaceOnUse" width="60" height="60"><image href="grain.png" width="60" height="60"/></pattern>
    <pattern id="seaP" patternUnits="userSpaceOnUse" width="420" height="280"><image href="seatex.png" width="420" height="280" preserveAspectRatio="none"/></pattern>
    <pattern id="seaP2" patternUnits="userSpaceOnUse" width="150" height="100"><image href="seatex.png" width="150" height="100" preserveAspectRatio="none"/></pattern></defs>
    <rect width="${MW}" height="${MH}" fill="#93703a" mask="url(#landM)" opacity="${.5*hop}"/><rect width="${MW}" height="${MH}" fill="url(#grainP)" mask="url(#landM)" style="mix-blend-mode:overlay" opacity="${.8*hop}"/>
    <rect width="${MW}" height="${MH}" fill="url(#seaP)" mask="url(#seaM)" style="mix-blend-mode:overlay" opacity="${.75*hop}"/>${k<0.9?`<rect width="${MW}" height="${MH}" fill="url(#seaP2)" mask="url(#seaM)" style="mix-blend-mode:overlay" opacity="${Math.min(.5,0.9-k)*hop}"/>`:""}`;
    for(const t of G.hires3)if(inView(t[1],t[2],t[3],t[4]))s+=`<image href="${t[0]}" x="${t[1]}" y="${t[2]}" width="${t[3]+0.4}" height="${t[4]+0.4}" preserveAspectRatio="none" style="opacity:${hop}"/>`}
  if(k<0.42)for(const c of G.cities)if(inView(c[1],c[2],c[3],c[4]))s+=`<image href="cities/${slug(c[0])}.webp" x="${c[1]}" y="${c[2]}" width="${c[3]}" height="${c[4]}" preserveAspectRatio="none" style="opacity:${Math.min(1,(0.42-k)/0.14)}"/>`;
  // Zephras Isle floats in Skywall (the plane of air); Blizzard gives it no place on Azeroth, so it is drawn in the open sky north of the Maelstrom, at true scale
  if(G.isle){const [ix,iy,iw,ih]=G.isle;s+=`<defs><filter id="isleSh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${ih*.06}" stdDeviation="${ih*.035}" flood-color="#0d1a2a" flood-opacity=".55"/></filter>
      <radialGradient id="isleGlow"><stop offset="0" stop-color="#eef6ff" stop-opacity=".45"/><stop offset="1" stop-color="#eef6ff" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="${ix+iw/2}" cy="${iy+ih*.55}" rx="${iw*.78}" ry="${ih*.62}" fill="url(#isleGlow)"/>
    <image href="zephras-isle.webp" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="none" filter="url(#isleSh)"/>
    <text class="lb" data-p="2" x="${ix+iw/2}" y="${iy+ih+16*k}" text-anchor="middle" font-style="italic" font-size="${10.5*k}" fill="#eef3f8" stroke="#1b1208" stroke-width="${2.6*k}" opacity=".95">${k>=1.9?"Zephras Isle · ":""}Skywall, plane of air</text>`}
  if(k<1.9){s+=`<g text-anchor="middle" font-style="italic" stroke-width="${2.6*k}">`;
    for(const z of G.zones)s+=`<text class="lb" data-p="3" data-zr="${z[2]},${z[3]},${z[4]},${z[5]}" x="${z[2]+z[4]/2}" y="${z[3]+z[5]/2}" font-size="${11*k}" fill="${z[6]?"#ffd36b":"#f3ead7"}" opacity=".9">${esc(z[0])}${z[1]?` <tspan font-size="${10*k}">${z[1]}</tspan>`:""}</text>`;s+=`</g>`}
  const dim=route?.35:1;
  s+=`<g stroke-linecap="round">`;
  for(const [a,b] of lines){if(!fly(a)||!fly(b))continue;const nw=N[a].isNew||N[b].isNew;
    s+=`<line x1="${N[a].x}" y1="${N[a].y}" x2="${N[b].x}" y2="${N[b].y}" stroke="${nw?"#ffcf4a":"#1d1408"}" stroke-opacity="${(nw?.95:.6)*dim}" stroke-width="${(nw?1.8:1.3)*k}"${N[a].druid||N[b].druid?` stroke-dasharray="${2*k} ${4*k}"`:""}/>`}
  {const seen=new Set();for(const t of TR){if(!tUse(t)||seen.has(t[1]))continue;seen.add(t[1]);
    const d=t[0]=="Tram"?`M${N[2].x},${N[2].y}L${N[6].x},${N[6].y}`:sailD(t[1]);if(!d)continue;
    s+=`<path d="${d}" fill="none" stroke="${NEWR.has(t[1])?"#ffcf4a":"#f3ead7"}" stroke-opacity="${.85*dim}" stroke-width="${1.5*k}" stroke-dasharray="${1.5*k} ${4*k}"/>`}}
  for(const [a,b] of G.walks){if(!vis(a)||!vis(b))continue;s+=`<line x1="${N[a].x}" y1="${N[a].y}" x2="${N[b].x}" y2="${N[b].y}" stroke="#f3ead7" stroke-opacity="${.6*dim}" stroke-width="${1.1*k}" stroke-dasharray="${1*k} ${3*k}"/>`}
  s+=`</g>`;
  if(route&&route.legs.length){s+=`<g fill="none" stroke-linecap="round">`;
    for(const l of route.legs){const d=legD(l);const tele=l.kind=="tele";
      s+=`<path d="${d}" stroke="#1b1208" stroke-width="${8*k}" stroke-opacity="${tele?.35:.7}"/><path class="rline" d="${d}" stroke="${tele?"#b98cff":"var(--route)"}" stroke-width="${4*k}" stroke-dasharray="${l.kind=="fly"?`${14*k} ${4*k}`:`${6*k} ${6*k}`}"/>`}
    s+=`</g>`}
  // the game's own boat and zeppelin icons at each dock and tower; bigger for the ones this route uses
  {const used=new Set(route?route.legs.filter(l=>l.kind=="ride").map(l=>l.route):[]);
    // a soft light glow that follows each icon's own outline (no circle), so it stands off the parchment
    s+=`<defs><filter id="dockglow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${(2*k).toFixed(2)}" result="d"/><feGaussianBlur in="d" stdDeviation="${(2.6*k).toFixed(2)}" result="b"/><feFlood flood-color="#fff6dc" flood-opacity=".95"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g style="pointer-events:none">`;
    // boats and zeppelins use the game icons trimmed to their artwork, so both show at the same size even fully
    // zoomed out
    const ic=34*k,R=ic/2,legs=route?route.legs.filter(l=>l.kind=="ride"):[];
    const ds=PIERS.filter(d=>d.pairs?d.pairs.some(([a,b])=>TR.some(t=>t[1]==d.route&&t[3]==a&&t[4]==b&&tUse(t))):d.rs.some(r=>TR.some(t=>t[1]==r&&tUse(t)))).map(d=>({...d,x0:d.x,y0:d.y}));
    // zoomed out, piers sit almost on their town's marker and on each other: spread them out so each boat and
    // zeppelin shows on its own, just beside the town
    {const obs=Object.values(N).filter(o=>vis(o.id)||o.inst),need=R+9*k,gap=ic*.95;
     for(let it=0;it<24;it++){let moved=false;
       for(const d of ds)for(const o of obs){const m=need+(o.inst?3*k:0),dx=d.x-o.x,dy=d.y-o.y,dd=Math.hypot(dx,dy);if(dd<m){const ux=dd>.01?dx/dd:-.7,uy=dd>.01?dy/dd:.7;d.x=o.x+ux*m;d.y=o.y+uy*m;moved=true}}
       for(let i=0;i<ds.length;i++)for(let q=i+1;q<ds.length;q++){const a=ds[i],b=ds[q],dx=b.x-a.x,dy=b.y-a.y,dd=Math.hypot(dx,dy);if(dd<gap){const ux=dd>.01?dx/dd:Math.cos(i+q),uy=dd>.01?dy/dd:Math.sin(i+q),push=(gap-dd)/2;a.x-=ux*push;a.y-=uy*push;b.x+=ux*push;b.y+=uy*push;moved=true}}
       if(!moved)break}}
    PIER_BOXES=ds.map(d=>({x:d.x-R*.8,y:d.y-R*.8,w:R*1.6,h:R*1.6}));
    for(const d of ds){const on=legs.some(l=>l.route==d.route&&(!d.pairs||d.pairs.some(([a,b])=>(l.a==a&&l.b==b)||(l.a==b&&l.b==a))||d.route==LOOP&&(l.a==d.town||l.b==d.town)));
      s+=`<g style="pointer-events:auto;cursor:help"><title>${dockTip(d)}</title><image href="icons/${d.kd=="b"?"boat":"zeppelin"}-m.png" x="${d.x-ic/2}" y="${d.y-ic/2}" width="${ic}" height="${ic}" opacity="${route&&!on?.85:1}" filter="url(#dockglow)"/></g>`}
    s+=`</g>`}
  s+=`<g>`;
  for(const id in N){const o=N[id];if(!vis(id))continue;const em=onRoute.has(o.id)||o.id==from||o.id==to||o.id==popId;
    const isH=ch.hearth[fac]==o.id;if(o.town&&!em&&!isH)continue;
    if(o.inst){const sz=(em?40:27)*k,ic=o.raid?"icons/raid.png":"icons/dungeon.png";
      // entrances that share a spot (Blackrock Mountain, Ahn'Qiraj) stack their names; names flip left when a flight point's name sits to the right
      const mates=INSTAT[o.x+","+o.y],row=mates.indexOf(o.id)-(mates.length-1)/2,left=Object.values(N).some(n=>!n.inst&&vis(n.id)&&n.x>o.x&&n.x-o.x<70&&Math.abs(n.y-o.y)<8);
      const tx=left?o.x-sz*.34-3*k:o.x+sz*.34+3*k,ty=o.y+4*k+row*14*k,anchor=left?' text-anchor="end"':"";
      s+=`<g class="n" data-n="${o.id}" style="cursor:pointer">${em?`<circle cx="${o.x}" cy="${o.y}" r="${sz*.36}" fill="none" stroke="var(--route)" stroke-width="${2.4*k}"/>`:""}<image href="${ic}" x="${o.x-sz/2}" y="${o.y-sz/2}" width="${sz}" height="${sz}"/><circle cx="${o.x}" cy="${o.y}" r="${12*k}" fill="transparent"/>${em||k<0.9?`<text class="lb" data-p="${em?0:2}" x="${tx}" y="${ty}"${anchor} font-size="${(em?13.5:11)*k}" font-weight="${em?700:500}" fill="#fff" stroke-width="${3*k}">${esc(o.name)}</text>`:`<title>${esc(o.name)} (${o.raid?"raid":"dungeon"} · ${o.lv})</title>`}</g>`;continue}
    const r=(em?6.5:5)*k;
    const fill=`var(--${facOf(o)})`;
    const shape=o.dock?`<circle cx="${o.x}" cy="${o.y}" r="${(em?9:6)*k}" fill="transparent" stroke="${em?"var(--route)":"none"}" stroke-width="${2.4*k}"/>`:o.fp?`<circle cx="${o.x}" cy="${o.y}" r="${r}" fill="${fill}" stroke="${em?"var(--route)":facOf(o)=="B"?"var(--Bline)":"#fff"}" stroke-width="${(em?2.6:facOf(o)=="B"?1.8:1.4)*k}"/>`:`<rect x="${o.x-r}" y="${o.y-r}" width="${2*r}" height="${2*r}" rx="${(o.town?r:1.5*k)}" fill="#f3ead7" stroke="${em?"var(--route)":"#1b1208"}" stroke-width="${1.6*k}"/>`;
    const ring=o.isNew?`<circle cx="${o.x}" cy="${o.y}" r="${r+3*k}" fill="none" stroke="#ffcf4a" stroke-width="${2*k}"/>`:"";
    const showL=k<2||em;
    const hb=isH?`<g transform="translate(${o.x-r-4*k},${o.y-r-4*k}) scale(${k})"><circle r="8" fill="#3a2a12" stroke="#ffcf4a" stroke-width="1.4"/><path d="M0-4.6L-4.4-.8V4h3.1V1.2h2.6V4h3.1V-.8z" fill="#ffcf4a"/><title>Your hearthstone</title></g>`:"";
    s+=`<g class="n" data-n="${o.id}" style="cursor:pointer">${ring}${shape}${hb}<circle cx="${o.x}" cy="${o.y}" r="${13*k}" fill="transparent"/>${showL?`<text class="lb" data-p="${em?0:1}" data-fp="${o.x},${o.y},${r}" x="${o.x+r+4*k}" y="${o.y+4*k}" font-size="${(em?13.5:12)*k}" font-weight="${em?700:500}" fill="#fff" stroke-width="${3*k}">${esc(o.name)}</text>`:`<title>${esc(o.name)}</title>`}</g>`}
  // the start and destination match the panel: a hollow ring at the start, a red pin standing on the destination
  if(from!=null&&N[from]&&vis(from)){const o=N[from];s+=`<g style="pointer-events:none"><circle cx="${o.x}" cy="${o.y}" r="${11*k}" fill="none" stroke="#fff" stroke-width="${5.5*k}"/><circle cx="${o.x}" cy="${o.y}" r="${11*k}" fill="none" stroke="#1b1208" stroke-width="${3*k}"/></g>`}
  if(to!=null&&N[to]&&vis(to)){const o=N[to],ps=1.9*k;s+=`<g style="pointer-events:none" transform="translate(${o.x-7*ps},${o.y-18*ps}) scale(${ps})"><path d="M7 0a7 7 0 017 7c0 5-7 11-7 11S0 12 0 7a7 7 0 017-7zm0 4a3 3 0 100 6 3 3 0 000-6z" fill="#d9412b" stroke="#fff" stroke-width="1.2" paint-order="stroke"/></g>`}
  svg.innerHTML=s+`</g>`;
  declutter(k);
  placePop();
}

// ---- routing ----
function graph(opt){const g={};const add=(a,b,c,kind,label,cost,extra)=>{if(opt.ban&&opt.ban.has(a+">"+b))return;(g[a]||(g[a]=[])).push({b,c:opt.cheap?(cost||0)*10000+c:c,kind,label,cost,...extra})};
  // whole flights, booked the way the game books them (confirmed against routes recorded in game with the
  // Flight Master Dump addon): a direct flight if one exists, otherwise the shortest chain by flight-path length.
  // Landing and booking again is a separate step, so the planner can still choose it when that's faster.
  for(const f of flights(opt.ex))add(f.a,f.b,f.t+8,"fly","",f.cost,{t:f.t+8,via:f.via})/* the 8 sec covers taking off, landing and booking */
  // a dock tied to one faction's flight master in a shared town (Booty Bay) is used from this faction's flight master there
  const rv=id=>{if(vis(id))return id;const o=N[id];if(!NEUT.has(o.name))return null;const s=Object.values(N).find(n=>n.name==o.name&&vis(n.id));return s?s.id:null};
  if(opt.ride)for(const t of TR)if(tUse(t)){const a=rv(t[3]),b=rv(t[4]);if(a==null||b==null)continue;const tt=300;/* the tram counts the walk from each flight master and the wait too, like the boats: about 5 min door to door */add(a,b,tt,"ride",t[0],0,{route:t[1],t:tt})}
  const walk=(a,b,tt,label)=>{if(!vis(a)||!vis(b))return;const c=tt??dist(a,b)*YPU/9;add(a,b,c,"walk",label||"",0,{t:c});add(b,a,c,"walk",label||"",0,{t:c})};
  for(const [a,b] of G.walks)walk(a,b);
  for(const [a,b] of G.towns)walk(a,b,a==-104?60:null,a==-104?"portal":"");
  const hubs=Object.values(N).filter(o=>!o.inst&&fly(o.id));
  if(opt.tele&&ch.mage>=50&&from!=DALARAN)hubs.map(h=>[h,dist(DALARAN,h.id)]).sort((a,b)=>a[1]-b[1]).slice(0,2).forEach(([h])=>{const c=dist(DALARAN,h.id)*YPU/9;add(DALARAN,h.id,c,"walk","",0,{t:c})});
  // an entrance is only ever the start or the end of a route, reached from its two nearest travel points
  for(const o of Object.values(N))if(o.inst&&(o.id==from||o.id==to))hubs.map(h=>[h,dist(o.id,h.id)]).sort((a,b)=>a[1]-b[1]).slice(0,2).forEach(([h])=>{const c=dist(o.id,h.id)*YPU/9;o.id==to?add(h.id,o.id,c,"walk","",0,{t:c}):add(o.id,h.id,c,"walk","",0,{t:c})});
  {const nh=Object.values(N).find(o=>o.druid&&o.f.has(fac)),mg=findNode("Moonglade",fac);if(nh&&mg)walk(nh.id,mg.id,20)}
  // Horde with the Goblin Transponder: Scooty's two-way teleporter, Booty Bay <-> the Gnomeregan entrance
  if(fac=="H"&&ch.gnome){const bb=findNode("Booty Bay","H");if(bb){add(bb.id,GNOMER,20,"tele",TRANSPONDER,0,{t:20});add(GNOMER,bb.id,20,"tele",TRANSPONDER,0,{t:20})}}
  if(opt.tele&&from!=null){const T=(id,label)=>{if(id!=null&&vis(id)&&id!=from)add(from,id,10,"tele",label,0,{t:10})};
    const h=ch.hearth[fac];if(h!=null&&N[h])T(h,"Hearthstone");
    if(ch.mage>=20){if(fac=="A"){T(2,"Teleport: Stormwind");T(6,"Teleport: Ironforge")}else{T(23,"Teleport: Orgrimmar");T(11,"Teleport: Undercity")}}
    if(ch.mage>=30){if(fac=="A")T(-104,"Teleport: Darnassus");else T(22,"Teleport: Thunder Bluff")}
    if(ch.mage>=50)T(DALARAN,"Teleport: Dalaran");
    if(ch.druid){const nh=Object.values(N).find(o=>o.druid&&o.f.has(fac));if(nh)T(nh.id,"Teleport: Moonglade")}
    if(ch.gadget){const n=findNode("Gadgetzan",fac);if(n)T(n.id,"Ultrasafe Transporter: Gadgetzan")}
    if(ch.ever){const n=findNode("Everlook",fac);if(n)T(n.id,"Dimensional Ripper - Everlook")}}
  return g}
function dijkstra(g){const d={[from]:0},prev={},done=new Set();
  while(true){let u=null;for(const n in d)if(!done.has(n)&&(u==null||d[n]<d[u]))u=n;if(u==null||+u==to)break;done.add(u);
    for(const e of g[u]||[]){const nd=d[u]+e.c;if(d[e.b]==null||nd<d[e.b]){d[e.b]=nd;prev[e.b]={u:+u,e}}}}
  if(d[to]==null)return null;
  const legs=[];let c=to;while(c!=from){const p=prev[c];legs.unshift({a:p.u,b:c,kind:p.e.kind,label:p.e.label,cost:p.e.cost||0,t:p.e.t||0,via:p.e.via||[],route:p.e.route});c=p.u}
  return {nodes:[from,...legs.map(l=>l.b)],legs,total:legs.reduce((s,l)=>s+l.t,0),fare:legs.reduce((s,l)=>s+l.cost,0)}}
function solve(){routes=[];ri=0;if(from==null||to==null||from==to)return;
  const cands=[];const sig=r=>r.legs.map(l=>l.kind[0]+[l.a,...(l.via||[]),l.b].join(">")).join("|");
  const tryOpt=o=>{const r=dijkstra(graph(o));if(r)cands.push(r)};
  tryOpt({tele:1,ride:1});tryOpt({tele:0,ride:1});tryOpt({tele:1,ride:0});tryOpt({tele:0,ride:0});
  if(cands[0])for(const l of cands[0].legs.slice(0,3))tryOpt({tele:1,ride:1,ban:new Set([l.a+">"+l.b])});
  cands.sort((a,b)=>Math.abs(a.total-b.total)<=1?a.fare-b.fare:a.total-b.total);
  const best=cands[0];if(best)routes.push(best);
  // then the best route for a character missing a flight path the fastest one relies on (stops and landings along
  // the way, not where you start or end), one each, in the order you'd reach them
  if(best){const need=[];for(const l of best.legs)if(l.kind=="fly")for(const id of [...(l.via||[]),l.b])if(id!=from&&id!=to&&N[id].fp&&!CAPITAL.has(id)&&!need.includes(id))need.push(id);
    for(const id of need){if(routes.length>=3)break;const ex=new Set([id]),r=dijkstra(graph({tele:1,ride:1,ex}));
      if(r&&!routes.some(p=>sig(p)==sig(r))){r.ex=ex;r.why=`If you don't have ${N[id].name}`;routes.push(r)}}}
  // and the plain booking, the one the game makes if you just pick the destination, if there's room
  const one=fly(from)&&fly(to)&&flights().find(f=>f.a==from&&f.b==to);
  const plain=one&&{nodes:[from,...one.via,to],legs:[{a:from,b:to,kind:"fly",label:"",cost:one.cost,t:one.t+8,via:one.via}],total:one.t+8,fare:one.cost};
  if(plain&&routes.length<3&&!routes.some(p=>sig(p)==sig(plain)))routes.push(plain);
  if(!routes.length)routes=[{none:1,nodes:[],legs:[]}]}
// each flight leg is one booking with the stops the game will fly; a booking right after another means landing first
function steps(r){return r.legs.map((l,i)=>({...l,via:l.via||[],rebook:l.kind=="fly"&&i>0&&r.legs[i-1].kind=="fly"}))}

// ---- card ----
function renderRoutes(){const box=$("routes");
  if(from==null||to==null){box.innerHTML=`<p class="empty">${from==null?"Choose where you're starting, or "+(phone.matches?"tap":"click")+" a flight point on the map.":"Now choose a destination."}</p>`;return}
  if(from==to){box.innerHTML=`<p class="empty">You're already there.</p>`;return}
  if(routes[0].none){box.innerHTML=`<p class="empty">No route found between these two.</p>`;return}
  const nm=id=>esc(N[id].name);
  // a destination with its zone, as the game names it: "Booty Bay, Stranglethorn"
  const nz=id=>{const o=N[id];return `<b>${esc(o.name)}</b>${o.zone&&o.zone!=o.name?`<span class="dz">, ${esc(o.zone)}</span>`:""}`};
  const rebooks=r=>steps(r).some(s=>s.rebook);
  const why=routes.map((r,i)=>i==0?(routes.length>1?"Fastest":""):r.why||(r.legs.length==1&&r.legs[0].kind=="fly"&&!(r.legs[0].via||[]).length&&routes.some(rebooks)?"one flight":""));
  box.innerHTML=routes.map((r,i)=>{const st=steps(r);
    // Google Maps-style row: main way of travel, a name, why you'd pick it, then time and cost on the right
    // name a route by its stops that the other routes don't share, so two options never read the same
    const shared=id=>routes.length>1&&routes.every(o=>o.nodes.includes(id)),own=r.nodes.slice(1,-1).filter(id=>!shared(id));
    const mid=(own.length?own:r.nodes.slice(1,-1)).map(nm),main=st.reduce((m,s)=>s.t>m.t?s:m,st[0]);
    const name=mid.length?`via ${mid.slice(0,2).join(", ")}${mid.length>2?"…":""}`:main.kind=="fly"?(main.via&&main.via.length?`One flight, ${main.via.length} stop${main.via.length>1?"s":""}`:"Direct flight"):esc(main.label=="portal"?"Portal":main.label||"Ride");
    const sum=`<div class="rhead"><span class="rmode">${icon(main)}</span><div class="rt"><div class="rname">${name}</div>${why[i]?`<div class="rwhy">${why[i]}</div>`:""}</div><div class="rnum"><b>${fmtTot(r.total)}</b>${r.fare?`<small>${money(r.fare)}</small>`:routes.some(o=>o.fare)?`<small>Free</small>`:""}</div></div>`;
    const one=st.length==1;
    const list=i==ri&&!(one&&!(st[0].via||[]).length)?`<ol class="steps">${st.map(s=>`<li${s.via&&s.via.length?' class="via"':""}>${icon(s)}<div>${
      s.kind=="fly"?`Fly to ${nz(s.b)}${s.via.length?`<ul class="hops" aria-label="Flies through">${s.via.map(v=>`<li>${nm(v)}</li>`).join("")}</ul>`:""}${one?"":`<div class="t">${fmtT(s.t)}${s.rebook?" · new flight":""}</div>`}`:
      s.kind=="ride"?`${s.label} to ${nz(s.b)}<div class="t">5 min${s.route==LOOP?" · one-way loop":""}</div>`:
      s.kind=="tele"?(s.label==TRANSPONDER?`Teleporter to ${nz(s.b)}<div class="t">&lt;1 min</div>`:`${esc(s.label)}${s.label=="Hearthstone"?` to ${nz(s.b)}`:""}<div class="t">10 sec cast</div>`):
      `${s.label=="portal"?"Take the portal":"Ride"} to ${nz(s.b)}<div class="t">${fmtT(s.t)}</div>`}</div></li>`).join("")}</ol>`:"";
    return `<div class="rcard" data-r="${i}" ${i==ri?'aria-current="true"':'role="button" tabindex="0"'}>${sum}${list}</div>`}).join("");
  box.querySelectorAll('.rcard[data-r]').forEach(el=>{const go=()=>{const i=+el.dataset.r;if(i!=ri){ri=i;renderRoutes();fitRoute();draw()}};el.onclick=go;el.onkeydown=e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();go()}}})}

function charSummary(){const hs=ch.hearth[fac],p=[];if(hs!=null&&N[hs]&&N[hs].f.has(fac))p.push("Hearth: "+N[hs].name);
  if(ch.mage)p.push("Mage "+ch.mage);if(ch.druid)p.push("Druid");if(ch.gadget)p.push("Gadgetzan");if(ch.ever)p.push("Everlook");if(ch.gnome&&fac=="H")p.push("Gnomeregan");
  $("charSum").textContent=p.length?p.join(" · "):"Hearthstone, class teleports, engineering"}
const hearthList=q=>{q=(q||"").trim().toLowerCase();const seen=new Set();
  return Object.values(N).filter(o=>(o.fp||o.town)&&o.f.has(fac)&&!o.druid&&o.id!=-110).sort((a,b)=>a.name.localeCompare(b.name))
   .filter(o=>!seen.has(o.name)&&seen.add(o.name)).filter(o=>!q||o.name.toLowerCase().includes(q)||o.zone.toLowerCase().includes(q))
   .sort((a,b)=>(facOf(a)=="B")-(facOf(b)=="B"))};
function fillHearth(){$("hLegend").innerHTML=`<span><i style="background:var(--${fac})"></i>${FACN[fac]} only</span><span><i class="fB"></i>Both factions</span>`}
function syncChar(){fillHearth();document.querySelectorAll('[data-m]').forEach(b=>b.setAttribute("aria-pressed",+b.dataset.m==ch.mage));mageHint();$("druid").checked=ch.druid;$("gnome").checked=ch.gnome;$("questTp").hidden=fac!="H";$("gadget").checked=ch.gadget;$("ever").checked=ch.ever;charSummary()}

// ---- search boxes ----
const searchList=q=>{q=q.trim().toLowerCase();const seen=new Set();
  const sc=o=>{if(!q)return 0;const n=o.name.toLowerCase(),z=o.zone.toLowerCase();return n.startsWith(q)?0:n.includes(q)?1:z.includes(q)?2:9};
  return Object.values(N).filter(o=>o.f.has(fac)&&sc(o)<9).sort((a,b)=>CATO[catOf(a)]-CATO[catOf(b)]||sc(a)-sc(b)||a.name.localeCompare(b.name))
    .filter(o=>{const k=o.name+o.zone;if(seen.has(k))return false;seen.add(k);return true})};
// a search box with a dropdown. Opening it always shows the whole list (current choice marked); typing narrows it.
function combo(inp,ul,xb,set,cur,listFn=searchList,alwaysGroup=false){let items=[],act=0,mouseFocus=false;
  const li=(o,i,c)=>`<li role="option" id="${ul.id}-${i}" aria-selected="false" data-i="${i}" data-c="${catOf(o)}"${c?' class="cur"':""}><span class="nm">${o.inst?`<img class="ric" src="icons/${o.raid?"raid":"dungeon"}.png" alt="">`:""}${esc(o.name)}<span class="zn">, ${esc(o.zone)}</span></span>${o.inst?`<small>${o.lv}</small>`:o.dock?"<small>dock</small>":""}</li>`;
  const mark=()=>ul.querySelectorAll("li[data-i]").forEach((li,i)=>li.setAttribute("aria-selected",i==act));
  const show=all=>{const q=all?"":inp.value;items=listFn(q);const c=cur(),grp=true;let h="",g=null;
    act=Math.max(0,items.findIndex(o=>c!=null&&(o.id==c||(o.name==N[c].name&&o.zone==N[c].zone))));if(q.trim())act=0;
    items.forEach((o,i)=>{const k=catOf(o);if(grp&&k!=g){g=k;h+=`<li class="gh" role="presentation">${k=="B"?"Both factions":CATN[k]}</li>`}h+=li(o,i,c!=null&&o.id==c)});
    if(!items.length)h=`<li class="empty" role="presentation">No match for “${esc(inp.value)}”</li>`;
    ul.innerHTML=h;ul.hidden=false;inp.setAttribute("aria-expanded","true");mark();
    const sel=ul.querySelector(`li[data-i="${act}"]`);ul.scrollTop=sel&&!q.trim()?Math.max(0,sel.offsetTop-ul.clientHeight/2+sel.offsetHeight/2):0};
  const hide=()=>{ul.hidden=true;inp.setAttribute("aria-expanded","false")};
  const pick=i=>{const o=items[i];if(!o)return;hide();inp.blur();set(o.id)};
  inp.addEventListener("mousedown",()=>{if(document.activeElement!=inp)mouseFocus=true});
  inp.addEventListener("mouseup",e=>{if(mouseFocus){e.preventDefault();mouseFocus=false}}); // keep the text selected so typing replaces it
  inp.addEventListener("focus",()=>{inp.select();show(true)});inp.addEventListener("input",()=>show(false));
  inp.addEventListener("click",()=>{if(ul.hidden)show(true)});
  inp.addEventListener("keydown",e=>{if(ul.hidden&&e.key=="ArrowDown"){show(true);return}
    if((e.key=="ArrowDown"||e.key=="ArrowUp")&&items.length){e.preventDefault();act=(act+(e.key=="ArrowDown"?1:-1)+items.length)%items.length;mark();ul.querySelector(`li[data-i="${act}"]`).scrollIntoView({block:"nearest"})}
    else if(e.key=="Enter"){e.preventDefault();pick(act)}else if(e.key=="Escape"){hide();inp.blur()}});
  ul.addEventListener("mousedown",e=>{e.preventDefault();const li=e.target.closest("li[data-i]");if(li)pick(+li.dataset.i)});
  inp.addEventListener("blur",()=>setTimeout(()=>{hide();syncInputs()},120));
  // X just clears the field; the list opens when you click into it
  xb.onclick=()=>{hide();inp.blur();inp.value="";set(null)}}
function syncInputs(){const hs=ch.hearth[fac],hv=hs!=null&&N[hs]&&N[hs].f.has(fac)?hs:null;
  [["fromIn","xFrom",from],["toIn","xTo",to],["hearthIn","xHearth",hv]].forEach(([i,x,v])=>{const inp=$(i);if(document.activeElement!=inp)inp.value=v!=null?N[v].name:""; // never overwrite what's being typed
$(x).hidden=v==null;
    const fd=inp.parentNode;if(v!=null){fd.dataset.f=catOf(N[v]);fd.title=CATN[catOf(N[v])]}else{delete fd.dataset.f;fd.removeAttribute("title")}})}
const setFrom=id=>{from=id;popId=null;sheet("peek");update(true)},setTo=id=>{to=id;popId=null;sheet("peek");update(true)};
combo($("fromIn"),$("sgFrom"),$("xFrom"),setFrom,()=>from);combo($("toIn"),$("sgTo"),$("xTo"),setTo,()=>to);
const setHearth=id=>{ch.hearth[fac]=id;save();update(true)};
combo($("hearthIn"),$("sgHearth"),$("xHearth"),setHearth,()=>ch.hearth[fac],hearthList,true);

// ---- popover for a clicked point ----
function openPop(id){popId=id;const o=N[id];const out=EDG.filter(e=>e[0]==id&&fly(e[0])&&fly(e[1])).sort((a,b)=>secs(a)-secs(b));
  const fc=facOf(o),fb=o.inst?`<img class="pic" src="icons/${o.raid?"raid":"dungeon"}.png" alt=""><span class="badge" style="background:var(--${o.raid?"R":"Dg"})">${o.raid?"Raid":"Dungeon"}</span><span class="badge" style="background:#6b5a3a">Level ${o.lv}</span>`:`<span class="badge f${fc}" style="background:var(--${fc})">${FACN[fc]}</span>`+(o.fp?"":`<span class="badge" style="background:#6b5a3a">${o.dock?"Dock":"Town"}</span>`);
  const canH=(o.fp||o.town)&&o.f.has(fac)&&!o.druid,isH=ch.hearth[fac]==id;
  $("pop").innerHTML=`<h3>${esc(o.name)}</h3><div class="z">${esc(o.zone)} ${fb}${o.isNew?`<span class="badge" style="background:var(--new);color:#1b1b1b">New</span>`:""}</div>
   <div class="row"><button class="btn" id="pFrom">Start here</button><button class="btn pri" id="pTo">Go here</button></div>
   ${canH?`<button class="linkbtn hset" id="pHearth">${isH?"✓ Your hearthstone is set here":"Set my hearthstone here"}</button>`:""}
   ${out.length?`<details><summary>Direct flights (${out.length})</summary><table>${out.map(e=>`<tr><td>${esc(N[e[1]].name)}</td><td class="n">${fmtT(secs(e))}</td><td class="n">${money(e[2])}</td></tr>`).join("")}</table></details>`:""}`;
  $("pop").hidden=false;$("pFrom").onclick=()=>setFrom(id);$("pTo").onclick=()=>setTo(id);if(canH)$("pHearth").onclick=()=>{setHearth(isH?null:id);openPop(id)};draw()}
function closePop(){if(popId!=null){popId=null;$("pop").hidden=true;draw()}}
function placePop(){if(popId==null)return;const o=N[popId],p=$("pop");const m=svg.getScreenCTM();if(!m)return;const pt=svg.createSVGPoint();pt.x=o.x;pt.y=o.y;const sp=pt.matrixTransform(m);
  let x=sp.x+14,y=sp.y+14;const w=p.offsetWidth||260,h=p.offsetHeight||140;if(x+w>innerWidth-8)x=sp.x-w-14;if(y+h>innerHeight-8)y=sp.y-h-14;p.style.left=Math.max(8,x)+"px";p.style.top=Math.max(8,y)+"px"}

// ---- view ----
const fit=ids=>{const r=svg.getBoundingClientRect();const xs=ids.map(n=>N[n].x),ys=ids.map(n=>N[n].y);
  const card=document.querySelector(".card").getBoundingClientRect();const narrow=innerWidth<=700;
  let x0=Math.min(...xs)-120,x1=Math.max(...xs)+120,y0=Math.min(...ys)-90,y1=Math.max(...ys)+90;let w=Math.max(x1-x0,500),h=Math.max(y1-y0,340);
  // leave room for the card
  const freeW=narrow?r.width-56:r.width-card.right-16,freeH=narrow?r.height-sheetH():r.height;/* (phones: clear of the zoom buttons) */
  const asp=freeW/freeH||1.4;if(w/h<asp)w=h*asp;else h=w/asp;const sc=w/freeW;const W2=r.width*sc,H2=r.height*sc;
  const cx=(x0+x1)/2,cy=(y0+y1)/2;const fcx=narrow?freeW/2:card.right+16+freeW/2,fcy=narrow?(r.height-sheetH())/2:r.height/2;
  vb={x:cx-fcx*sc,y:cy-fcy*sc,w:W2,h:H2};setVB()};
const fitRoute=()=>{const r=routes[ri];if(r&&r.nodes&&r.nodes.length)fit(r.nodes)};
// the starting view fits the land and its flight points (not the whole parchment and its frame), and it's as far
// out as zooming goes
let homeW=MW;
const homeView=()=>{const r=svg.getBoundingClientRect();const docked=document.body.classList.contains("docked")&&innerWidth>700;const card=docked?{right:-8,height:0}:document.querySelector(".card").getBoundingClientRect();const narrow=innerWidth<=700;
  const pts=Object.values(N);let x0=Math.min(...pts.map(o=>o.x)),x1=Math.max(...pts.map(o=>o.x)),y0=Math.min(...pts.map(o=>o.y)),y1=Math.max(...pts.map(o=>o.y));
  const m=60;x0-=m;x1+=m;y0-=m;y1+=m;const cw=x1-x0,chh=y1-y0;
  const pad=narrow?12:28;const freeW=(narrow?r.width:r.width-card.right-8)-pad*2,freeH=(narrow?r.height-sheetH():r.height)-pad*2;
  // fit the land, but never so far out that the desk shows past the parchment's edge: on squarer or smaller
  // screens that means trimming a little off the sides rather than showing the whole sheet
  // (on phones the whole land is shown even if that means some desk above and below the parchment)
  const fitS=Math.max(cw/freeW,chh/freeH),sc=narrow?fitS:Math.min(fitS,MW/r.width,MH/r.height);const fcx=narrow?r.width/2:card.right+8+pad+freeW/2,fcy=narrow?(r.height-sheetH())/2:r.height/2;
  const w=r.width*sc,h=r.height*sc;let x=(x0+x1)/2-fcx*sc,y=(y0+y1)/2-fcy*sc;
  vb={x,y,w,h};setVB();homeW=vb.w};

// ---- phone layout: the panel is a bottom sheet. Pulled down ("peek") it shows From/To and the chosen route; pulled up
// ("full") it shows the steps, the other options and your character; pushed all the way down ("down") only the banner
// shows. Drag the banner, or tap it (down -> peek -> full -> peek), to switch.
const card=document.querySelector(".card"),phone=matchMedia("(max-width:700px)");
let sheetMode="peek",peekH=0;
const sheetH=()=>sheetMode=="full"?peekH:card.getBoundingClientRect().height;
shownFrac=()=>phone.matches?Math.max(.3,1-sheetH()/(svg.getBoundingClientRect().height||innerHeight)):1;
function measurePeek(){if(phone.matches&&sheetMode=="peek")peekH=card.getBoundingClientRect().height}
function sheet(m){sheetMode=m;const on=phone.matches;card.classList.toggle("peek",on&&m=="peek");card.classList.toggle("full",on&&m=="full");card.classList.toggle("down",on&&m=="down");
  document.body.classList.toggle("sheetfull",on&&m=="full");card.style.height="";if(on&&m=="peek")card.scrollTop=0;measurePeek()}
function syncSheet(){const ok=from!=null&&to!=null&&from!=to&&routes.length&&!routes[0].none,n=ok?routes.length-1:0;
  $("sheetMore").textContent=ok?(n?`Steps and ${n} more option${n>1?"s":""}`:"Steps and travel extras"):"Your character and travel extras";measurePeek()}

function renderStatic(){
  $("legend").innerHTML=`<span><i style="background:var(--${fac})"></i>${fac=="A"?"Alliance":"Horde"}</span><span><i class="fB"></i>Both factions</span><span><img class="lic" src="icons/dungeon.png" alt="">Dungeon</span><span><img class="lic" src="icons/raid.png" alt="">Raid</span><span><i style="background:none;border:2px solid var(--new)"></i>New in Forever</span><span><img class="lic" src="icons/boat-m.png" alt="">Boat</span><span><img class="lic" src="icons/zeppelin-m.png" alt="">Zeppelin</span>`;
  const rows=[],seen=new Set();for(const t of [...G.trans,["Tram","Deeprun Tram","A"]]){if(seen.has(t[1]))continue;seen.add(t[1]);rows.push(t)}
  $("ttable").innerHTML=rows.map(t=>`<tr><td>${t[0]}${NEWR.has(t[1])?` <span class="badge" style="background:var(--new);color:#1b1b1b">New</span>`:""}</td><td>${esc(t[1]).replace(/ - /g," ↔ ")}${t[1]==LOOP?" (one-way loop: Menethil → Southshore → Auberdine → Menethil)":""}${t[0]=="Skyship"?" (Zephras Isle floats in Skywall; it's drawn north of the Maelstrom)":""}</td><td>${t[2]=="AH"?"Both":t[2]=="A"?"Alliance":"Horde"}</td></tr>`).join("")}
const linkFor=()=>{const p=new URLSearchParams({f:fac});const sl=id=>slug(N[id].name).replace(/^-|-$/g,"");if(from!=null)p.set("from",sl(from));if(to!=null)p.set("to",sl(to));return p.toString()};
const syncLink=()=>{const has=from!=null||to!=null;$("shareRow").hidden=!(from!=null&&to!=null);
  try{history.replaceState(null,"",has?"?"+linkFor():location.pathname)}catch(e){}};
function update(refit){
  document.documentElement.dataset.fac=fac;
  $("fA").setAttribute("aria-pressed",fac=="A");$("fH").setAttribute("aria-pressed",fac=="H");
  if(from!=null&&!vis(from))from=null;if(to!=null&&!vis(to))to=null;
  syncInputs();solve();renderRoutes();syncChar();renderStatic();
  if(popId!=null&&!vis(popId))closePop();
  syncSheet();
  if(refit)fitRoute();
  if(popId==null)$("pop").hidden=true;syncLink();draw()}

// ---- events ----
// a starter route so the map shows something on arrival: Stormwind to Ratchet, Orgrimmar to Booty Bay. Switching faction
// swaps it for the other faction's, unless you've already picked your own route
const STARTER={A:[2,80],H:[23,18]};
const isStarter=f=>from==STARTER[f][0]&&to==STARTER[f][1];
const pickFac=f=>{if(f==fac)return;if(isStarter(fac)||(from==null&&to==null&&!phone.matches))[from,to]=STARTER[f];fac=f;save();homeView();update(false)};/* switching faction shows the whole world */
$("shareBtn").onclick=async()=>{const url=location.origin+location.pathname+"?"+linkFor(),lab=$("shareBtn").querySelector("span");
  let ok=false;try{await navigator.clipboard.writeText(url);ok=true}catch(e){try{const t=document.createElement("textarea");t.value=url;document.body.appendChild(t);t.select();ok=document.execCommand("copy");t.remove()}catch(e2){}}
  lab.textContent=ok?"Link copied":"Copy failed: "+url;setTimeout(()=>lab.textContent="Copy link to this route",2200)};
$("fA").onclick=()=>pickFac("A");$("fH").onclick=()=>pickFac("H");
const swapEnds=()=>{[from,to]=[to,from];sheet("peek");update(true)};
$("swap").onclick=swapEnds;
// drag to reorder (Google Maps style): drag a row by its handle past the other row's midpoint to swap
(()=>{const box=$("stops"),rows=[...box.querySelectorAll(".stop")];
  rows.forEach((row,idx)=>{const g=row.querySelector(".grip"),other=rows[1-idx];let y0=null,step=0,crossed=false;
    const end=()=>{if(y0==null)return;y0=null;box.classList.remove("dragging");
      if(crossed){row.classList.remove("dragging");row.style.transform=`translateY(${idx?-step:step}px)`;
        setTimeout(()=>{box.classList.add("snap");row.style.transform=other.style.transform="";swapEnds();
          requestAnimationFrame(()=>requestAnimationFrame(()=>box.classList.remove("snap")))},180)}
      else{row.classList.remove("dragging");row.style.transform=other.style.transform=""}};
    g.addEventListener("pointerdown",e=>{if(e.button)return;e.preventDefault();g.setPointerCapture(e.pointerId);
      y0=e.clientY;step=Math.abs(rows[1].offsetTop-rows[0].offsetTop);crossed=false;row.classList.add("dragging");box.classList.add("dragging")});
    g.addEventListener("pointermove",e=>{if(y0==null)return;let dy=e.clientY-y0;
      dy=idx?Math.max(-step-8,Math.min(8,dy)):Math.max(-8,Math.min(step+8,dy));
      row.style.transform=`translateY(${dy}px)`;crossed=idx?dy<-step/2:dy>step/2;
      other.style.transform=crossed?`translateY(${idx?step:-step}px)`:""});
    g.addEventListener("pointerup",end);g.addEventListener("pointercancel",end);
    g.addEventListener("keydown",e=>{if((e.key=="ArrowDown"&&!idx)||(e.key=="ArrowUp"&&idx)){e.preventDefault();swapEnds();rows[1-idx].querySelector(".grip").focus()}});
  })})();

document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ch.mage=+b.dataset.m;save();update(true)});
$("druid").onchange=e=>{ch.druid=e.target.checked;save();update(true)};$("gnome").onchange=e=>{ch.gnome=e.target.checked;save();update(true)};$("gadget").onchange=e=>{ch.gadget=e.target.checked;save();update(true)};$("ever").onchange=e=>{ch.ever=e.target.checked;save();update(true)};
$("aboutBtn").onclick=()=>{$("about").hidden=false;$("aboutX").focus()};$("aboutX").onclick=()=>{$("about").hidden=true};
$("about").onclick=e=>{if(e.target.id=="about")$("about").hidden=true};
addEventListener("keydown",e=>{if(e.key=="Escape"){$("about").hidden=true;closePop()}});
let drag=null,moved=false,pinch=null;const touches=new Map();
const toSvg=(cx,cy)=>{const r=mapBox();const k=Math.max(vb.w/r.width,vb.h/r.height);const ox=(r.width*k-vb.w)/2,oy=(r.height*k-vb.h)/2;return[vb.x+(cx-r.left)*k-ox,vb.y+(cy-r.top)*k-oy,k]};
const zoomTo=(f,cx,cy)=>{const [x,y]=toSvg(cx,cy);const nw=Math.min(homeW,Math.max(70,vb.w*f));const s=nw/vb.w;vb={x:x-(x-vb.x)*s,y:y-(y-vb.y)*s,w:nw,h:vb.h*s}};
const zoomAt=(f,cx,cy)=>{zoomTo(f,cx,cy);setVB();draw()};
let wheelT=0;
svg.addEventListener("wheel",e=>{e.preventDefault();liveStart();zoomTo(e.deltaY>0?1.15:1/1.15,e.clientX,e.clientY);liveShow();clearTimeout(wheelT);wheelT=setTimeout(liveEnd,180)},{passive:false});
// two fingers pinch to zoom around the point between them (and pan as they move)
const pinchAt=()=>{const [a,b]=[...touches.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y)||1,x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
svg.addEventListener("pointerdown",e=>{touches.set(e.pointerId,{x:e.clientX,y:e.clientY});svg.setPointerCapture(e.pointerId);
  if(touches.size==2){const m=pinchAt();const [x,y,k]=toSvg(m.x,m.y);pinch={d:m.d,x,y,k,vb:{...vb}};drag=null;moved=true;liveStart();return}
  if(touches.size>2)return;drag={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y};moved=false});
svg.addEventListener("pointermove",e=>{if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&touches.size>=2){const m=pinchAt(),r=mapBox();const nw=Math.min(homeW,Math.max(70,pinch.vb.w*pinch.d/m.d)),s=nw/pinch.vb.w,k=pinch.k*s;
    vb={x:pinch.x-(m.x-r.left)*k,y:pinch.y-(m.y-r.top)*k,w:nw,h:pinch.vb.h*s};liveShow();return}
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4){moved=true;svg.classList.add("drag")}
  if(moved){liveStart();const [, ,k]=toSvg(0,0);vb.x=drag.vx-dx*k;vb.y=drag.vy-dy*k;liveShow()}});
const lift=e=>{touches.delete(e.pointerId);if(pinch){if(touches.size<2){pinch=null;drag=null;svg.classList.remove("drag");liveEnd()}return true}return false};
svg.addEventListener("pointercancel",e=>{lift(e);drag=null;svg.classList.remove("drag");liveEnd()});
svg.addEventListener("pointerup",e=>{if(lift(e)||(moved&&!drag))return;svg.classList.remove("drag");const wasDrag=moved;drag=null;if(wasDrag){liveEnd();return}
  const t=document.elementFromPoint(e.clientX,e.clientY);const g=t&&t.closest(".n");
  if(g)openPop(+g.dataset.n);else closePop()});
const center=()=>{const r=svg.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]};
$("zin").onclick=()=>zoomAt(1/1.4,...center());$("zout").onclick=()=>zoomAt(1.4,...center());$("zre").onclick=()=>{homeView();draw()};
const ro=new ResizeObserver(()=>draw());ro.observe(svg);
// shareable links: ?f=A&from=stormwind&to=ratchet opens that route. Names are matched within the faction
const fromLink=(()=>{try{const q=new URLSearchParams(location.search);const f=q.get("f");if(f!="A"&&f!="H")return false;
  const find=v=>{if(!v)return null;const c=Object.values(N).filter(o=>slug(o.name).replace(/^-|-$/g,"")==v&&o.f.has(f));return c.length?c[0].id:null};
  const a=find(q.get("from")),b=find(q.get("to"));if(a==null&&b==null)return false;fac=f;from=a;to=b;return true}catch(e){return false}})();
if(!fromLink&&!phone.matches)[from,to]=STARTER[fac];/* phones start empty */
// panel layout: docked to the left edge (default) or floating over the map; remembered between visits
{const dockBtn=$("dock");const setDock=on=>{document.body.classList.toggle("docked",on);const l=on?"Float the panel over the map":"Dock the panel to the left";dockBtn.setAttribute("aria-label",l);dockBtn.title=l;dockBtn.setAttribute("aria-pressed",on)};
  let docked=true;try{docked=localStorage.getItem("fmf-dock")!=="0"}catch(e){}setDock(docked);
  dockBtn.onclick=()=>{docked=!docked;setDock(docked);try{localStorage.setItem("fmf-dock",docked?"1":"0")}catch(e){}homeView();draw()}}
{const head=card.querySelector(".head");let s0=null;
  const fullH=()=>innerHeight-64,headH=()=>head.offsetHeight;
  head.addEventListener("pointerdown",e=>{if(!phone.matches||e.button||e.target.closest("button"))return;
    s0={y:e.clientY,h:card.getBoundingClientRect().height,moved:false};head.setPointerCapture(e.pointerId)});
  head.addEventListener("pointermove",e=>{if(!s0)return;const dy=e.clientY-s0.y;if(!s0.moved&&Math.abs(dy)<6)return;
    if(!s0.moved){s0.moved=true;card.classList.remove("peek");card.classList.add("dragging")}
    card.style.height=Math.max(headH(),Math.min(fullH(),s0.h-dy))+"px"});
  const end=()=>{if(!s0)return;const st=s0;s0=null;card.classList.remove("dragging");
    if(!st.moved){sheet(sheetMode=="peek"?"full":"peek");return}
    // settle on the nearest of the three heights
    const h=card.getBoundingClientRect().height;sheet(h>(peekH+fullH())/2?"full":h<(headH()+peekH)/2?"down":"peek")};
  head.addEventListener("pointerup",end);head.addEventListener("pointercancel",end);
  $("sheetMore").onclick=()=>sheet("full");
  $("routes").addEventListener("click",()=>{if(phone.matches&&sheetMode=="peek")sheet("full")});
  ["fromIn","toIn","hearthIn"].forEach(i=>$(i).addEventListener("focus",()=>{if(phone.matches&&sheetMode=="peek")sheet("full")}));
  $("charTog").onclick=()=>{const bar=$("charTog").parentNode,open=!bar.classList.contains("open");bar.classList.toggle("open",open);$("charTog").setAttribute("aria-expanded",open)};
  phone.addEventListener("change",()=>{sheet("peek");homeView();draw()})}
sheet("peek");homeView();update(false);
}
