// Bake the zoomed-in map look into plain image tiles, so phones only have to draw pictures.
//
//   node bake-map.js            (needs Playwright's Chromium; run from anywhere)
//
// Close in, the map is the clean parchment toned a little warmer, with a land tint, paper grain and a sea texture
// blended over it. Drawing those filters, masks and blends live is slow on phones (Safari's engine above all), so
// this renders exactly that stack once, in Chromium, into 512x512-unit tiles: docs/bake/near_<row>_<col>.webp at
// 2 pixels a unit, and docs/bake/deep_<row>_<col>.webp at 3 pixels a unit with the finer sea texture that shows when
// zoomed right in. The app draws them in place of the live layers, fading in as you zoom as those did; the detailed
// zone art (hires3) and city maps still go on top, unchanged. Writes PNGs; convert with to-webp below.
const {chromium}=require("playwright");const fs=require("fs"),path=require("path");
const docs=path.resolve(__dirname,"../../docs"),out=path.join(docs,"bake");
const g=fs.readFileSync(path.resolve(__dirname,"../src/gdata.js"),"utf8");
const MW=+g.match(/"W":(\d+)/)[1],MH=+g.match(/"H":(\d+)/)[1];
const T=512;
const near=`<image href="azeroth-clean.jpg" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" style="filter:saturate(.65) sepia(.3) brightness(.92)"/>
<defs><mask id="landM" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}"><image href="landmask.png" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none"/></mask>
<mask id="seaM" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}"><image href="seamask.png" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none"/></mask>
<pattern id="grainP" patternUnits="userSpaceOnUse" width="60" height="60"><image href="grain.png" width="60" height="60"/></pattern>
<pattern id="seaP2" patternUnits="userSpaceOnUse" width="150" height="100"><image href="seatex.png" width="150" height="100" preserveAspectRatio="none"/></pattern>
<pattern id="seaP" patternUnits="userSpaceOnUse" width="420" height="280"><image href="seatex.png" width="420" height="280" preserveAspectRatio="none"/></pattern></defs>
<rect width="${MW}" height="${MH}" fill="#93703a" mask="url(#landM)" opacity=".5"/><rect width="${MW}" height="${MH}" fill="url(#grainP)" mask="url(#landM)" style="mix-blend-mode:overlay" opacity=".8"/>
<rect width="${MW}" height="${MH}" fill="url(#seaP)" mask="url(#seaM)" style="mix-blend-mode:overlay" opacity=".75"/>`;
const deep=near+`<rect width="${MW}" height="${MH}" fill="url(#seaP2)" mask="url(#seaM)" style="mix-blend-mode:overlay" opacity=".5"/>`;
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch();const tmp=path.join(docs,"__bake.html");let n=0;
  for(const [name,art,PX] of [["near",near,1024],["deep",deep,1536]]){const p=await b.newPage({viewport:{width:PX,height:PX}});
    for(let r=0;r*T<MH;r++)for(let c=0;c*T<MW;c++){
      fs.writeFileSync(tmp,`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}" viewBox="${c*T} ${r*T} ${T} ${T}"><g style="isolation:isolate">${art}</g></svg>`);
      await p.goto("file://"+tmp);await p.waitForLoadState("load");await p.waitForTimeout(150);
      fs.writeFileSync(path.join(out,`${name}_${r}_${c}.png`),await p.screenshot({omitBackground:true}));n++}
    await p.close()}
  fs.unlinkSync(tmp);await b.close();console.log("tiles",n)})();
// to-webp (Python, Pillow): for f in docs/bake/*.png: Image.open(f).save(f[:-4]+".webp","WEBP",quality=80,method=6)
