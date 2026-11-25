(() => {
  const F = window.__fm, N = F.N, bad = [];
  const all = Object.values(N);
  let n = 0;
  for (const fac of ["A", "H"]) {
    F.setFac(fac);
    F.setCh({ hearth: { A: 26, H: 23 }, mage: 50, druid: true, gadget: true, ever: true, gnome: true });
    const pts = all.filter(o => o.f.has(fac));
    for (let i = 0; i < 400; i++) {
      const a = pts[(i * 31) % pts.length], b = pts[(i * 97 + 13) % pts.length];
      if (a.id === b.id) continue;
      F.set(a.id, b.id); F.update(); n++;
      const card = document.getElementById("routes").innerText;
      if (/undefined|NaN|null/.test(card)) bad.push(`${fac} ${a.name} -> ${b.name}: card shows "${card.match(/.{0,30}(undefined|NaN|null).{0,20}/)[0]}"`);
      for (const p of document.querySelectorAll("#map path")) if (/NaN|undefined/.test(p.getAttribute("d") || "")) { bad.push(`${fac} ${a.name} -> ${b.name}: map line has NaN`); break }
      if (/No route/.test(card)) bad.push(`${fac} ${a.name} -> ${b.name}: no route shown`);
    }
  }
  // "Not learned?" adds a chip and re-plans without that flight point; the chip's ✕ puts it back
  F.setFac("A"); F.setCh({ hearth: { A: null, H: null }, mage: 0, druid: false, gadget: false, ever: false, gnome: false });
  const IF = all.find(o => o.name === "Ironforge" && o.f.has("A")), GZ = all.find(o => o.name === "Gadgetzan" && o.f.has("A"));
  F.set(IF.id, GZ.id); F.update();
  const box = document.getElementById("routes"), before = box.innerText, link = box.querySelector("[data-no]");
  if (!link) bad.push("no Not learned? link on Ironforge -> Gadgetzan");
  else {
    const x = +link.dataset.no; link.click();
    const chip = box.querySelector(`[data-un="${x}"]`);
    if (!chip) bad.push("no Not learned chip after Not learned?");
    if (F.routes[0].legs.some(l => l.kind === "fly" && (l.b === x || (l.via || []).includes(x)))) bad.push("route still flies through the left-out flight point");
    if (!/avoid=/.test(location.search)) bad.push("route link doesn't carry the left-out flight point");
    if (chip) { chip.click(); if (box.querySelector("[data-un]")) bad.push("chip didn't go away"); if (box.innerText !== before) bad.push("removing the chip didn't restore the route") }
    box.querySelector("[data-no]").click(); // leave one out again, then start a new trip
    F.set(IF.id, all.find(o => o.name === "Booty Bay" && o.f.has("A")).id); F.update();
    if (box.querySelector("[data-un]")) bad.push("left-out flight points carried over to a new trip");
  }
  // "On cooldown?" on a hearthstone step re-plans without it; the chip's ✕ brings it back
  {
    F.setFac("A"); F.setCh({ hearth: { A: 2, H: null }, mage: 0, druid: false, gadget: false, ever: false, gnome: false });
    const RA = all.find(o => o.name === "Ratchet" && o.f.has("A")), SW = all.find(o => o.name === "Stormwind" && o.f.has("A"));
    F.set(RA.id, SW.id); F.update();
    const box = document.getElementById("routes"), before = box.innerText, cd = box.querySelector('[data-cd="Hearthstone"]');
    if (!cd) bad.push("no On cooldown? link on the hearthstone step (Ratchet -> Stormwind, hearth Stormwind)");
    else {
      cd.click();
      if (F.routes.some(r => r.legs.some(l => l.label === "Hearthstone"))) bad.push("a route still uses the hearthstone on cooldown");
      if (!box.querySelector('[data-uc="Hearthstone"]')) bad.push("no On cooldown chip");
      if (!/cd=hearthstone/.test(location.search)) bad.push("route link doesn't carry the cooldown");
      box.querySelector('[data-uc="Hearthstone"]').click();
      if (box.innerText !== before) bad.push("removing the cooldown chip didn't restore the route");
    }
    F.setCh({ hearth: { A: null, H: null } });
  }
  return { rendered: n, bad: bad.slice(0, 30), badCount: bad.length };
})()
