// Route-finder test suite: run inside the test page (window.__fm).
(() => {
  const F = window.__fm, N = F.N, R = { data: [], pairs: {}, options: [], spot: [], perf: {} };
  const name = id => N[id] ? N[id].name : String(id);
  const nodes = Object.values(N);
  const edgeKey = (a, b) => a + ">" + b;
  const EDGE = new Map(F.EDG.map(e => [edgeKey(e[0], e[1]), e]));

  // ---------- A. data sanity ----------
  for (const e of F.EDG) {
    const [a, b, , len, pts] = e, A = N[a], B = N[b];
    const share = [...A.f].some(f => B.f.has(f));
    if (!share) R.data.push(`flight ${name(a)} -> ${name(b)} links nodes with no faction in common`);
    if (!EDGE.has(edgeKey(b, a))) R.data.push(`flight ${name(a)} -> ${name(b)} has no return flight`);
    const straight = Math.hypot(A.x - B.x, A.y - B.y) * F.YPU;
    if (len < straight * 0.97) R.data.push(`flight ${name(a)} -> ${name(b)} is shorter (${len|0} yd) than the straight line (${straight|0} yd)`);
    if (len > straight * 3.2 && straight > 300) R.data.push(`flight ${name(a)} -> ${name(b)} is ${(len / straight).toFixed(1)}x the straight line`);
    if (pts && pts.length >= 4) {
      const d0 = Math.hypot(pts[0] - A.x, pts[1] - A.y), d1 = Math.hypot(pts[pts.length - 2] - B.x, pts[pts.length - 1] - B.y);
      if (d0 > 12 || d1 > 12) R.data.push(`flight path ${name(a)} -> ${name(b)} starts/ends ${d0.toFixed(0)}/${d1.toFixed(0)} units off its nodes`);
    }
    if (!(F.secs(e) > 0)) R.data.push(`flight ${name(a)} -> ${name(b)} has a bad time`);
  }

  // ---------- B. every pair, both factions, no extras ----------
  const base = { hearth: { A: null, H: null }, mage: 0, druid: false, gadget: false, ever: false, gnome: false };
  const t0 = performance.now();
  for (const fac of ["A", "H"]) {
    F.setFac(fac); F.setCh(base);
    const pts = nodes.filter(o => o.f.has(fac) && !o.druid);
    const out = R.pairs[fac] = { pairs: 0, unreachable: [], problems: [], slowest: null };
    for (const a of pts) for (const b of pts) {
      if (a.id === b.id || (a.name === b.name && a.zone === b.zone)) continue;
      out.pairs++;
      F.set(a.id, b.id); F.solve();
      const rs = F.routes;
      if (!rs.length || rs[0].none) { out.unreachable.push(`${a.name} -> ${b.name}`); continue; }
      const P = m => out.problems.length < 60 && out.problems.push(`${a.name} -> ${b.name}: ${m}`);
      rs.forEach((r, i) => {
        let cur = a.id, seen = new Set([a.id]), sum = 0;
        for (const l of r.legs) {
          if (l.a !== cur) P(`route ${i + 1} legs don't chain`);
          if (!(l.t >= 0) || !isFinite(l.t)) P(`route ${i + 1} has a leg with a bad time`);
          sum += l.t;
          if (seen.has(l.b)) P(`route ${i + 1} visits ${name(l.b)} twice`);
          seen.add(l.b); cur = l.b;
          const B = N[l.b];
          if (!B.f.has(fac)) P(`route ${i + 1} goes through ${B.name}, which ${fac} can't use`);
          if (B.inst && l.b !== b.id) P(`route ${i + 1} passes through the entrance ${B.name}`);
          if (l.kind === "fly") {
            const dir = EDGE.has(edgeKey(l.a, l.b)), game = gameChain(l.a, l.b, r.ex);
            const want = dir ? [] : game;
            if (!want) P(`route ${i + 1} flies ${name(l.a)} -> ${name(l.b)}, which the game can't book`);
            else if (JSON.stringify(want) !== JSON.stringify(l.via || [])) P(`route ${i + 1} flight ${name(l.a)} -> ${name(l.b)} stops don't match the game`);
            const seq = [l.a, ...(l.via || []), l.b]; let tt = 0; for (let q = 0; q + 1 < seq.length; q++) { const e = EDGE.get(edgeKey(seq[q], seq[q + 1])); if (!e) P(`missing hop`); else tt += F.secs(e) }
            if (Math.abs(tt + 8 - l.t) > 0.5) P(`route ${i + 1} flight time doesn't match its hops`);
            if ([l.a, ...(l.via || []), l.b].some(x => N[x].druid)) P(`route ${i + 1} uses the druid flight master without Druid`);
          }
          if (l.kind === "ride") {
            const ok = F.TR.some(t => t[1] === l.route && F.tUse(t) &&
              (N[t[3]].name === N[l.a].name) && (N[t[4]].name === N[l.b].name));
            if (!ok) P(`route ${i + 1} takes ${l.label} ${name(l.a)} -> ${name(l.b)}, which doesn't sail that way for ${fac}`);
          }
          if (l.kind === "tele") P(`route ${i + 1} uses ${l.label} with no teleports enabled`);
          if (l.kind === "walk") {
            const ends = [N[l.a], N[l.b]];
            if (!ends.some(o => o.inst || o.town || o.dock || o.druid) && !F.G.walks.some(w => (w[0] === l.a && w[1] === l.b) || (w[1] === l.a && w[0] === l.b)))
              P(`route ${i + 1} rides overland ${name(l.a)} -> ${name(l.b)} between two flight points`);
            if (l.t > 600) P(`route ${i + 1} has a ${Math.round(l.t / 60)} min ride ${name(l.a)} -> ${name(l.b)}`);
          }
        }
        if (cur !== b.id) P(`route ${i + 1} doesn't end at the destination`);
        if (Math.abs(sum - r.total) > 0.01) P(`route ${i + 1} total ${r.total} != sum of legs ${sum}`);
        if (i > 0 && r.total + 1.01 < rs[0].total) P(`an alternative is faster than the first route`);
      });
      const sigs = rs.map(r => r.legs.map(l => l.kind + [l.a, ...(l.via || []), l.b].join(">")).join("|"));
      if (new Set(sigs).size !== sigs.length) P(`duplicate alternatives`);
      const direct = EDGE.get(edgeKey(a.id, b.id));
      if (direct && fly(a.id) && fly(b.id) && rs[0].total > F.secs(direct) + 8.5) P(`best route (${rs[0].total | 0}s) is slower than the direct flight (${F.secs(direct) | 0}s)`);
      if (!out.slowest || rs[0].total > out.slowest.t) out.slowest = { t: rs[0].total, pair: `${a.name} -> ${b.name}` };
    }
  }
  function fly(id) { return F.fly(id) }
  // the game's booking rule, worked out independently of the app: direct if there's a direct flight,
  // otherwise the shortest chain by flight-path length over the faction's flight points
  function gameChain(a, b, ex) {
    const ok = id => N[id] && N[id].fp && F.fly(id) && !(ex && ex.has(id));
    const D = new Map([[a, 0]]), P = new Map(), done = new Set();
    for (;;) { let u = null; for (const [k, d] of D) if (!done.has(k) && (u === null || d < D.get(u))) u = k; if (u === null) break; done.add(u);
      for (const e of F.G.edges) if (e[0] === u && ok(e[1])) { const nd = D.get(u) + e[3]; if (!D.has(e[1]) || nd < D.get(e[1])) { D.set(e[1], nd); P.set(e[1], u) } } }
    if (!D.has(b)) return null; const via = []; let c = P.get(b); while (c !== a) { via.unshift(c); c = P.get(c) } return via
  }
  R.perf.pairsMs = Math.round(performance.now() - t0);

  // ---------- C. options: only help, and are used correctly ----------
  const best = (fac, f, t, o) => { F.setFac(fac); F.setCh({ ...base, ...o }); F.set(f, t); F.solve(); return F.routes[0] };
  const ids = fac => nodes.filter(o => o.f.has(fac) && !o.druid && !o.inst).map(o => o.id);
  const sample = (arr, n) => { const s = []; for (let i = 0; i < n; i++)s.push(arr[(i * 7919) % arr.length]); return s };
  const OPTS = {
    A: [{ hearth: { A: 26, H: null } }, { mage: 20 }, { mage: 30 }, { mage: 50 }, { druid: true }, { gadget: true }, { ever: true }],
    H: [{ hearth: { A: null, H: 23 } }, { mage: 20 }, { mage: 30 }, { mage: 50 }, { druid: true }, { gadget: true }, { ever: true }, { gnome: true }]
  };
  for (const fac of ["A", "H"]) {
    const I = ids(fac), S = sample(I, 40), T = sample(I.slice().reverse(), 40);
    for (const o of OPTS[fac]) {
      let worse = 0, used = 0, bad = [];
      for (let i = 0; i < S.length; i++) {
        const f = S[i], t = T[i]; if (f === t) continue;
        const b0 = best(fac, f, t, {}), b1 = best(fac, f, t, o);
        if (b0.none || b1.none) continue;
        if (b1.total > b0.total + 0.5) { worse++; bad.push(`${name(f)} -> ${name(t)} got slower (${b0.total | 0}s -> ${b1.total | 0}s)`) }
        b1.legs.forEach((l, k) => {
          if (l.kind !== "tele") return; used++;
          if (l.label !== "Gnomeregan Teleporter" && k !== 0) bad.push(`${name(f)} -> ${name(t)}: ${l.label} used mid-route`);
          if (l.label !== "Gnomeregan Teleporter" && l.a !== f) bad.push(`${name(f)} -> ${name(t)}: ${l.label} not cast from the start`);
        });
      }
      R.options.push({ fac, option: JSON.stringify(o), sampled: S.length, teleportsUsed: used, slower: worse, issues: bad.slice(0, 5) });
    }
  }

  // ---------- E. "Not learned?": leaving out a flight point the fastest route uses ----------
  R.avoid = { tried: 0, unreachable: [], problems: [] };
  for (const fac of ["A", "H"]) {
    F.setFac(fac); F.setCh(base);
    const pts = nodes.filter(o => o.f.has(fac) && !o.druid && !o.inst);
    for (let i = 0; i < 150; i++) {
      const a = pts[(i * 37) % pts.length], b = pts[(i * 89 + 7) % pts.length];
      if (a.id === b.id || a.name === b.name) continue;
      F.setAvoid([]); F.set(a.id, b.id); F.solve();
      const r0 = F.routes[0]; if (!r0 || r0.none) continue;
      const used = [];
      for (const l of r0.legs) if (l.kind === "fly") for (const id of [...(l.via || []), l.b]) if (id !== a.id && N[id].fp && !used.includes(id)) used.push(id);
      for (const x of used) {
        F.setAvoid([x]); F.solve(); R.avoid.tried++;
        const P = m => R.avoid.problems.length < 40 && R.avoid.problems.push(`${fac} ${a.name} -> ${b.name} without ${name(x)}: ${m}`);
        const rs = F.routes;
        if (!rs.length || rs[0].none) { R.avoid.unreachable.push(`${fac} ${a.name} -> ${b.name} without ${name(x)}`); continue }
        rs.forEach((r, k) => {
          let cur = a.id, sum = 0;
          if (!r.ex || !r.ex.has(x)) P(`route ${k + 1} doesn't record ${name(x)} as left out`);
          r.legs.forEach((l, j) => {
            if (l.a !== cur) P(`route ${k + 1} legs don't chain`); cur = l.b; sum += l.t;
            if (l.kind === "fly") {
              if (l.a === x || l.b === x || (l.via || []).includes(x)) P(`route ${k + 1} still flies to or through ${name(x)}`);
              const dir = EDGE.has(edgeKey(l.a, l.b)), game = gameChain(l.a, l.b, r.ex);
              if (!game) P(`route ${k + 1} flies ${name(l.a)} -> ${name(l.b)}, which the game can't book`);
              else if (JSON.stringify(dir ? [] : game) !== JSON.stringify(l.via || [])) P(`route ${k + 1} flight ${name(l.a)} -> ${name(l.b)} stops don't match the game`);
            }
          });
          if (cur !== b.id) P(`route ${k + 1} doesn't end at the destination`);
          if (Math.abs(sum - r.total) > 0.01) P(`route ${k + 1} total doesn't add up`);
          // (running across to somewhere the flights no longer reach can beat flying all the way round)
          const known = l => [...F.G.walks, ...F.G.towns].some(w => (w[0] === l.a && w[1] === l.b) || (w[1] === l.a && w[0] === l.b));
          const ranIn = r.legs.some(l => l.kind === "walk" && !known(l));
          if (!ranIn && r.total + 0.5 < r0.total) P(`route ${k + 1} is faster than the route with every flight point`);
        });
      }
    }
  }
  F.setAvoid([]);

  // ---------- D. spot checks against known in-game journeys ----------
  const byName = (n, fac) => nodes.find(o => o.name === n && o.f.has(fac) && (!o.druid || n === 'Nighthaven'));
  const spot = (fac, a, b, expect, o = {}) => {
    const A = byName(a, fac), B = byName(b, fac);
    if (!A || !B) { R.spot.push({ fac, route: `${a} -> ${b}`, ok: false, got: "node missing" }); return }
    const r = best(fac, A.id, B.id, o);
    const got = r.none ? "no route" : F.steps(r).map(s => (s.kind === "fly" ? "Fly" : s.kind === "ride" ? s.label : s.kind === "tele" ? s.label : "Ride") + " " + name(s.b)).join(" · ") + ` (${Math.round(r.total / 6) / 10} min)`;
    R.spot.push({ fac, route: `${a} -> ${b}${Object.keys(o).length ? " " + JSON.stringify(o) : ""}`, ok: expect(r, got), got });
  };
  const has = (lab) => (r, g) => g.includes(lab);
  spot("A", "Ironforge", "Stormwind", (r, g) => !g.includes("Tram"), {});
  spot("A", "Stormwind", "Ironforge", (r, g) => !g.includes("Tram"), {});
  spot("H", "Orgrimmar", "Undercity", has("Zeppelin"));
  spot("H", "Orgrimmar", "Grom'gol", has("Zeppelin Grom'gol"));
  spot("A", "Rut'theran Village", "Auberdine", (r, g) => !r.none);
  spot("A", "Menethil Harbor", "Theramore", has("Boat Theramore"));
  spot("A", "Theramore", "Menethil Harbor", has("Boat Menethil"));
  spot("A", "Menethil Harbor", "Southshore", (r, g) => !r.none);
  spot("A", "Southshore", "Menethil Harbor", (r, g) => !g.includes("Boat Menethil Harbor") || g.includes("Auberdine"));
  spot("H", "Ratchet", "Booty Bay", (r, g) => !r.none);
  spot("A", "Feathermoon", "Thalanaar", (r, g) => !r.none);
  spot("A", "Steamwheedle Port", "Powderfuse Port", has("Boat Powderfuse"));
  spot("A", "Darnassus", "Stormwind", (r, g) => !r.none);
  spot("H", "Thunder Bluff", "Undercity", (r, g) => !r.none);
  spot("A", "Stormwind", "Scholomance", (r, g) => g.endsWith(")") && g.includes("Scholomance"));
  spot("H", "Orgrimmar", "Gnomeregan", has("Gnomeregan Teleporter"), { gnome: true });
  spot("A", "Auberdine", "Nighthaven", has("Ride Nighthaven"));
  spot("A", "Auberdine", "Nighthaven", has("Teleport: Moonglade"), { druid: true });
  spot("A", "Theramore", "Southshore", has("Teleport: Dalaran"), { mage: 50 });
  spot("H", "Thunder Bluff", "Orgrimmar", (r, g) => !r.none);
  spot("A", "Ironforge", "Ratchet", (r, g) => !r.none);
  spot("A", "Stormwind", "Valanaar", has("Skyship Valanaar"));
  spot("H", "Orgrimmar", "Shen'dar Village", has("Skyship Valanaar"));
  spot("H", "Valanaar", "Thunder Bluff", (r, g) => !r.none);
  spot("H", "Thendal Village", "Undercity", (r, g) => !r.none);
  return R;
})()
