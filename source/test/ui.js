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
  return { rendered: n, bad: bad.slice(0, 30), badCount: bad.length };
})()
