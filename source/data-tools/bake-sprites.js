// Bake the glow round the boat and zeppelin icons, and Zephras Isle's drop shadow and halo, into plain images.
//
//   node bake-sprites.js        (needs Playwright's Chromium)
//
// These were SVG filters drawn live on every redraw, which is slow on phones. Renders them once, exactly as the app
// drew them, into docs/icons/boat-glow.png, docs/icons/zeppelin-glow.png and docs/isle-baked.png (then saved as
// isle-baked.webp, quality 85, with Pillow).
const {chromium}=require("playwright");const fs=require("fs"),path=require("path");
const docs=path.resolve(__dirname,"../../docs");
const g=fs.readFileSync(path.resolve(__dirname,"../src/gdata.js"),"utf8");
const [ix,iy,iw,ih]=JSON.parse(g.match(/"isle":(\[[^\]]*\])/)[1]);
(async()=>{const b=await chromium.launch();const tmp=path.join(docs,"__bake.html");
  const shot=async(svg,w,h,file)=>{const p=await b.newPage({viewport:{width:w,height:h}});
    fs.writeFileSync(tmp,`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await p.goto("file://"+tmp);await p.waitForLoadState("load");await p.waitForTimeout(200);
    fs.writeFileSync(path.join(docs,file),await p.screenshot({omitBackground:true}));await p.close()};
  // icons: 34 px on screen with the glow reaching 40% past each side (61.2 px box), rendered 4x for sharp screens
  for(const n of ["boat","zeppelin"])await shot(`<svg xmlns="http://www.w3.org/2000/svg" width="245" height="245" viewBox="-13.6 -13.6 61.2 61.2"><defs><filter id="dockglow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/><feGaussianBlur in="d" stdDeviation="2.6" result="b"/><feFlood flood-color="#fff6dc" flood-opacity=".95"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><image href="icons/${n}-m.png" x="0" y="0" width="34" height="34" filter="url(#dockglow)"/></svg>`,245,245,`icons/${n}-glow.png`);
  // the isle: halo, then the island with its shadow, in a box 30% wider each side and from 30% above to 40% below
  const bx=ix-.3*iw,by=iy-.3*ih,bw=1.6*iw,bh=1.7*ih,S=459/iw,W=Math.round(bw*S),H=Math.round(bh*S);
  await shot(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${bx} ${by} ${bw} ${bh}"><defs><filter id="isleSh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${ih*.06}" stdDeviation="${ih*.035}" flood-color="#0d1a2a" flood-opacity=".55"/></filter>
    <radialGradient id="isleGlow"><stop offset="0" stop-color="#eef6ff" stop-opacity=".45"/><stop offset="1" stop-color="#eef6ff" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="${ix+iw/2}" cy="${iy+ih*.55}" rx="${iw*.78}" ry="${ih*.62}" fill="url(#isleGlow)"/>
    <image href="zephras-isle.webp" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="none" filter="url(#isleSh)"/></svg>`,W,H,"isle-baked.png");
  fs.unlinkSync(tmp);await b.close();console.log("isle box",[bx,by,bw,bh].map(v=>+v.toFixed(2)).join(","))})();
