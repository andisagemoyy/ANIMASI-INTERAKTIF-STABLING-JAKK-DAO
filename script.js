// Denah, animasi, penugasan PLR, dan jadwal JAKK–DAO.
const diagram = (() => {
  const width = 1800, height = 900;
  const point = (x, y) => ({x, y});
  // Jalur JAKK berjarak 110 dan jalur DAO 52 supaya rangkaian dan tulisannya tidak bertumpuk.
  const level = {6:200, 7:310, 8:420, 9:530};
  const CAR = 11, MAXLEN = 132;
  const trainLen = cars => Math.min(CAR * cars, MAXLEN);
  const trainPark = track => point(270, level[track]);
  const LADDER_X = 1130, DAO_END = 1640;
  const depotY = track => 150 + 56 * (track - 1);
  const depotTrack = (track, slot = 0) => point(track === 1 ? 1310 + slot * 190 : 1390, depotY(track));
  const ladder = y => point(LADDER_X, y);
  const gate = point(990, 530), neck = point(1060, 514), entry = point(1100, 514), ladderJoin = point(LADDER_X, 514);
  const bandan = point(1640, 70), upperBend = point(900, 70), bandJoin = point(700, 200);
  const signal = point(880, 310), signalJoin = point(650, 310);
  const upperSwitch = point(620, 200), signalLead = point(730, 310);
  const j8Fork = point(600, 420), track9West = point(550, 530), track8East = point(760, 420);
  const daoRamp = [point(810, 420), point(890, 530)];
  const eastBend = point(740, 530), eastJoin = point(880, 804), eastFork = point(1130, 804);
  const jayIn = point(1660, 804), jayOutBend = point(1200, 856), jayOut = point(1660, 856), jayWait = point(1540, 804);
  const lmPark = point(590, 310);
  const bay = (track, slot = 0) => point([430, 530, 330][slot] ?? 430, level[track]);
  const eastEnd = (track, cars) => point(trainPark(track).x + trainLen(cars) / 2 + 12, level[track]);
  const westEnd = (spot, cars) => point(spot.x - trainLen(cars) / 2 - 12, spot.y);
  const lmSpot = spot => point(spot.x - MAXLEN / 2 - 22, spot.y);
  const daoApproach = track => [ladderJoin, ladder(depotY(track))];
  const nearJunction = track => track === 8 ? [j8Fork, eastBend] : [eastBend];
  const fromJay = track => [jayWait, eastFork, eastJoin, eastBend, ...(track === 8 ? [j8Fork] : []), trainPark(track)];
  const toJay = track => [trainPark(track), ...nearJunction(track), eastJoin, eastFork, jayOutBend, jayOut];
  const toDao = track => [trainPark(track), ...nearJunction(track), gate, neck, entry];
  const ldToDao = start => [start, signalJoin, track8East, ...daoRamp, gate, neck, entry];
  const fromDao = (from, track) => [from, ladder(from.y), ladderJoin, entry, neck, gate, ...[...nearJunction(track)].reverse(), trainPark(track)];
  const bandRoute = (track, end) => [bandan, upperBend, bandJoin, ...(track === 7 ? [signalJoin] : []), end];
  const signalRoute = start => [start, upperSwitch, signalLead, signal];
  const fromSignal = (track, cars) => [signal, signalJoin, j8Fork, ...(track === 8 ? [] : [track9West]), eastEnd(track, cars)];
  const lmRoute = from => [from, ladder(from.y), ladderJoin, entry, neck, gate, ...daoRamp.slice().reverse(), track8East, signalJoin, lmPark];
  const llPark = depotTrack(10);
  const llHome = (track, cars, direct) => [eastEnd(track, cars), ...nearJunction(track), gate, neck, entry, ladderJoin,
    ...(direct ? [] : [ladder(llPark.y), llPark])];
  const llPickup = (track, end, cars, direct) => [...(direct ? [ladderJoin] : [llPark, ladder(llPark.y)]),
    ladder(depotY(track)), westEnd(end, cars)];
  const comboSplit = end => [entry, ladderJoin, ladder(end.y), end];

  function asset(path) {
    let total = 0;
    const sections = path.slice(1).map((end, i) => {
      const begin = path[i], len = Math.hypot(end.x - begin.x, end.y - begin.y);
      const section = {begin, end, len, at: total};
      total += len;
      return section;
    }).filter(part => part.len > 0);
    return {path, sections, total};
  }

  function tracing(route, progress) {
    const delta = Math.max(0, Math.min(1, progress)) * route.total;
    const section = route.sections.find(p => delta <= p.at + p.len) ?? route.sections.at(-1);
    if (!section) return {...route.path[0], angle: 0};
    const fraction = (delta - section.at) / section.len;
    const {begin, end} = section;
    return {x: begin.x + (end.x - begin.x) * fraction, y: begin.y + (end.y - begin.y) * fraction, angle: Math.atan2(end.y - begin.y, end.x - begin.x)};
  }

  const colors = {in:"#1f6f93", out:"#1d7a52", ld:"#b4502a", ll:"#7a4a94", lm:"#6b6470", press:"#b4502a"};
  const modeText = item => [item.displayMode, item.press ? "press rem" : ""].filter(Boolean).join(" · ");
  const stockLabel = item => [item.name, modeText(item)].filter(Boolean).join(" · ");
  const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  let cachedLayer, cachedScale = 0;
  function rectangle(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  function text(ctx, word, x, y, opts = {}) {
    ctx.font = (opts.bold ? "600 " : "") + (opts.size ?? 15) + "px " + FONT;
    ctx.textAlign = opts.align ?? "left";
    ctx.textBaseline = opts.base ?? "alphabetic";
    ctx.fillStyle = opts.color ?? "#2b2536";
    ctx.fillText(word, x, y);
    return ctx.measureText(word).width;
  }
  function rail(ctx, path, ink = "#9d97a3", size = 3) {
    ctx.beginPath();
    path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = size; ctx.strokeStyle = ink; ctx.stroke();
  }
  function zone(ctx, x, y, w, h, title, sub, fill, line) {
    rectangle(ctx, x, y, w, h, 16, fill, line);
    const tw = text(ctx, title, x + 20, y + 32, {size: 20, bold: true});
    text(ctx, sub, x + 30 + tw, y + 32, {size: 14, color: "#6f6577"});
  }
  function ground(ctx) {
    ctx.fillStyle = "#fbf8f2"; ctx.fillRect(0, 0, width, height);
    zone(ctx, 24, 140, 520, 450, "JAKARTA KOTA", "peron jalur 6–9", "#fdf6e9", "#e6d6bf");
    zone(ctx, 1076, 96, 712, 660, "DAO", "depo · jalur 1–11", "#f5f0f7", "#ddd0e2");
    // Jalur JAKK
    const ends = {6: bandJoin.x, 7: signal.x, 8: daoRamp[0].x, 9: gate.x};
    for (const track of [6, 7, 8, 9]) {
      const y = level[track];
      rail(ctx, [point(100, y + 20), point(400, y + 20)], "#ead8c6", 9);
      rail(ctx, [point(92, y), point(ends[track], y)]);
      rectangle(ctx, 40, y - 17, 40, 34, 8, "#2b2536");
      text(ctx, String(track), 60, y + 1, {bold: true, align: "center", size: 19, color: "#fff", base: "middle"});
    }
    text(ctx, "Peron", 250, level[6] + 40, {size: 12, color: "#a08a72", align: "center"});
    // Sambungan
    rail(ctx, [bandan, upperBend, bandJoin], "#b88a74", 3.2);
    rail(ctx, [j8Fork, eastBend]);
    rail(ctx, daoRamp);
    rail(ctx, [bandJoin, signalJoin, j8Fork, track9West], "#9d97a3");
    rail(ctx, [signalJoin, track8East]);
    rail(ctx, [eastBend, eastJoin, eastFork, jayIn], "#7d949a", 3.2);
    rail(ctx, [eastFork, jayOutBend, jayOut], "#7d949a", 3.2);
    rail(ctx, [gate, neck, entry, ladderJoin]);
    rail(ctx, [signalJoin, signal]);
    rail(ctx, [upperSwitch, signalLead]);
    rectangle(ctx, signal.x - 5, signal.y - 10, 10, 20, 3, "#7a4a94");
    text(ctx, "Sinyal L104", signal.x, signal.y - 22, {bold: true, align: "center", size: 15, color: "#5e3a74"});
    rectangle(ctx, 1004, 462, 104, 26, 7, "#efe5f5", "#d3c1dd");
    text(ctx, "P4 · Wesel", 1056, 475, {size: 14, bold: true, align: "center", color: "#5e3a74", base: "middle"});
    // DAO
    rail(ctx, [ladder(depotY(1)), ladder(depotY(11))]);
    for (let track = 1; track <= 11; track++) {
      const y = depotY(track);
      rail(ctx, [ladder(y), point(DAO_END, y)], track === 11 ? "#c9c2cd" : "#a99caf");
      rectangle(ctx, DAO_END + 4, y - 4, 4, 8, 1, "#8d8094");
      rectangle(ctx, DAO_END + 16, y - 13, 30, 26, 7, track === 11 ? "#e7e1ea" : "#3e2f4b");
      text(ctx, String(track), DAO_END + 31, y + 1, {align: "center", bold: true, size: 15, color: track === 11 ? "#7a6f80" : "#fff", base: "middle"});
    }
    text(ctx, "cadangan", DAO_END + 56, depotY(11) + 1, {size: 13, color: "#9a93a3", base: "middle"});
    text(ctx, "KAMPUNG BANDAN", bandan.x + 4, bandan.y - 8, {size: 16, bold: true, align: "right"});
    text(ctx, "lok dinas datang dari sini", bandan.x + 4, bandan.y + 22, {size: 13, color: "#8c624f", align: "right"});
    text(ctx, "JAYAKARTA", jayIn.x + 14, 836, {size: 16, bold: true});
    text(ctx, "← datang", jayIn.x + 14, jayIn.y - 10, {size: 13, color: "#53696f"});
    text(ctx, "berangkat →", jayOut.x + 14, jayOut.y + 4, {size: 13, color: "#53696f"});
    for (const p of [bandJoin, upperSwitch, signalLead, signalJoin, track9West, eastBend, gate, j8Fork, neck, entry, eastFork, eastJoin, track8East]) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fillStyle = "#8a7f90"; ctx.fill();
    }
  }

  function body(ctx, item) {
    const {x, y, angle} = item.pos;
    const color = colors[item.kind];
    const length = item.cars ? trainLen(item.cars) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (item.cars) {
      const step = length / item.cars;
      for (let car = 0; car < item.cars; car++) rectangle(ctx, -length / 2 + step * car, -6, step - 2, 12, 2, color);
      if (item.loco) rectangle(ctx, item.locoFront ? length / 2 + 3 : -length / 2 - 21, -7.5, 18, 15, 3, colors[item.loco]);
    } else {
      rectangle(ctx, item.double ? -24 : -12, -8, 24, 16, 3, color);
      if (item.double) rectangle(ctx, 2, -8, 24, 16, 3, color);
    }
    ctx.restore();
  }
  function tag(ctx, item) {
    const {x, y} = item.pos;
    const color = colors[item.kind];
    ctx.font = "600 15px " + FONT;
    const label = stockLabel(item);
    const w = ctx.measureText(label).width + 18;
    rectangle(ctx, x - w / 2, y - 40, w, 24, 7, item.active ? color : "#ffffff", item.active ? null : color);
    text(ctx, label, x, y - 28, {align: "center", size: 15, bold: true, color: item.active ? "#fff" : color, base: "middle"});
  }
  function staffTags(ctx, item) {
    if (!item.staff?.length) return;
    const {x, y, angle} = item.pos;
    const length = item.cars ? trainLen(item.cars) : 0;
    item.staff.forEach((person, k) => {
      const at = item.cars ? (k === 0 ? -(length / 2 + 12) : length / 2 - 8) : (item.staff.length === 1 ? 0 : k === 0 ? -14 : 14);
      const px = x + at * Math.cos(angle), py = y + at * Math.sin(angle);
      rectangle(ctx, px - 14, py + 12, 28, 19, 5, "#5e3a74");
      text(ctx, "P" + person, px, py + 22, {align: "center", size: 13, bold: true, color: "white", base: "middle"});
    });
  }
  // Rangkaian yang diam di DAO tidak diberi label di atasnya (jalurnya rapat); namanya
  // ditulis di kolom kanan sesuai nomor jalur.
  function dockLabels(ctx, items) {
    const rows = new Map();
    for (const item of items) if (item.dock && item.label !== false) {
      if (!rows.has(item.dock)) rows.set(item.dock, []);
      rows.get(item.dock).push(item);
    }
    for (const [track, list] of rows) {
      const y = depotY(track);
      let x = DAO_END + 56;
      for (const item of list.sort((a, b) => a.pos.x - b.pos.x)) {
        const color = colors[item.kind];
        const w1 = text(ctx, item.name, x, y - 2, {size: 15, bold: true, color, base: "middle"});
        const mode = modeText(item);
        if (mode) text(ctx, mode, x, y + 14, {size: 12, color: item.press ? "#b4502a" : "#6f6577", base: "middle"});
        x += Math.max(w1, mode ? ctx.measureText(mode).width : 0) + 12;
      }
    }
  }

  function paint(canvas, items) {
    const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    if (canvas.width !== width * scale) { canvas.width = width * scale; canvas.height = height * scale; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!cachedLayer || cachedScale !== scale) {
      cachedLayer = document.createElement("canvas");
      cachedLayer.width = width * scale; cachedLayer.height = height * scale;
      const g = cachedLayer.getContext("2d");
      g.setTransform(scale, 0, 0, scale, 0, 0);
      ground(g);
      cachedScale = scale;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cachedLayer, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const item of items) if (item.route && item.active) rail(ctx, item.route.path, "#a98bbd", 6);
    const order = [...items].sort((a, b) => Number(a.active) - Number(b.active));
    order.forEach(item => body(ctx, item));
    order.forEach(item => staffTags(ctx, item));
    dockLabels(ctx, items);
    order.filter(item => !item.dock && item.label !== false).forEach(item => tag(ctx, item));
  }

  function pickTrain(canvas, items, clientX, clientY) {
    const box = canvas.getBoundingClientRect();
    const scale = Math.min(box.width / width, box.height / height);
    if (scale <= 0) return null;
    const x = (clientX - box.left - (box.width - width * scale) / 2) / scale;
    const y = (clientY - box.top - (box.height - height * scale) / 2) / scale;
    const context = canvas.getContext("2d");
    context.font = "600 15px " + FONT;
    const padding = scale < .9 ? 12 : 6;
    const trains = [...items].sort((a, b) => Number(b.active) - Number(a.active)).filter(r => r.trainId && r.cars);
    const bodyHit = (item, extra) => {
      const half = trainLen(item.cars) / 2 + 22;
      const px = x - item.pos.x, py = y - item.pos.y;
      const along = px * Math.cos(item.pos.angle) + py * Math.sin(item.pos.angle);
      const across = -px * Math.sin(item.pos.angle) + py * Math.cos(item.pos.angle);
      return Math.abs(across) <= 9 + extra && Math.abs(along) <= half + extra;
    };
    const onBody = trains.find(item => bodyHit(item, 0));
    if (onBody) return onBody;
    const label = trains.find(item => item.dock
      ? x >= DAO_END + 50 && Math.abs(y - depotY(item.dock)) <= 22
      : Math.abs(x - item.pos.x) <= (context.measureText(stockLabel(item)).width + 18) / 2 + padding && y >= item.pos.y - 40 - padding && y <= item.pos.y - 16 + padding);
    if (label) return label;
    return trains.find(item => bodyHit(item, padding)) ?? null;
  }

  return {paint, pickTrain, asset, tracing, point, bay, trainPark, depotTrack, entry, jayIn, jayWait, signal, daoApproach, fromJay, toJay, toDao, ldToDao,
    fromDao, bandRoute, signalRoute, fromSignal, lmRoute, llHome, llPark, llPickup, lmSpot, comboSplit, width, height};
})();

// ===== Penjadwal langsir JAKK–DAO =====
// Menyusun semua jam langsir dari jam datang, jam lok dinas tiba, dan jam berangkat
// Gapeka. Aturan:
//  1. Rangkaian masuk DAO 3–5 menit setelah tiba di JAKK (lebih lama bila akses dipakai).
//  2. LD masuk DAO lalu rangkaian keluar DAO 20–30 menit sebelum KA berangkat.
//  3. LL selesai menggandeng rangkaian di DAO 20–30 menit sebelum lok dinas tiba di JAKK,
//     press rem di DAO, lalu didorong ke peron 5–15 menit sebelum lok dinas tiba.
//  4. V2: KA berangkat tepat waktu; bila jalurnya berbenturan boleh berangkat awal paling banyak 5 menit.
//  5. Satu wesel/jalur hanya untuk satu pergerakan dalam satu waktu. LD jalur 7 → DAO
//     dan LM DAO → jalur 7 tidak memakai wesel keberangkatan, jadi boleh bersamaan
//     dengan KA yang berangkat dari jalur 8/9.
//  6. Rangkaian 12 kereta hanya memakai jalur 9.
function susunJadwal(data, options = {}) {
  const DAY = 1440;
  // ldOut : menit antara rangkaian LD keluar DAO (press rem selesai) dan KA berangkat.
  // llHitch: menit antara LL selesai gandeng di DAO dan lok dinas tiba di JAKK.
  // llOut  : menit antara rangkaian LL didorong keluar DAO dan lok dinas tiba di JAKK.
  const RULES = {dwell: [3, 5], ldOut: [20, 30], llHitch: [20, 30], llOut: [5, 15], early: [1, 5], pressMin: 10, pressMax: 20, llBrakes: 5, arrivalWait: 5};
  // Aturan khusus per KA (keputusan pengatur V2).
  //  R54 : KA pertama, didorong LL 2 menit sebelum lok dinasnya datang, di jalur 8.
  //  R26 : LL langsung menggandeng R26 sepulang mendorong R54; R26 ke jalur 8 setelah R54 berangkat.
  //  R130: ke jalur 9 supaya keluar DAO 20 menit sebelum berangkat tanpa berangkat awal.
  //  R18 jalur 9, R52 jalur 8: jalur 9 kosong 16:08 untuk R55 (12 kereta, wajib jalur 9).
  //  R76F: keluar DAO setelah R55 masuk DAO, supaya R58 sempat digandeng LL dan press rem.
  const KHUSUS = options.khusus ?? {R54: {llOut: [2, 2], fixedOut: 8}, R26: {hitchAfter: "R54"}, R130: {fixedOut: 9},
    R18: {fixedOut: 9}, R52: {fixedOut: 8}, R76F: {tungguMasuk: "R58"}};
  const llOutOf = t => KHUSUS[t.id]?.llOut ?? RULES.llOut;
  const fixedOut = t => KHUSUS[t.id]?.fixedOut;
  const outWindow = (t, dact) => t.mode === "LD" ? [dact - RULES.ldOut[1], dact - RULES.ldOut[0]] : [t.loco - llOutOf(t)[1], t.loco - llOutOf(t)[0]];
  const DUR = {jay: 3, in: 4, lm: 3, ld: 4, out: 5, pickup: 3, ll: 3, l104: 3, gandeng: 4, dep: 3, band: 3};
  const combo = ["R2", "R16"];
  const comboSlot = data.plan.PAGI.combiner;
  const trains = data.trains;
  const byId = new Map(trains.map(t => [t.id, t]));
  for (const t of trains) {
    t.scheduled ??= t.departure;
    t.prefIn ??= t.inTrack;
    t.prefOut ??= t.outTrack;
  }
  const overlap = (a1, a2, b1, b2) => [-DAY, 0, DAY].some(k => a1 < b2 + k && b1 + k < a2);
  // Titik wesel/simpang yang dilewati tiap jenis pergerakan, dengan posisi (0–1) di sepanjang
  // rutenya. Rute dikunci sejak pergerakan mulai dan tiap titik dilepas setelah rangkaian
  // melewatinya (CLEAR menit), seperti penguncian rute bertahap.
  const CLEAR = 1;
  const j8 = (track, f) => track === 8 ? [["J8", f]] : [];
  const NODES = {
    jay: k => [["JAYIN", 0.4], ["EF", 0.5], ["EB", 0.72], ...j8(k, 0.85)],
    in: k => [...j8(k, 0.12), ["EB", 0.3], ["GATE", 0.55], ["LADDER", 0.85]],
    lm: () => [["LADDER", 0.1], ["GATE", 0.3], ["RAMP", 0.5], ["SJ", 0.75]],
    ld: () => [["SJ", 0.25], ["RAMP", 0.5], ["GATE", 0.7], ["LADDER", 0.9]],
    out: k => [["LADDER", 0.15], ["GATE", 0.45], ["EB", 0.7], ...j8(k, 0.85)],
    pickup: () => [["DAO10", 0.2], ["LADDER", 0.6]],
    ll: k => [...j8(k, 0.12), ["EB", 0.3], ["GATE", 0.55], ["LADDER", 0.85], ["DAO10", 1]],
    l104: () => [["W6", 0.35], ["X", 0.6], ["SIG", 1]],
    gandeng: () => [["SIG", 0.1], ["SJ", 0.3], ["J8", 0.55]],
    dep: k => [...j8(k, 0.12), ["EB", 0.3], ["EF", 0.5], ["JAYOUT", 1]],
    bandLD: () => [["BJ", 0.6], ["X", 0.75], ["SJ", 0.85]],
    bandLL: () => [["BJ", 0.6], ["W6", 0.9]],
    combo: () => [["SJ", 0.25], ["RAMP", 0.5], ["GATE", 0.7], ["LADDER", 1]],
  };
  const lockOf = (spec, start, end) => spec.map(([n, f]) => ({n, a: start, b: Math.min(end, start + f * (end - start) + CLEAR)}));
  const fullLock = (nodes, start, end) => nodes.map(n => ({n, a: start, b: end}));
  const LABEL = {
    jay: t => t.inbound + " datang", in: t => t.inbound + " masuk DAO", lm: t => "LM " + t.formerCode + " keluar DAO",
    ld: t => "LD " + t.id + " masuk DAO", out: t => t.id + " keluar DAO", pickup: t => "LL menuju " + t.id, ll: () => "LL kembali ke DAO",
    l104: t => "LD " + t.id + " ke L104", gandeng: t => "LD gandeng " + t.id, dep: t => t.id + " berangkat",
  };
  const DEPARTURE_KINDS = new Set(["dep", "out", "peronOut", "pickup", "ll", "llbusy", "ld", "l104", "gandeng", "sig"]);
  const ARRIVAL_KINDS = new Set(["jay", "in", "peronIn", "dao"]);
  const isCombo = t => combo.includes(t.id);
  const daoTrack = t => "D" + t.dao + (t.id === "R16" ? "b" : "");
  const sameDay = t => t.scheduled > t.arrival;
  const unique = list => [...new Set(list.filter(Boolean).map(r => r.label))];

  function attempt(choice) {
    const res = [];
    const mk = (t, kind, start, track) => ({train: t.id, kind, start, end: start + DUR[kind], locks: lockOf(NODES[kind](track), start, start + DUR[kind]), label: LABEL[kind](t)});
    const clash = (x, y) => x.locks.some(l => y.locks.some(m => l.n === m.n && overlap(l.a, l.b, m.a, m.b)));
    const byNode = new Map();
    res.push = (...items) => {
      for (const item of items) {
        Array.prototype.push.call(res, item);
        for (const l of item.locks) {
          if (!byNode.has(l.n)) byNode.set(l.n, []);
          byNode.get(l.n).push({l, item});
        }
      }
      return res.length;
    };
    const hitOf = items => {
      for (const item of items) {
        for (const l of item.locks) {
          const found = byNode.get(l.n)?.find(e => overlap(l.a, l.b, e.l.a, e.l.b));
          if (found) return found.item;
        }
        const self = items.find(o => o !== item && clash(item, o));
        if (self) return self;
      }
      return null;
    };
    const peron = (t, track, start, end, who, kind) => ({train: t.id, kind, start, end, locks: fullLock(["P" + track], start, end), track, label: "Jalur " + track + " dipakai " + who});
    const plan = {}, problems = [], waits = [], notes = {}, violations = [];
    for (const t of trains) plan[t.id] = {};

    for (const t of trains) {
      if (isCombo(t)) continue;
      res.push({train: t.id, kind: "band", start: t.loco - DUR.band, end: t.loco, locks: lockOf(NODES[t.mode === "LD" ? "bandLD" : "bandLL"](), t.loco - DUR.band, t.loco), label: "Lok dinas " + t.id + " datang"});
    }
    const r2 = byId.get("R2");
    if (r2) {
      res.push({train: "R2", kind: "band", start: r2.loco - DUR.band, end: r2.loco, locks: lockOf(NODES.bandLD(), r2.loco - DUR.band, r2.loco), label: "L2 + L16 datang"});
      res.push({train: "R2", kind: "combo", start: comboSlot.start, end: comboSlot.end, locks: lockOf(NODES.combo(), comboSlot.start, comboSlot.end), label: "L2 + L16 masuk DAO"});
    }

    // Jam keluar DAO yang dicoba: di dalam batas aturan dulu, lalu (bila terpaksa) di luar batas,
    // makin jauh makin buruk.
    function outTimes(t, dact, relaxed) {
      const [a, b] = outWindow(t, dact);
      const list = [];
      if (!relaxed) { for (let o = b; o >= a; o--) list.push({o, off: 0}); return list; }
      for (let d = 1; d <= 60; d++) list.push({o: a - d, off: d}, {o: b + d, off: d});
      return list;
    }
    function tryDeparture(t, dact, track, notBefore, relaxed, outNotBefore = -Infinity) {
      const blockers = [];
      const dep = mk(t, "dep", dact, track);
      const stay = o => peron(t, track, o, dep.end, t.id, "peronOut");
      if (t.mode === "LD") {
        for (const {o, off} of outTimes(t, dact, relaxed)) {
          if (o < outNotBefore) continue;
          const out = mk(t, "out", o, track);
          const base = [dep, out, stay(o)];
          const hit = hitOf(base);
          if (hit) { blockers.push(hit); continue; }
          if (isCombo(t)) {
            if (comboSlot.end + 1 + RULES.pressMin > o) continue;
            return {items: base, dep, out, track, blockers, off};
          }
          // LD masuk DAO sedekat mungkin dengan press rem supaya PLR tidak lama menunggu di DAO.
          const first = Math.max(t.loco + 1, notBefore), last = o - DUR.ld - 1 - RULES.pressMin, ideal = o - DUR.ld - 1 - RULES.pressMax;
          const xs = [];
          for (let x = Math.min(ideal, last); x >= first; x--) xs.push(x);
          for (let x = Math.max(ideal + 1, first); x <= last; x++) xs.push(x);
          for (const x of xs) {
            const ld = mk(t, "ld", x, 7);
            const hit2 = hitOf([...base, ld]);
            if (hit2) { blockers.push(hit2); continue; }
            return {items: [...base, ld], dep, out, ld, track, blockers, off};
          }
        }
        return {blockers};
      }
      for (const {o, off} of outTimes(t, dact, relaxed)) {
        if (o + DUR.out + DUR.ll > dact - DUR.gandeng - 2) continue;
        const out = mk(t, "out", o, track);
        const ll = mk(t, "ll", out.end, track);
        const moving = [dep, out, ll, stay(o)];
        const hit = hitOf(moving);
        if (hit) { blockers.push(hit); continue; }
        // LL selesai gandeng 20–30 menit sebelum lok dinas tiba, press rem di DAO, lalu didorong keluar.
        let pickup = null, busy = null;
        const hitchTimes = [];
        const after = plan[KHUSUS[t.id]?.hitchAfter];
        if (after?.ll) for (let d = 0; d <= 10; d++) hitchTimes.push({pe: after.ll.end + DUR.pickup + d, hOff: 0});
        else for (let pe = t.loco - RULES.llHitch[0]; pe >= t.loco - RULES.llHitch[1]; pe--) hitchTimes.push({pe, hOff: 0});
        if (relaxed) for (let d = 1; d <= 25; d++) hitchTimes.push({pe: t.loco - RULES.llHitch[0] + d, hOff: d}, {pe: t.loco - RULES.llHitch[1] - d, hOff: d});
        let hitchOff = 0;
        for (const {pe, hOff} of hitchTimes) {
          if (pe > o) continue;
          const pk = mk(t, "pickup", pe - DUR.pickup, track);
          if (pk.start < notBefore) continue;
          hitchOff = hOff;
          const bz = {train: t.id, kind: "llbusy", start: pk.start, end: ll.end, locks: fullLock(["LL"], pk.start, ll.end), label: "LL melayani " + t.id};
          const h = hitOf([...moving, pk, bz]);
          if (h) { blockers.push(h); continue; }
          pickup = pk; busy = bz; break;
        }
        if (!pickup) continue;
        const base = [...moving, pickup, busy];
        for (let g = Math.max(ll.end, t.loco + DUR.l104); g + DUR.gandeng <= dact - 2; g++) {
          const l104 = mk(t, "l104", g - DUR.l104, 6);
          const gandeng = mk(t, "gandeng", g, track);
          const wait = {train: t.id, kind: "sig", start: l104.start, end: gandeng.end, locks: fullLock(["SIGWAIT"], l104.start, gandeng.end), label: "LD " + t.id + " di L104"};
          const hit2 = hitOf([...base, l104, gandeng, wait]);
          if (hit2) { blockers.push(hit2); continue; }
          return {items: [...base, l104, gandeng, wait], dep, out, pickup, ll, l104, gandeng, track, blockers, off: off * 3 + hitchOff * 3};
        }
      }
      return {blockers};
    }

    // Perkiraan gangguan ke kedatangan/keberangkatan yang belum dijadwalkan bila jalur ini dipakai.
    const placed = new Set();
    const span = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
    function lookahead(t, track, from, to) {
      let cost = 0;
      for (const y of trains) {
        if (y === t) continue;
        if (!placed.has("arr" + y.id)) {
          const a = y.arrival - DUR.jay, b = y.arrival + 12;
          const only = y.requiredIn9 ? 9 : null;
          if (only === track) cost += span(from, to, a, b) * 10;
          else if (!only && (choice.inTrack[y.id] ?? y.prefIn) === track) cost += span(from, to, a, b);
        }
        if (!placed.has("dep" + y.id) && y.requiredOut9 && track === 9) {
          const a = outWindow(y, y.scheduled)[1];
          cost += span(from, to, a, y.scheduled + DUR.dep) * 10;
        }
      }
      return cost;
    }
    function placeDeparture(t) {
      // Rangkaian yang datang dan berangkat di hari yang sama harus sudah masuk DAO dulu.
      if (sameDay(t) && !placed.has("arr" + t.id)) placeArrival(t);
      // Aturan pengatur: KA ini baru keluar DAO setelah rangkaian KA lain masuk DAO.
      const wait = KHUSUS[t.id]?.tungguMasuk && byId.get(KHUSUS[t.id].tungguMasuk);
      if (wait && !placed.has("arr" + wait.id)) placeArrival(wait);
      const outNotBefore = wait && plan[wait.id].in ? plan[wait.id].in.end : -Infinity;
      placed.add("dep" + t.id);
      const p = plan[t.id];
      const pref = choice.outTrack[t.id] ?? t.prefOut;
      const tracks = t.requiredOut9 ? [9] : fixedOut(t) ? [fixedOut(t)] : [pref, 17 - pref];
      const minEarly = choice.early[t.id] ?? 0;
      const shifts = minEarly ? [] : [0];
      for (let k = Math.max(RULES.early[0], minEarly); k <= RULES.early[1]; k++) shifts.push(k);
      const notBefore = sameDay(t) && p.in ? p.in.end + 1 : -DAY;
      let chosen = null;
      const tried = [];
      for (const relaxed of [false, true]) {
        for (const k of shifts) {
          let pick = null;
          for (const track of tracks) {
            const a = tryDeparture(t, t.scheduled - k, track, notBefore, relaxed, outNotBefore);
            if (!relaxed) tried.push(...a.blockers);
            if (!a.dep) continue;
            a.k = k;
            a.cost = a.off * 1000 + lookahead(t, track, a.out.start, a.dep.end) + (track === pref ? 0 : 1);
            if (!pick || a.cost < pick.cost) pick = a;
          }
          if (pick) { chosen = pick; break; }
        }
        if (chosen) break;
      }
      if (chosen?.off) violations.push({train: t.id, kind: "dep", off: chosen.off, blockers: tried});
      if (!chosen) { problems.push({train: t.id, kind: "dep", text: t.id + " tidak dapat slot keluar DAO / berangkat", blockers: tried}); return; }
      res.push(...chosen.items);
      Object.assign(p, {dep: chosen.dep, out: chosen.out, outTrack: chosen.track, early: chosen.k, outBlockers: chosen.off ? tried : chosen.blockers, off: chosen.off});
      for (const key of ["ld", "pickup", "ll", "l104", "gandeng"]) if (chosen[key]) p[key] = chosen[key];
      if (p.daoItem) { p.daoItem.end = chosen.out.end + (sameDay(t) ? 0 : DAY); p.daoItem.locks[0].b = p.daoItem.end; }
    }

    function placeArrival(t) {
      if (placed.has("arr" + t.id)) return;
      placed.add("arr" + t.id);
      const p = plan[t.id];
      const pref = choice.inTrack[t.id] ?? t.prefIn;
      const tracks = t.requiredIn9 ? [9] : [pref, 17 - pref];
      const first = t.arrival - DUR.jay + (choice.hold[t.id] ?? 0);
      const daoEnd = p.out ? p.out.end + (sameDay(t) ? 0 : DAY) : t.scheduled + (sameDay(t) ? 0 : DAY);
      const latestIn = sameDay(t) && (p.ld || p.pickup || p.out) ? Math.min(...[p.ld, p.pickup, p.out].filter(Boolean).map(x => x.start)) - 1 : Infinity;
      let best = null;
      const onTime = [];
      for (const track of tracks) {
        for (let s = first; s < first + 240 && (!best || s < best.s); s++) {
          const jay = mk(t, "jay", s, track);
          const h1 = hitOf([jay, peron(t, track, s, jay.end + RULES.dwell[0] + DUR.in, t.inbound, "peronIn")]);
          if (h1) { if (s === first) onTime.push(h1); continue; }
          let found = null;
          for (let u = jay.end + RULES.dwell[0]; u <= jay.end + 90 && u + DUR.in <= latestIn; u++) {
            const into = mk(t, "in", u, track);
            const stay = peron(t, track, s, into.end, t.inbound, "peronIn");
            const dao = {train: t.id, kind: "dao", start: u, end: daoEnd, locks: fullLock([daoTrack(t)], u, daoEnd), label: "DAO " + t.dao + " dipakai"};
            const hit = hitOf([jay, into, stay, dao]);
            if (!hit) { found = {s, u, track, items: [jay, into, stay, dao], jay, into, dao}; break; }
            if (s === first) onTime.push(hit);
            if (hit.kind === "peronOut" || hit.kind === "peronIn") break;
          }
          if (found) { best = found; break; }
        }
      }
      if (!best) { problems.push({train: t.id, kind: "arr", text: t.inbound + " tidak mendapat jalur kedatangan", blockers: onTime}); return; }
      res.push(...best.items);
      Object.assign(p, {jay: best.jay, in: best.into, inTrack: best.track, daoItem: best.dao});
      const wait = best.s - (t.arrival - DUR.jay);
      if (wait > 0) waits.push({train: t.id, wait, blockers: onTime});
      const dwell = best.u - best.jay.end;
      const why = [];
      if (wait > 0) why.push(...unique(onTime));
      if (dwell > RULES.dwell[1]) {
        const into = mk(t, "in", best.jay.end + RULES.dwell[0], best.track);
        why.push(...unique(res.filter(r => r.train !== t.id && overlap(into.start, best.u, r.start, r.end) && clash(into, r))));
      }
      if (why.length) notes[t.id] = [...new Set(why)].slice(0, 2);
    }

    // Diproses berurutan menurut jam, kedatangan dan keberangkatan bercampur.
    const chains = [];
    for (const t of trains) {
      chains.push({type: "arr", t, key: t.arrival - DUR.jay + (choice.hold[t.id] ?? 0)});
      // V2: KA berangkat didahulukan (dijadwalkan lebih awal dari urutan jamnya) supaya tepat waktu.
      const key = (t.mode === "LL" ? t.loco - RULES.llHitch[1] - DUR.pickup : outWindow(t, t.scheduled)[0]) - (options.prioritas ?? 40);
      chains.push({type: "dep", t, key: sameDay(t) ? key : key});
    }
    // KA yang digandeng LL langsung sepulang dari KA lain dijadwalkan tepat setelahnya,
    // supaya LL tidak didahului rangkaian yang masuk DAO.
    for (const c of chains) {
      const after = c.type === "dep" && KHUSUS[c.t.id]?.hitchAfter;
      if (after) c.key = chains.find(x => x.type === "dep" && x.t.id === after).key + 0.5;
    }
    chains.sort((a, b) => a.key - b.key || (a.type === "arr" ? -1 : 1));
    for (const c of chains) (c.type === "arr" ? placeArrival : placeDeparture)(c.t);

    for (const t of [...trains].sort((a, b) => (plan[a.id].in?.end ?? 0) - (plan[b.id].in?.end ?? 0))) {
      const p = plan[t.id];
      if (!p.in) continue;
      for (let v = p.in.end + 1; v < p.in.end + 300 && !p.lm; v++) {
        const lm = mk(t, "lm", v, 7);
        if (!hitOf([lm])) { res.push(lm); p.lm = lm; }
      }
      if (!p.lm) problems.push({train: t.id, kind: "lm", text: "LM " + t.formerCode + " tidak bisa keluar DAO", blockers: []});
    }
    let score = problems.length * 100000 + violations.reduce((n, v) => n + 20000 + v.off * 1000, 0);
    for (const w of waits) score += w.wait * 4 + Math.max(0, w.wait - RULES.arrivalWait) * 40;
    for (const t of trains) {
      const p = plan[t.id];
      score += (p.early ?? 0) * 30;
      if (p.outTrack && p.outTrack !== t.prefOut) score += 3;
      if (p.inTrack && p.inTrack !== t.prefIn) score += 3;
      if (p.in && p.jay) score += Math.max(0, p.in.start - p.jay.end - RULES.dwell[1]) * 2;
    }
    return {plan, res, problems, waits, notes, violations, score};
  }

  // Pencarian: bila kedatangan tertahan atau keberangkatan tidak dapat slot, pindahkan
  // jalur, tahan kedatangan sebentar, atau berangkatkan KA lain lebih awal paling banyak 5 menit.
  const clone = c => ({early: {...c.early}, outTrack: {...c.outTrack}, inTrack: {...c.inTrack}, hold: {...c.hold}, why: {...c.why}});
  const keyOf = c => JSON.stringify([c.early, c.outTrack, c.inTrack, c.hold]);
  const empty = {early: {}, outTrack: {}, inTrack: {}, hold: {}, why: {}};
  const good = r => !r.problems.length && !r.violations.length && !r.waits.some(w => w.wait > RULES.arrivalWait);
  // Tahap kasar: bagi jalur 8/9 untuk semua kedatangan dan keberangkatan, sekaligus menentukan
  // KA mana yang perlu berangkat awal, dengan pencarian berkas (beam search).
  function rencanaJalur() {
    const items = [];
    for (const t of trains) {
      items.push({t, type: "arr", start: t.arrival - DUR.jay});
      const start = outWindow(t, t.scheduled)[1];
      items.push({t, type: "dep", start});
    }
    items.sort((a, b) => a.start - b.start);
    const gap = 2;
    let beam = [{free: {8: -DAY, 9: -DAY}, cost: 0, pick: {}}];
    for (const it of items) {
      const t = it.t, next = [];
      for (const st of beam) {
        if (it.type === "arr") {
          const tracks = t.requiredIn9 ? [9] : [8, 9];
          for (const track of tracks) {
            const s = Math.max(it.start, st.free[track] + gap);
            const wait = s - it.start;
            const end = s + DUR.jay + RULES.dwell[0] + DUR.in;
            const cost = st.cost + wait * 4 + Math.max(0, wait - RULES.arrivalWait) * 40 + (track === t.prefIn ? 0 : 3);
            next.push({free: {...st.free, [track]: end}, cost, pick: {...st.pick, ["in" + t.id]: track}});
          }
        } else {
          const tracks = t.requiredOut9 ? [9] : fixedOut(t) ? [fixedOut(t)] : [8, 9];
          for (const track of tracks) {
            const ks = [0];
            for (let k = RULES.early[0]; k <= RULES.early[1]; k++) ks.push(k);
            for (const k of ks) {
              const [earliestStart, latestStart] = outWindow(t, t.scheduled - k);
              const s = Math.max(earliestStart, st.free[track] + gap);
              const off = Math.max(0, s - latestStart);
              const end = t.scheduled - k + DUR.dep;
              if (t.mode === "LL" && s + DUR.out + DUR.ll + DUR.gandeng + 2 > t.scheduled - k) continue;
              const cost = st.cost + k * 6 + (track === t.prefOut ? 0 : 3) + (off ? 20000 + off * 1000 : 0);
              next.push({free: {...st.free, [track]: end}, cost, pick: {...st.pick, ["out" + t.id]: track, ["k" + t.id]: k}});
            }
          }
        }
      }
      next.sort((a, b) => a.cost - b.cost);
      const kept = [], seenFree = new Set();
      for (const st of next) {
        const key = Math.min(st.free[8], DAY * 2) + "|" + st.free[9];
        if (seenFree.has(key)) continue;
        seenFree.add(key); kept.push(st);
        if (kept.length >= 300) break;
      }
      beam = kept;
    }
    const pick = beam[0].pick;
    const c = {early: {}, outTrack: {}, inTrack: {}, hold: {}, why: {}};
    for (const t of trains) {
      if (pick["k" + t.id]) { c.early[t.id] = pick["k" + t.id]; c.why[t.id] = "Jalur dibutuhkan KA lain"; }
      if (pick["out" + t.id] && pick["out" + t.id] !== t.prefOut) c.outTrack[t.id] = pick["out" + t.id];
      if (pick["in" + t.id] && pick["in" + t.id] !== t.prefIn) c.inTrack[t.id] = pick["in" + t.id];
    }
    return c;
  }
  let best;
  const saved = options.pilihan ? clone({...empty, ...options.pilihan}) : null;
  if (saved) {
    best = {choice: saved, result: attempt(saved)};
  }
  // Pilihan tersimpan dipakai langsung; pencarian hanya jalan bila belum ada pilihan
  // atau pilihan lama tidak lagi cocok dengan data (mis. jadwal diubah).
  if (!best || (best.result.problems.length && options.cari !== false)) {
    const plan0 = rencanaJalur();
    best = {choice: empty, result: attempt(empty)};
    const r0 = attempt(plan0);
    if (r0.score < best.result.score) best = {choice: plan0, result: r0};
    let choice = best.choice;
    const seen = new Set([keyOf(choice)]);
    const moves = (from, current) => {
      const list = [];
      const addDeparture = (id, why) => {
        const t = byId.get(id);
        if (!t) return;
        if (!t.requiredOut9 && !fixedOut(t) && from.outTrack[id] === undefined) { const c = clone(from); c.outTrack[id] = 17 - t.prefOut; list.push(c); }
        const k = from.early[id] ?? 0;
        if (k < RULES.early[1]) { const c = clone(from); c.early[id] = k ? k + 1 : RULES.early[0]; c.why[id] ??= why; list.push(c); }
      };
      const addArrival = id => {
        const t = byId.get(id);
        if (!t) return;
        if (!t.requiredIn9 && from.inTrack[id] === undefined) { const c = clone(from); c.inTrack[id] = 17 - t.prefIn; list.push(c); }
        const h = from.hold[id] ?? 0;
        if (h < 60) { const c = clone(from); c.hold[id] = h + 3; list.push(c); }
      };
      for (const pr of [...current.problems, ...current.violations]) {
        const ts = byId.get(pr.train);
        for (const b of pr.blockers) {
          if (b.train === pr.train) continue;
          if (DEPARTURE_KINDS.has(b.kind)) addDeparture(b.train, "Jalur dibutuhkan " + (pr.kind === "dep" ? pr.train : ts.inbound));
          if (ARRIVAL_KINDS.has(b.kind)) addArrival(b.train);
        }
      }
      for (const w of [...current.waits].sort((a, b) => b.wait - a.wait)) {
        if (w.wait <= RULES.arrivalWait) continue;
        const t = byId.get(w.train);
        for (const b of w.blockers) if (b.train !== w.train && DEPARTURE_KINDS.has(b.kind))
          addDeparture(b.train, "Jalur " + (b.kind === "peronOut" ? b.track + " " : "") + "dibutuhkan " + t.inbound + " datang");
      }
      return list;
    };
    for (let round = 0; round < (options.putaran ?? 300) && !good(best.result); round++) {
      const current = attempt(choice);
      if (current.score < best.result.score) best = {choice, result: current};
      let next = moves(choice, current).find(c => !seen.has(keyOf(c)));
      if (!next) next = moves(best.choice, best.result).find(c => !seen.has(keyOf(c)));
      if (!next) {
        // acak di sekitar hasil terbaik
        const c = clone(best.choice);
        const t = trains[Math.floor(Math.random() * trains.length)];
        const r = Math.random();
        if (r < 0.45) { const k = Math.random() < 0.5 ? 0 : RULES.early[0] + Math.floor(Math.random() * (RULES.early[1] - RULES.early[0] + 1)); if (k) c.early[t.id] = k; else delete c.early[t.id]; c.why[t.id] ??= "Jalur dibutuhkan KA lain"; }
        else if (r < 0.7 && !t.requiredOut9 && !fixedOut(t)) { if (c.outTrack[t.id]) delete c.outTrack[t.id]; else c.outTrack[t.id] = 17 - t.prefOut; }
        else if (r < 0.9 && !t.requiredIn9) { if (c.inTrack[t.id]) delete c.inTrack[t.id]; else c.inTrack[t.id] = 17 - t.prefIn; }
        else c.hold[t.id] = Math.floor(Math.random() * 46);
        next = c;
      }
      seen.add(keyOf(next));
      choice = next;
    }
    // Pencarian lanjutan (simulated annealing), dipakai saat menyusun ulang jadwal di luar aplikasi.
    if (options.anneal) {
      let seed = 20261125;
      const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
      const pickOne = list => list[Math.floor(rnd() * list.length)];
      let cur = best, temp = options.suhu ?? 600;
      for (let i = 0; i < options.anneal; i++) {
        const r = cur.result;
        const hot = new Set([...r.violations.map(v => v.train), ...r.problems.map(v => v.train), ...r.waits.filter(w => w.wait > 2).map(w => w.train)]);
        const times = [...hot].map(id => byId.get(id)).flatMap(t => [t.arrival, t.scheduled]);
        const near = trains.filter(t => times.some(m => Math.abs(t.scheduled - m) < 70 || Math.abs(t.arrival - m) < 70 || Math.abs(t.loco - m) < 70));
        const t = rnd() < 0.85 && near.length ? pickOne(near) : pickOne(trains);
        const c = clone(cur.choice);
        const kind = rnd();
        if (kind < 0.4) { const k = rnd() < 0.5 ? 0 : RULES.early[0] + Math.floor(rnd() * (RULES.early[1] - RULES.early[0] + 1)); if (k) { c.early[t.id] = k; c.why[t.id] ??= ""; } else delete c.early[t.id]; }
        else if (kind < 0.6) { if (t.requiredOut9 || fixedOut(t)) continue; if (c.outTrack[t.id]) delete c.outTrack[t.id]; else c.outTrack[t.id] = 17 - t.prefOut; }
        else if (kind < 0.8) { if (t.requiredIn9) continue; if (c.inTrack[t.id]) delete c.inTrack[t.id]; else c.inTrack[t.id] = 17 - t.prefIn; }
        else { const h = Math.floor(rnd() * 61); if (h) c.hold[t.id] = h; else delete c.hold[t.id]; }
        const res2 = attempt(c);
        if (res2.score < cur.result.score || rnd() < Math.exp((cur.result.score - res2.score) / temp)) cur = {choice: c, result: res2};
        if (res2.score < best.result.score) best = {choice: c, result: res2};
        temp = Math.max(20, temp * 0.9993);
      }
    }
    // Buang berangkat awal / pindah jalur yang ternyata tidak perlu.
    for (let changed = true; changed;) {
      changed = false;
      for (const group of ["early", "outTrack", "inTrack", "hold"]) {
        for (const id of Object.keys(best.choice[group])) {
          const c = clone(best.choice);
          if (group === "early" && c.early[id] > RULES.early[0]) c.early[id]--;
          else if (group === "hold" && c.hold[id] > 1) c.hold[id]--;
          else delete c[group][id];
          const r = attempt(c);
          if (r.score <= best.result.score) { best = {choice: c, result: r}; changed = true; }
        }
      }
    }
  }
  const result = best.result;
  if (options.diag) data.diag = result.violations.map(v => ({train: v.train, off: v.off, blockers: [...new Set(v.blockers.map(b => b.kind + ":" + b.label + "@" + b.start))]}));

  // Simpan ke bentuk yang dipakai animasi.
  const norm = s => s && {start: ((s.start % DAY) + DAY) % DAY, end: ((s.start % DAY) + DAY) % DAY + (s.end - s.start)};
  const plan = {PAGI: data.plan.PAGI};
  const waitReasons = {}, llReleaseReasons = {}, ldReleaseReasons = {}, pelanggaran = [];
  const others = (list, t) => unique(list.filter(r => r.train !== t.id));
  const hhmm = m => { const v = ((Math.round(m) % DAY) + DAY) % DAY; return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0"); };
  // Alasan berangkat awal: siapa yang memakai jalur/wesel bila KA ini berangkat tepat waktu.
  function earlyWhy(t, p) {
    const a = t.scheduled, b = t.scheduled + DUR.dep;
    const onPeron = result.res.filter(r => r.train !== t.id && (r.kind === "peronIn" || r.kind === "peronOut") && r.track === p.outTrack && overlap(p.dep.start, b, r.start, r.end))
      .sort((x, y) => x.start - y.start)[0];
    if (onPeron) {
      const y = byId.get(onPeron.train);
      return onPeron.kind === "peronIn" ? "Jalur " + p.outTrack + " dibutuhkan " + y.inbound + " yang datang " + hhmm(y.arrival)
        : "Jalur " + p.outTrack + " dibutuhkan " + y.id + " (keluar DAO " + hhmm(onPeron.start) + ")";
    }
    const locks = lockOf(NODES.dep(p.outTrack), a, b);
    const route = result.res.find(r => r.train !== t.id && r.locks.some(l => locks.some(m => l.n === m.n && overlap(l.a, l.b, m.a, m.b))));
    if (route) return "Wesel keberangkatan dipakai " + route.label + " " + hhmm(route.start);
    return "Jalur dibutuhkan KA lain";
  }
  for (const t of trains) {
    const p = result.plan[t.id];
    if (!p.out || !p.in) continue;
    t.inTrack = p.inTrack;
    t.outTrack = p.outTrack;
    t.earlyBy = p.early || 0;
    t.departure = t.scheduled - t.earlyBy;
    if (t.earlyBy) t.earlyReason = earlyWhy(t, p);
    else delete t.earlyReason;
    const q = {jay: {...norm(p.jay), track: t.inTrack}, in: {...norm(p.in), track: t.inTrack}, lm: {...norm(p.lm), track: 7}, out: {...norm(p.out), track: t.outTrack}};
    if (p.ld) q.ld = {...norm(p.ld), track: 7};
    if (t.mode === "LL") {
      q.pressLL = {start: norm(p.pickup).end, end: norm(p.out).start};
      Object.assign(q, {pickup: {...norm(p.pickup), track: 0}, ll: {...norm(p.ll), track: 0}, l104: {...norm(p.l104), track: 6},
        gandeng: {...norm(p.gandeng), track: t.outTrack, waitReason: ""}});
      const ready = Math.max(p.ll.end, t.loco + DUR.l104);
      if (p.gandeng.start > ready) {
        const names = new Set([...p.gandeng.locks, ...p.l104.locks].map(l => l.n));
        const why = others(result.res.filter(r => overlap(ready - DUR.l104, p.gandeng.start, r.start, r.end) && r.locks.some(l => names.has(l.n))), t);
        q.gandeng.waitReason = why.length ? "Menunggu " + why[0] : "";
      }
      q.brake = {start: q.gandeng.end, end: Math.min(q.gandeng.end + RULES.llBrakes, t.departure)};
    } else {
      const ready = isCombo(t) ? comboSlot.end : q.ld.end;
      q.brake = {start: Math.max(ready + 1, q.out.start - RULES.pressMax), end: q.out.start};
    }
    const later = others(p.outBlockers, t).slice(0, 2);
    if (t.mode === "LL" && q.out.start < t.loco - llOutOf(t)[0] && later.length) llReleaseReasons[t.id] = later;
    if (t.mode === "LD" && q.out.start < t.departure - RULES.ldOut[0] && later.length) ldReleaseReasons[t.id] = later;
    if (result.notes[t.id]?.length) waitReasons[t.id] = result.notes[t.id];
    const lead = t.mode === "LD" ? t.departure - q.out.start : t.loco - q.out.start;
    const [lo, hi] = t.mode === "LD" ? RULES.ldOut : llOutOf(t);
    if (t.mode === "LL" && !KHUSUS[t.id]?.hitchAfter) {
      const hitch = t.loco - q.pickup.end;
      if (hitch < RULES.llHitch[0] || hitch > RULES.llHitch[1]) pelanggaran.push(t.id + " LL gandeng " + hitch + " mnt sebelum lok dinas tiba (aturan 20–30)");
    }
    if (lead < lo || lead > hi) pelanggaran.push(t.id + " keluar DAO " + lead + " mnt sebelum " + (t.mode === "LD" ? "berangkat" : "lok dinas tiba") +
      " (aturan " + lo + "–" + hi + ")" + (later.length ? " karena " + later.join(", ") : ""));
    plan[t.id] = q;
  }
  // Posisi LD menunggu: jalur 7 untuk pola LD, jalur 6 untuk pola LL (masing-masing dua tempat).
  const berths = {}, waiting = [];
  for (const t of trains.filter(t => plan[t.id]).sort((a, b) => a.loco - b.loco)) {
    if (t.id === "R16") { berths[t.id] = berths.R2 ?? 0; continue; }
    const leave = isCombo(t) ? comboSlot.start : t.mode === "LD" ? plan[t.id].ld.start : plan[t.id].l104.start;
    const taken = waiting.filter(w => w.mode === t.mode && w.end > t.loco && w.start < leave).map(w => w.slot);
    berths[t.id] = [0, 1, 2].find(n => !taken.includes(n)) ?? 0;
    waiting.push({mode: t.mode, start: t.loco, end: leave, slot: berths[t.id]});
  }
  Object.assign(data, {plan, berths, waitReasons, llReleaseReasons, ldReleaseReasons,
    targets: {dwell: RULES.dwell, ldOut: RULES.ldOut, llHitch: RULES.llHitch, llOut: RULES.llOut, khusus: KHUSUS, early: RULES.early, llBrakes: RULES.llBrakes},
    pilihan: best.choice, pelanggaran,
    problems: result.problems.map(p => p.text + (p.blockers.length ? " (" + unique(p.blockers).slice(0, 3).join(", ") + ")" : "")),
    reservations: result.res});
  return data;
}

// ===== Rencana hasil optimasi (V2.1) =====
// Jadwal langsir disusun di luar aplikasi dengan solver optimasi (CP-SAT) dan disimpan di
// data.rencana. Fungsi ini menerapkannya ke format yang dipakai animasi.
// Aturan rencana:
//  - Kereta datang dari Jayakarta tertahan paling lama 5 menit.
//  - KA berangkat tepat waktu; bila mepet boleh awal paling banyak 20 menit.
//  - Waktu gerak standar: rangkaian peron <-> DAO 8, LM 6, lok gandeng di DAO 10,
//    LL kembali 6, L104 -> gandeng 5 menit. Waktu cepat (6, 5, 7, 5, 3) dipakai hanya bila perlu.
//  - Masuk DAO 3–5 menit setelah tiba. LD masuk DAO, press rem, keluar DAO 20–30 menit sebelum berangkat.
//  - LL gandeng di DAO, press rem 20–39 menit, lalu dorong ke peron 15–30 menit sebelum berangkat.
//    LL langsung menggandeng R26 sepulang mendorong R54.
//  - LD menunggu di jalur 7 paling lama 8 menit; LM keluar DAO paling lama 7 menit setelah melepas rangkaian.
//  - Jalur 7 satu rel: LM tidak masuk jalur 7 selama ada LD menunggu di sana.
//  - L64F + L32 dan L76F + L52 digandeng masuk DAO (combiner), seperti L2 + L16.
//  - Satu wesel/jalur untuk satu pergerakan dalam satu waktu; rangkaian 12 kereta di jalur 9.
function pakaiRencana(data) {
  const R = data.rencana;
  const combiner = data.plan.PAGI.combiner;
  const slot = (a, extra = {}) => a && {start: a[0], end: a[1], ...extra};
  const plan = {PAGI: data.plan.PAGI};
  const waitReasons = {}, llReleaseReasons = {}, ldReleaseReasons = {};
  for (const t of data.trains) {
    const c = R.trains[t.id];
    t.scheduled ??= t.departure;
    t.earlyBy = c.early;
    t.departure = t.scheduled - c.early;
    t.inTrack = c.jay[2];
    t.outTrack = c.out[2];
    if (c.pasangan) { t.ldPair = c.pasangan; data.trains.find(x => x.id === c.pasangan).ldPair = t.id; }
    if (c.earlyReason) t.earlyReason = c.earlyReason;
    else delete t.earlyReason;
    const q = {jay: slot(c.jay, {track: t.inTrack}), in: slot(c.in, {track: t.inTrack}), lm: slot(c.lm, {track: 7}), out: slot(c.out, {track: t.outTrack})};
    if (c.ld) q.ld = slot(c.ld, {track: 7});
    if (t.mode === "LL") {
      Object.assign(q, {pickup: slot(c.pickup, {track: 0}), ll: slot(c.ll, {track: 0}), l104: slot(c.l104, {track: 6}),
        gandeng: slot(c.gandeng, {track: t.outTrack, waitReason: ""})});
      q.pressLL = {start: q.pickup.end, end: q.out.start};
      q.brake = {start: q.gandeng.end, end: Math.min(q.gandeng.end + 5, t.departure)};
    } else {
      const ready = q.ld ? q.ld.end : combiner.end;
      q.brake = {start: Math.max(ready + 1, q.out.start - 20), end: q.out.start};
    }
    if (c.waitReason?.length) waitReasons[t.id] = c.waitReason;
    if (c.outReason?.length) (t.mode === "LL" ? llReleaseReasons : ldReleaseReasons)[t.id] = c.outReason;
    plan[t.id] = q;
  }
  // Tempat lok dinas menunggu: jalur 7 (pola LD) dan jalur 6 (pola LL), masing-masing tiga tempat.
  const berths = {}, waiting = [];
  for (const t of [...data.trains].sort((a, b) => a.loco - b.loco)) {
    if (t.id === "R16") { berths.R16 = berths.R2 ?? 0; continue; }
    const leave = t.id === "R2" ? combiner.start : t.mode === "LD" ? plan[t.id].ld.start : plan[t.id].l104.start;
    const taken = waiting.filter(w => w.mode === t.mode && w.end > t.loco && w.start < leave).map(w => w.slot);
    berths[t.id] = [0, 1, 2].find(n => !taken.includes(n)) ?? 0;
    waiting.push({mode: t.mode, start: t.loco, end: leave, slot: berths[t.id]});
  }
  Object.assign(data, {plan, berths, waitReasons, llReleaseReasons, ldReleaseReasons,
    targets: {dwell: [3, 5], ldOut: [20, 30], llOut: [15, 30], llPress: [20, 39], early: [1, 20], wait: 5},
    pelanggaran: R.pelanggaran, problems: []});
  return data;
}

(() => {
"use strict";
const scenarios = readSchedules();
for (const s of Object.values(scenarios)) s.rencana ? pakaiRencana(s) : susunJadwal(s, {pilihan: s.pilihan});
function startSimulation(scenario,view={}) {
  const data=scenarios[scenario];
  const listeners=new AbortController();
  const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:listeners.signal});
  const {trains, shifts, plan, targets, waitReasons, llReleaseReasons, ldReleaseReasons} = data;
  const byId = new Map(trains.map(t=>[t.id,t]));
  const byShift = new Map(shifts.map(t=>[t.name,t]));
  const read = id => document.getElementById(id);
  const ids = "scenario clock shift-label event-kind current-event event-detail shift-tabs jump-form jump-time route-status map map-panel map-clock fullscreen notifications prev play next speed custom-speed speed-value seek marks crew-count crew-list crew-availability crew-peak feed-label feed recap-heading recap-tabs recap-content train-lookup train-detail train-title train-picker train-times train-close".split(" ");
  const ui = Object.fromEntries(ids.map(id=>[id,read(id)]));
  const dom = (tag, text, classes) => {
    const e=document.createElement(tag);
    if(text !== undefined) e.textContent=text;
    if(classes) e.className=classes;
    return e;
  };
  const moduloDay = t=>((t % 1440) + 1440) % 1440;
  const day = 1440;
  function phase(t,s) {
    return t >= s.start && t < s.end;
  }
  function timeText(t, seconds=false) {
    const ticks = Math.max(0, Math.min(86400,Math.floor(t*60+1e-6)));
    const f = v => String(v).padStart(2,"0");
    const base = f(Math.floor(ticks/3600)) + ":" + f(Math.floor(ticks/60)%60);
    return seconds ? base + ":" + f(ticks%60) : base;
  }
  const group = plan.PAGI.combiner;
  const combination = ["R2","R16"];
  const isCombo = id => combination.includes(id);
  const worksheets = t => t.departureSources.map(x=>x.shift);
  const night = t => t.departure < t.arrival ? day : 0;
  // Jam press rem (LD, di DAO) dan cek rem (LL, di JAKK) dari penjadwal.
  const brakes=new Map(trains.map(t=>[t.id,{...plan[t.id].brake,kind:t.mode==="LL"?"cek rem JAKK":"press rem"}]));
  const earlyNote=t=>t.earlyBy?"Berangkat awal "+t.earlyBy+" mnt dari jadwal "+timeText(t.scheduled)+" · "+t.earlyReason:"";
  const llTrains=trains.filter(t=>t.mode==="LL").sort((a,b)=>plan[a.id].pickup.start-plan[b.id].pickup.start);
  const directPickup=new Set(), nextPickup=new Map();
  for(let i=1;i<llTrains.length;i++){
    const prev=llTrains[i-1].id, next=llTrains[i].id;
    const gap=plan[next].pickup.start-plan[prev].ll.end;
    if(gap>=0&&gap<=10){
      directPickup.add(next);
      nextPickup.set(prev,next);
    }
  }
  const llDest=t=>nextPickup.has(t.id)?"langsung ke "+nextPickup.get(t.id)+" di DAO "+byId.get(nextPickup.get(t.id)).dao:"siaga di DAO jalur 10";
  function dwellFor(train) {
    const p=plan[train.id];
    return p.in.start-p.jay.end;
  }
  function dwellNote(train) {
    const dwell=dwellFor(train);
    const causes=waitReasons[train.id];
    return dwell+" menit setelah tiba"+(causes?" · Menunggu "+causes.join(" dan "):"");
  }
  function leadFor(t) {
    return t.departure-plan[t.id].out.start;
  }
  const llLead=t=>t.departure-plan[t.id].out.start;
  const llBusy=llTrains.map(t=>({start:plan[t.id].pickup.start,end:plan[t.id].ll.end}));
  for(const [prev,next] of nextPickup) llBusy.push({start:plan[prev].ll.end,end:plan[next].pickup.start});
  const llIdle=(a,b)=>!llBusy.some(x=>a<x.end&&x.start<b);
  const llBusyAt=m=>llBusy.some(x=>m>=x.start&&m<x.end);
  const crewWork = [], events = [];
  function addEvent(time,title,detail,kind,groups,id) {
    const e={time,t:title,detail,kind,groups:[...new Set(groups)],id,key:events.length};
    events.push(e);
    return e;
  }
  function addTask(slot, title, detail, kind, groups, id, roles, route=true, continuity=[]) {
    const e=addEvent(slot.start,title,detail,kind,groups,id);
    const job={...e,start:slot.start,end:slot.end,roles,crew:[],route,continuity};
    crewWork.push(job);
    return job;
  }
  const crewR = name => [name, "Ujung rangkaian"];
  const locoRole = k => "Di lok " + k;
  const ldDuty = id => "LD " + id;
  for(const t of trains) {
    const p=plan[t.id];
    const inShift=[t.arrivalSource.shift], outShift=worksheets(t);
    const outDuty=t.id==="R18"?["Pagi",...outShift]:t.id==="R62"?["Siang","Malam"]:outShift;
    const peron="Jalur " + t.outTrack + " JAKK";
    const inDescription="LM "+t.formerCode+" · Jalur " + t.inTrack + " JAKK → DAO " + t.dao;
    const check=brakes.get(t.id);
    const duty=[ldDuty(t.id)];
    if(p.jay.end > t.arrival) addEvent(t.arrival,t.inbound + " tertahan sinyal masuk", "Jadwal datang " + timeText(t.arrival) + " · masuk JAKK " + timeText(p.jay.end) + " (tertahan " + (p.jay.end-t.arrival) + " mnt)" + (waitReasons[t.id]?" · "+waitReasons[t.id].join(" · "):"") + ".", "antre",inShift,t.id);
    addEvent(p.jay.end,t.inbound + " tiba di JAKK","Jalur " + t.inTrack + " · mulai langsir " + timeText(p.in.start)
      + " · " + dwellNote(t) + ".", "datang",inShift,t.id);
    addTask(p.in,t.inbound + " masuk DAO dengan LM",inDescription + " · " + dwellNote(t),"langsir",inShift,t.id,crewR(locoRole("mantan")));
    addTask(p.lm,t.formerCode + " keluar DAO","DAO " + t.dao + " → Jalur 7 JAKK","lok mantan",inShift,t.id,["Di lok mantan"]);
    addEvent(t.loco,t.locoCode + " tiba di JAKK","Kampung Bandan → Jalur " + (t.mode==="LD"?7:6) + (isCombo(t.id)?" · bagian L2/L16.":t.ldPair?" · bergandengan dengan "+byId.get(t.ldPair).locoCode+".":"."),"lok dinas",outShift,t.id);
    if(t.mode==="LD") {
      if(p.ld) addTask(p.ld,t.locoCode + (t.ldPair?" + "+byId.get(t.ldPair).locoCode+" (digandeng)":"") + " masuk DAO","Jalur 7 JAKK → DAO " + t.dao + (t.ldPair?" · dipisah di DAO, "+byId.get(t.ldPair).locoCode+" ke DAO "+byId.get(t.ldPair).dao:""),"lok dinas",outShift,t.id,[locoRole("dinas")],true,duty);
      // LD yang sudah tergandeng di DAO dijaga 1 PLR sampai bergerak; saat langsir keluar dipakai 2 PLR.
      const ready=p.ld?p.ld.end:group.end;
      addTask({start:ready,end:p.out.start},"LD tergandeng "+t.id,"DAO "+t.dao+" · press rem "+timeText(check.start)+"–"+timeText(check.end)+" · 1 PLR menjaga lok","jaga LD",outShift,t.id,["Jaga LD di DAO"],false,duty);
      if(check.start<check.end) addEvent(check.start,"Press rem "+t.id,"DAO "+t.dao+" · "+(check.end-check.start)+" mnt.","press rem",outShift,t.id);
    } else {
      addTask(p.l104,t.locoCode + " menuju L104","Jalur 6 JAKK → sinyal langsir L104","lok dinas",outShift,t.id,[locoRole("dinas")],false,duty);
      const pick=p.pickup;
      const origin=directPickup.has(t.id)?"Sepulang dari JAKK":"Dari DAO jalur 10";
      addTask(pick,"LL menuju dan gandeng "+t.id,origin+" → DAO "+t.dao+" · tergandeng "+timeText(pick.end)+" WIB.","gandeng LL",outDuty,t.id,["Di lok langsir"],false);
      addEvent(pick.end,"LL tergandeng "+t.id,"DAO "+t.dao+" · press rem "+(p.pressLL.end-p.pressLL.start)+" mnt, keluar DAO "+timeText(p.out.start)+".","LL tergandeng",outDuty,t.id);
      // Press rem di DAO cukup 1 PLR (P5 di LL); PLR ujung rangkaian baru ditambah saat langsir keluar.
      addEvent(p.pressLL.start,"Press rem "+t.id+" (LL)","DAO "+t.dao+" · "+(p.pressLL.end-p.pressLL.start)+" mnt · P5 di LL.","press rem LL",outDuty,t.id);
      addTask(p.ll,"LL langsung kembali setelah " + t.id,peron + " → DAO · "+llDest(t),"lok langsir",outDuty,t.id,["Di lok langsir"]);
      addTask(p.gandeng,"LD gandeng " + t.id,"Dari L104 ke " + peron + " · selesai "+timeText(p.gandeng.end)+" WIB","gandeng",outShift,t.id,[locoRole("dinas")],true,duty);
      addEvent(check.start,"Cek pengereman "+t.id,peron+" · gandeng selesai, PLR peron lepas tugas · "+(check.end-check.start)+" menit simulasi.","cek rem JAKK",outShift,t.id);
      if(check.end<t.departure) addEvent(check.end,t.id+" siap berangkat",peron+" · cek rem simulasi selesai.","siap",outShift,t.id);
    }
    const release=t.mode==="LL"?" · didorong "+llLead(t)+" mnt sebelum berangkat":" · press rem selesai "+leadFor(t)+" mnt sebelum berangkat";
    addTask(p.out,t.id + " keluar DAO","DAO " + t.dao + " → " + peron + " · " + t.mode+release,
      "langsir",outDuty,t.id,crewR(locoRole(t.mode==="LD"?"dinas":"langsir")),true,t.mode==="LD"?[undefined,...duty]:[]);
    addEvent(t.departure,t.id + (t.earlyBy?" berangkat awal dari JAKK":" berangkat dari JAKK"),peron + " → Jayakarta · " + t.name+(t.earlyBy?" · "+earlyNote(t):""),"berangkat",outShift,t.id);
  }
  const combinerJob=addTask(group,"L2 dan L16 masuk DAO","Aplusan Malam → Pagi · dua lok bergandengan dari Jalur 7.","aplusan",["Malam","Pagi"],"R2",["Di L2","Di L16"],true,combination.map(ldDuty));
  addEvent(group.end,"L2 dan L16 dipisah di DAO","L2 menuju DAO " + byId.get("R2").dao + " · L16 menuju DAO " + byId.get("R16").dao + ".","aplusan",["Malam","Pagi"],"R2");

  crewWork.sort((a,b)=>a.start-b.start||a.end-b.end);
  // P1–P3 peron, P5 di LL, P6 ujung rangkaian. Saat LL diam di DAO jalur 10,
  // P5 bebas dan bisa membantu langsiran lain (utamanya di ujung rangkaian).
  const freeAt={1:-Infinity,2:-Infinity,3:-Infinity,5:-Infinity,6:-Infinity};
  const preceding=new Map();
  let nextPeron=0;
  const shortages=[];
  for(const job of crewWork){
    for(const [i,role] of job.roles.entries()){
      const duty=job.continuity[i];
      const can=n=>freeAt[n]<=job.start&&(n!==5||llIdle(job.start,job.end));
      let number=0;
      if(role==="Di lok langsir") number=5;
      else if(role==="Ujung rangkaian") number=can(6)?6:can(5)?5:0;
      if(!number){
        const earlier=preceding.get(duty);
        const candidates=[0,1,2].map(n=>(n+nextPeron)%3+1);
        const pick=earlier&&can(earlier)?earlier:candidates.find(can);
        if(pick){number=pick;if(duty)preceding.set(duty,pick);nextPeron=pick%3;}
        else number=can(5)?5:can(6)?6:0;
      }
      if(number) freeAt[number]=Math.max(freeAt[number],job.end);
      else shortages.push(job);
      job.crew.push({number,role,helper:number===5&&role!=="Di lok langsir"});
    }
  }
  for(const job of crewWork.filter(j=>j.kind==="gandeng")){
    const train=byId.get(job.id), number=job.crew[0].number;
    addEvent(job.end,train.locoCode+" tergandeng "+train.id,
      "Jalur "+train.outTrack+" JAKK · P"+number+" selesai gandeng dan bisa ditugaskan kembali.",
      "selesai gandeng",job.groups,job.id);
  }
  function usedCrew(active,m) {
    const used=new Set([4,...active.flatMap(job=>job.crew.map(p=>p.number)).filter(Boolean)]);
    if(llBusyAt(m)) used.add(5);
    return used;
  }
  const peak=crewWork.reduce((best,job)=>{
    const active=usedCrew(crewWork.filter(t=>phase(job.start,t)),job.start).size;
    return active>best.active?{time:job.start,active}:best;
  },{time:0,active:1});
  ui["crew-peak"].textContent="Puncak "+peak.active+"/6 · "+timeText(peak.time);
  ui["crew-peak"].onclick=()=>{setPlay(false);setTime(peak.time);};
  events.sort((a,b)=>a.time-b.time||a.key-b.key);
  const jobBy = new Map(crewWork.map(j=>[j.id+"|"+j.start+"|"+j.kind,j]));
  const labelStart = {"Malam":19,"Pagi":400,"Siang":915,"Semua":0};
  const actionAt = {
    arrivals: t=>plan[t.id].jay.end,
    departures: t=>t.departure,
  };
  const inboundMap = new Map(trains.map(t=>[t.inbound,t]));
  const route = diagram.asset;
  const geometry = new Map(trains.map(t=>{
    const p=plan[t.id], inTrack=t.inTrack, outTrack=t.outTrack;
    const end=diagram.depotTrack(t.dao,t.id==="R16"?1:0);
    const ldTrack=t.mode==="LD"?7:6;
    const ldBay=diagram.bay(ldTrack,data.berths?.[t.id]??(t.id==="R32"?1:0));
    return [t.id,{
      end,ldBay,band:route(diagram.bandRoute(ldTrack,ldBay)),
      arrive:route(diagram.fromJay(inTrack)),
      enter:route([...diagram.toDao(inTrack),...diagram.daoApproach(t.dao),end]),
      exit:route(diagram.fromDao(end,outTrack)), depart:route(diagram.toJay(outTrack)),
      former:route(diagram.lmRoute(diagram.lmSpot(end))), ldIn:route([...diagram.ldToDao(ldBay),...diagram.daoApproach(t.dao),end]),
      toSignal:route(diagram.signalRoute(ldBay)),gandeng:route(diagram.fromSignal(outTrack,t.departureCars)),llBack:route(diagram.llHome(outTrack,t.departureCars,nextPickup.has(t.id))),
      llPick:p.pickup?route(diagram.llPickup(t.dao,end,t.departureCars,directPickup.has(t.id))):null,
    }];
  }));
  const comboPoint=diagram.bay(7,data.berths?.R2??0);
  const comboArrive=route(diagram.bandRoute(7,comboPoint));
  const comboEnter=route(diagram.ldToDao(comboPoint));
  const span = (x,y) => ({start:x,end:y});
  const offsetSlot=(p,k)=>({start:p.start+k,end:p.end+k});
  const tow = (slot)=> t=>(t-slot.start)/(slot.end-slot.start);

  function stockAt(tick) {
    const items = [];
    const parked = (pos,item) => items.push({...item,pos:{...pos,angle:0}});
    const moved = (path,t,item)=>items.push({...item,active:true,route:path,pos:diagram.tracing(path,t)});
    function staff(id,slot,kind) {
      return jobBy.get(id+"|"+slot.start+"|"+kind)?.crew.map(x=>x.number)??[];
    }
    for(const t of trains) {
      const p=plan[t.id], g=geometry.get(t.id);
      const enter={name:t.inbound,kind:"in",cars:t.arrivalCars,displayMode:"LM",trainId:t.id};
      const exit={name:t.id,kind:"out",cars:t.departureCars,displayMode:t.mode,trainId:t.id};
      for(const shift of [-day,0,day]) {
        const now=tick-shift, days=night(t);
        const inWaiting=span(t.arrival,p.jay.start);
        const outbound=offsetSlot(p.out,days);
        const dep=span(t.departure+days,t.departure+days+3);
        const ldReady=t.mode==="LD"?(isCombo(t.id)?group.end:p.ld.end)+days:null;
        if(phase(now,inWaiting)) parked(diagram.jayWait,{...enter,active:true,loco:"lm"});
        else if(phase(now,p.jay)) moved(g.arrive,tow(p.jay)(now),{...enter,loco:"lm"});
        else if(now>=p.jay.end&&now<p.in.start) parked(diagram.trainPark(t.inTrack),{...enter,loco:"lm"});
        else if(phase(now,p.in)) moved(g.enter,tow(p.in)(now),{...enter,loco:"lm",staff:staff(t.id,p.in,"langsir")});
        else if(now>=p.in.end&&now<outbound.start) {
          const hitched=ldReady!==null&&now>=ldReady;
          const llHitched=p.pickup&&now>=p.pickup.end+days;
          const justArrived=now<p.in.end+1;
          const check=brakes.get(t.id);
          const llPress=llHitched&&p.pressLL&&phase(now,offsetSlot(p.pressLL,days));
          const press=(hitched&&phase(now,offsetSlot(check,days)))||llPress;
          const loco=hitched?"ld":llHitched?"ll":justArrived?"lm":null;
          parked(g.end,{...(hitched||llHitched?exit:enter),loco,displayMode:loco?.toUpperCase(),press,dock:t.dao,
            staff:llHitched?[5]:hitched?staff(t.id,{start:p.ld?p.ld.end:group.end},"jaga LD"):[]});
        } else if(phase(now,outbound)) moved(g.exit,tow(outbound)(now),{...exit,loco:t.mode.toLowerCase(),staff:staff(t.id,p.out,"langsir")});
        else if(now>=outbound.end&&now<dep.start) {
          const check=brakes.get(t.id);
          const press=check.kind==="cek rem JAKK"&&phase(now,offsetSlot(check,days));
          const loco=t.mode==="LD"||now>=p.gandeng.end+days?"ld":null;
          parked(diagram.trainPark(t.outTrack),{...exit,loco,locoFront:true,displayMode:loco?.toUpperCase(),press});
        }
        else if(phase(now,dep)) moved(g.depart,tow(dep)(now),{...exit,loco:"ld",locoFront:true,displayMode:"LD"});
        const former={name:t.formerCode,kind:"lm",displayMode:"LM"};
        if(now>=p.in.end+1&&now<p.lm.start) parked(diagram.lmSpot(g.end),{...former,label:false});
        if(phase(now,p.lm)) moved(g.former,tow(p.lm)(now),{...former,staff:staff(t.id,p.lm,"lok mantan")});
      }
      const ld={name:t.locoCode,kind:"ld",displayMode:"LD"};
      if(!isCombo(t.id)) {
        const approach=span(t.loco-3,t.loco);
        if(phase(tick,approach)) moved(g.band,tow(approach)(tick),ld);
        if(t.mode==="LD") {
          if(tick>=t.loco&&tick<p.ld.start) parked(g.ldBay,ld);
          if(phase(tick,p.ld)) moved(g.ldIn,tow(p.ld)(tick),{...ld,staff:staff(t.id,p.ld,"lok dinas")});
        } else {
          if(tick>=t.loco&&tick<p.l104.start) parked(g.ldBay,ld);
          if(phase(tick,p.l104)) moved(g.toSignal,tow(p.l104)(tick),{...ld,staff:staff(t.id,p.l104,"lok dinas")});
          if(tick>=p.l104.end&&tick<p.gandeng.start) parked(diagram.signal,ld);
          if(phase(tick,p.gandeng)) moved(g.gandeng,tow(p.gandeng)(tick),{...ld,staff:staff(t.id,p.gandeng,"gandeng")});
          if(phase(tick,p.pickup)){
            const moving=tick<p.pickup.end-1;
            const single={name:"LL",kind:"ll",staff:[5]};
            if(moving) moved(g.llPick,(tick-p.pickup.start)/(p.pickup.end-1-p.pickup.start),single);
            else parked(g.llPick.path.at(-1),{...single,label:false});
          }
          if(phase(tick,p.ll)) moved(g.llBack,tow(p.ll)(tick),{name:"LL",kind:"ll",staff:[5]});

        }
      }
    }
    const between=[...nextPickup].find(([prev,next])=>tick>=plan[prev].ll.end&&tick<plan[next].pickup.start);
    if(between) parked(geometry.get(between[0]).llBack.path.at(-1),{name:"LL",kind:"ll",staff:[5],label:false});
    else if(!llTrains.some(t=>tick>=plan[t.id].pickup.start&&tick<plan[t.id].ll.end)){
      parked(diagram.llPark,{name:"LL",kind:"ll",displayMode:"siaga, P5 bebas",dock:10});
    }
    const coupledLoco={name:"L2 + L16",kind:"ld",displayMode:"LD",double:true};
    if(tick>=397&&tick<400) moved(comboArrive,(tick-397)/3,coupledLoco);
    else if(tick>=400&&tick<group.start) parked(comboPoint,coupledLoco);
    else if(tick>=group.start&&tick<group.end-1) moved(comboEnter,(tick-group.start)/(group.end-1-group.start),{...coupledLoco,staff:combinerJob.crew.map(x=>x.number)});
    else if(tick>=group.end-1&&tick<group.end) combination.forEach((id,i)=>{
      const p=geometry.get(id), move = route(diagram.comboSplit(p.end));
      moved(move,tick-(group.end-1),{name:id==="R2"?"L2":"L16",kind:"ld",displayMode:"LD",staff:[combinerJob.crew[i].number]});
    });
    return items;
  }

  let shift = view.shift??"Semua", tab=view.tab??"arrivals", tick=view.tick??19, playing=false, raf=0, last=0, lastSecond=-1;
  let picked=null, routeDisplay="", crewDisplay=null, feedDisplay="";
  let toastTimer;
  let visibleStocks=[], detailTrain=null;
  let scoped=events.filter(e=>e.groups.includes(shift));
  const counts=Object.fromEntries(shifts.map(s=>[s.name,[s.arrivals.length,s.departures.length]]));
  const notifiedKinds=new Set(["datang","berangkat","langsir","lok dinas","lok mantan","lok langsir","gandeng","aplusan","gandeng LL","LL tergandeng","selesai gandeng"]);
  function clearNotices() {
    clearTimeout(toastTimer);
    ui.notifications.replaceChildren();
  }
  function showNotices(list) {
    const relevant=list.filter(e=>notifiedKinds.has(e.kind)).sort((a,b)=>{
      const priority=e=>e.kind==="berangkat"?3:e.kind==="datang"?2:e.kind==="lok dinas"?1:0;
      return priority(b)-priority(a)||b.time-a.time;
    }).slice(0,3);
    if(!relevant.length) return;
    clearNotices();
    for(const e of relevant){
      const t=byId.get(e.id);
      const p=plan[t.id];
      const incoming=e.kind==="datang"||e.kind==="lok mantan"||(e.kind==="langsir"&&p.in.start===e.time);
      const name=incoming?t.arrivalSource.name.replace(/^Dinas Rang\w+\s+/i,""):t.name;
      const pair=e.kind==="aplusan";
      const number=pair?"R2 / R16":incoming?t.inbound:t.id;
      const title=pair?t.name+" / "+byId.get("R16").name:name;
      const heading=e.kind==="selesai gandeng"?"Gandeng selesai":e.kind==="berangkat"?(t.earlyBy?"Berangkat awal "+t.earlyBy+" mnt":"Berangkat tepat"):e.kind==="datang"?"Tiba JAKK":
        e.kind==="lok dinas"&&e.time===t.loco?"Lok dinas tiba JAKK":"Pergerakan langsir";
      const loco=pair?combination.map(id=>byId.get(id).locoCode).join(" + "):incoming?t.formerCode:t.locoCode;
      const card=dom("article",undefined,"notification");
      card.dataset.kind=e.kind;
      const ll=e.kind==="gandeng LL"||e.kind==="LL tergandeng"||e.kind==="lok langsir"||
        (e.kind==="langsir"&&!incoming&&t.mode==="LL");
      const mode=incoming?"LM":ll?"LL":"LD";
      card.append(dom("strong",heading+" · "+timeText(e.time)+" WIB"),
        dom("b",number+" · "+title+" · "+mode),
        dom("span",incoming?"Lok mantan "+loco:ll?"Lok langsir · LD keberangkatan "+t.locoCode:"Lok dinas "+loco),
        dom("p",["datang","berangkat"].includes(e.kind)?e.detail:e.t+" · "+e.detail));
      ui.notifications.append(card);
    }
    toastTimer=setTimeout(clearNotices,5000);
  }
  function setTime(value, select=null) {
    if(!Number.isFinite(value)) return;
    tick=Math.max(0,Math.min(day,value));
    picked=select;
    clearNotices();
    showNotices(select?[select]:events.filter(e=>e.time===Math.floor(tick)));
    render(true);
  }
  function changeShift(value, jump=true) {
    shift=value;
    picked=null;
    scoped=shift==="Semua"?events:events.filter(e=>e.groups.includes(shift));
    ui["shift-label"].textContent=shift==="Semua"?"24 JAM":"DINAS "+shift.toUpperCase();
    for(const b of ui["shift-tabs"].querySelectorAll("button")) b.setAttribute("aria-pressed",b.dataset.shift===shift);
    if(jump) {
      setPlay(false);
      tick=labelStart[shift];
    }
    clearNotices();
    showNotices(scoped.filter(e=>e.time===Math.floor(tick)));
    const [a,b]=counts[shift]??[trains.length,trains.length];
    ui["recap-heading"].textContent=a+" datang · "+b+" berangkat"+(shift==="Semua"?" unik":" dalam tab");
    const fragment=document.createDocumentFragment();
    for(const row of scoped) {
      const marker=dom("i");
      marker.style.left=100*row.time/day+"%";
      fragment.append(marker);
    }
    ui.marks.replaceChildren(fragment);
    renderRecap();
    render(true);
  }
  function setPlay(state) {
    if(playing===state) return;
    playing=state;
    ui.play.textContent=state?"Ⅱ Jeda":"▶ Putar";
    ui.play.setAttribute("aria-pressed",state);
    if(state){
      if(tick>=day) setTime(labelStart[shift]);
      picked=null;last=0;raf=requestAnimationFrame(advance);
    } else cancelAnimationFrame(raf);
  }
  function speed() {
    const n=Number(ui.speed.value==="custom"?ui["speed-value"].value:ui.speed.value);
    return Number.isFinite(n)&&n>0?Math.max(1,Math.min(n,3600)):60;
  }
  function advance(now){
    if(!playing) return;
    const previous=tick;
    if(last) tick=Math.min(day,tick+(now-last)*speed()/60000);
    last=now;
    if(Math.floor(tick)>Math.floor(previous)) showNotices(events.filter(e=>e.time>previous&&e.time<=tick));
    render();
    if(tick>=day) setPlay(false);
    else raf=requestAnimationFrame(advance);
  }
  function nextStep(direction) {
    const next=direction>0?scoped.find(e=>e.time>tick+.000001):scoped.findLast(e=>e.time<tick-.000001);
    if(next){setPlay(false);setTime(next.time,next);}
  }
  function renderCrew(active) {
    const crew=new Map(active.flatMap(job=>job.crew.map(x=>[x.number,{...x,job}])));
    const attached=llTrains.find(t=>tick>=plan[t.id].pickup.end&&tick<plan[t.id].out.start);
    const signature=active.map(j=>j.key).join("|")+"|"+(attached?.id??"")+"|"+llBusyAt(tick);
    if(crewDisplay===signature) return;
    crewDisplay=signature;
    const used=usedCrew(active,tick);
    ui["crew-count"].textContent="PLR "+used.size+"/6 terpakai";
    ui["crew-availability"].textContent=(6-used.size)+" tersedia";
    const nodes=[];
    for(let i=1;i<=6;i++){
      const assign=crew.get(i), job=assign?.job;
      const button=dom("button",undefined,"person"+(used.has(i)?" active":""));
      button.type="button";
      button.disabled=!job;
      const caption=dom("span");
      const post=i<=3?"JAKK · Peron":i===4?"DAO · Wesel":i===5?"DAO · Lok langsir":"DAO · Mobile";
      const resting=i===4?"Jaga wesel tetap":i===5?(llBusyAt(tick)?"Di LL · melayani rangkaian":"LL diam di DAO 10 · bebas, bisa bantu ujung rangkaian"):i===6?"Siaga langsir ujung rangkaian":"Siaga untuk LD / LM";
      caption.append(dom("b",post),dom("small",job?(assign.helper?"Membantu · ":"")+assign.role+" · "+job.t:resting));
      button.append(dom("i","P"+i),caption);
      button.setAttribute("aria-label","PLR "+i+" · "+caption.textContent);
      if(job) button.onclick=()=>{setPlay(false);setTime(tick,job);};
      nodes.push(button);
    }
    ui["crew-list"].replaceChildren(...nodes);
  }
  function renderFeed(){
    const first=scoped.findIndex(v=>v.time>=tick-.001);
    const rows=first>=0?scoped.slice(first,first+5):[];
    const signature=shift+"|"+rows.map(x=>x.key).join(",")+"|"+picked?.key;
    if(feedDisplay===signature) return;
    feedDisplay=signature;
    ui["feed-label"].textContent=shift==="Semua"?"Semua kegiatan":"Dinas "+shift;
    if(!rows.length){ui.feed.replaceChildren(dom("p","Tidak ada kegiatan lanjutan pada tab ini.","empty"));return;}
    ui.feed.replaceChildren(...rows.map(e=>{
      const control=dom("button",undefined,"feed-row");
      control.type="button";
      if(picked?.key===e.key)control.setAttribute("aria-current","true");
      const words=dom("span");
      words.append(dom("strong",e.t),dom("small",e.kind+" · "+e.detail));
      control.append(dom("time",timeText(e.time)),words);
      control.onclick=()=>{setPlay(false);setTime(e.time,e);};
      return control;
    }));
  }
  function render(force=false){
    const second=Math.floor(tick*60+.000001);
    visibleStocks=stockAt(tick);
    diagram.paint(ui.map,visibleStocks);
    if(second===lastSecond&&!force) return;
    lastSecond=second;
    ui.clock.textContent=timeText(tick,true);
    ui["map-clock"].textContent=timeText(tick,true)+" WIB";
    ui.seek.value=second;
    ui.seek.setAttribute("aria-valuetext",timeText(tick,true)+" WIB");
    const active=crewWork.filter(job=>phase(tick,job));
    renderCrew(active);
    const underway=trains.find(t=>tick>=t.departure && tick<t.departure+3);
    const crossing=active.find(job=>job.route);
    const check=[...brakes].find(([,slot])=>phase(tick,slot));
    const label=underway?"Prioritas berangkat · "+underway.id:crossing?crossing.t:check?"Cek pengereman · "+check[0]:"Akses langsir kosong";
    if(routeDisplay!==label){ui["route-status"].textContent=label;routeDisplay=label;}
    const current=picked ?? events.findLast(e=>e.time===Math.floor(tick)) ?? active[0] ?? scoped.findLast(e=>e.time<=tick);
    ui["event-kind"].textContent=current?.kind??"Aktivitas";
    ui["current-event"].textContent=current?.t??"Menunggu pergerakan";
    ui["event-detail"].textContent=current?timeText(current.time)+" WIB · "+current.detail:"Pilih kegiatan atau geser jam simulasi.";
    ui.prev.disabled=!scoped.some(e=>e.time<tick-.000001);
    ui.next.disabled=!scoped.some(e=>e.time>tick+.000001);
    renderFeed();
  }

  function eventLink(code, t, m, kind) {
    const b=dom("button",code);
    b.type="button";
    b.onclick=()=>{
      const e=events.find(x=>x.id===t.id&&x.time===m&&x.kind===kind);
      setPlay(false);setTime(m,e);
    };
    return b;
  }
  function trainLink(code, t) {
    return eventLink(code,t,actionAt[tab](t),tab==="arrivals"?"datang":"berangkat");
  }
  const cell = (parent,text,node) => {
    const col=dom("td",text);
    if(node)col.append(node);
    parent.append(col);
    return col;
  };
  function renderRecap(){
    for(const b of ui["recap-tabs"].querySelectorAll("button")) b.setAttribute("aria-pressed",b.dataset.table===tab);
    const current=byShift.get(shift);
    const tables=current?[current]:shifts;
    if(tab==="notes"){
      const notes=dom("div",undefined,"note-list");
      for(const roster of shifts) for(const rec of roster.notes){
        if(current&&!rec.text.toUpperCase().includes(current.name.toUpperCase())) continue;
        const row=dom("article");
        row.append(dom("p",rec.text),dom("small",roster.sheet+" · baris "+rec.row));
        const at=rec.text.includes("L2")?group.start:rec.text.includes("R18")?plan.R18.out.start:plan.R62.out.start;
        const jump=dom("button","Lihat "+timeText(at),"plain");
        jump.type="button";
        jump.onclick=()=>{setPlay(false);setTime(at);};
        row.append(jump);notes.append(row);
      }
      if(!notes.children.length) notes.append(dom("p","Tidak ada catatan aplusan untuk dinas ini.","empty"));
      ui["recap-content"].replaceChildren(notes);
      return;
    }
    const wrap=dom("div",undefined,"table-scroll"), table=dom("table");
    const headings=tab==="arrivals"?["KA","Datang WIB","Mulai ke DAO","Lok mantan keluar","Jalur","Pergerakan","Personil DAO","Personil Peron"]
      :["KA","LD tiba","Berangkat","LD/LL","Keluar DAO","Cek rem","Jalur","SF"];
    const head=dom("thead"), tr=dom("tr");
    for(const h of headings) tr.append(dom("th",h));
    head.append(tr);
    const body=dom("tbody");
    const rows=tab==="arrivals"?tables.flatMap(s=>s.arrivals).sort((a,b)=>a.arrival-b.arrival)
      : (current?current.departures.map(k=>byId.get(k.code)).filter(Boolean):trains);
    for(const row of rows){
      const line=dom("tr");
      if(tab==="arrivals"){
        const t=inboundMap.get(row.code), p=plan[t.id], arrive=p.jay.end;
        const num=cell(line,undefined,trainLink(row.code,t));
        num.append(dom("small",row.supplemental?"Fakultatif · rekap JAKK":row.shift+" · baris "+row.row));
        const time=cell(line,timeText(row.arrival));time.className="t-time";
        if(arrive!==row.arrival)time.append(dom("small","Masuk "+timeText(arrive)+" · tertahan "+(arrive-row.arrival)+" mnt"));
        const start=cell(line,undefined,eventLink(timeText(p.in.start),t,p.in.start,"langsir"));
        start.append(dom("small","+"+dwellFor(t)+" mnt setelah tiba"));
        if(waitReasons[t.id]) start.append(dom("small",waitReasons[t.id].join(" · "),"timing-note"));
        const former=cell(line,undefined,eventLink(timeText(p.lm.start),t,p.lm.start,"lok mantan"));
        const wait=p.lm.start-p.in.end-1;
        former.append(dom("small",t.formerCode+" · "+(wait?wait+" mnt tunggu akses":"langsung setelah lepas")));
        cell(line,"JAKK "+t.inTrack+" → DAO "+t.dao);
        cell(line,"LM · "+row.movement);cell(line,row.dao);cell(line,row.peron);
      } else {
        const num=cell(line,undefined,trainLink(row.id,row));num.append(dom("small",row.name+(row.supplemental?" · F":"")));
        cell(line,timeText(row.loco)).className="t-time";
        const dep=cell(line,timeText(row.departure));dep.className="t-time";
        if(row.earlyBy){
          dep.append(dom("small","Awal "+row.earlyBy+" mnt · jadwal "+timeText(row.scheduled)));
          dep.append(dom("small",row.earlyReason,"timing-note"));
        }
        cell(line,row.mode);
        const release=plan[row.id].out.start;
        const move=cell(line,undefined,eventLink(timeText(release),row,release,"langsir"));
        if(row.mode==="LL") {
          move.append(dom("small",llLead(row)+" mnt sebelum berangkat"));
          if(llReleaseReasons[row.id]) move.append(dom("small",llReleaseReasons[row.id].join(" · "),"timing-note"));
        } else {
          move.append(dom("small",leadFor(row)+" mnt sebelum berangkat"));
          if(ldReleaseReasons?.[row.id]) move.append(dom("small",ldReleaseReasons[row.id].join(" · "),"timing-note"));
        }
        const check=brakes.get(row.id);
        const pl=plan[row.id].pressLL;
        if(pl){
          const window=cell(line,undefined,eventLink(timeText(pl.start)+"–"+timeText(pl.end),row,pl.start,"press rem LL"));
          window.append(dom("small","DAO · "+(pl.end-pl.start)+" mnt, lalu cek di JAKK"));
        } else if(check.start<check.end){
          const window=cell(line,undefined,eventLink(timeText(check.start)+"–"+timeText(check.end),row,check.start,check.kind));
          window.append(dom("small",(check.kind==="press rem"?"DAO":"JAKK")+" · "+(check.end-check.start)+" mnt"));
        } else cell(line,"—");
        cell(line,"DAO "+row.dao+" → JAKK "+row.outTrack);
        cell(line,row.formation);
      }
      body.append(line);
    }
    table.append(head,body);wrap.append(table);
    ui["recap-content"].replaceChildren(wrap);
  }
  function toggleFull(active){
    ui["map-panel"].classList.toggle("is-full",active);
    document.body.classList.toggle("map-open",active);
    ui.fullscreen.setAttribute("aria-pressed",active);
    ui.fullscreen.textContent=active?"Keluar layar penuh":"Layar penuh";
  }
  ui["train-picker"].replaceChildren();
  for(const t of trains){
    const option=dom("option",t.inbound+" → "+t.id+" · "+t.name);
    option.value=t.id;
    ui["train-picker"].append(option);
  }
  function openTrain(id) {
    const t=byId.get(id);
    if(!t) return;
    setPlay(false);
    detailTrain=t.id;
    const p=plan[t.id], check=brakes.get(t.id);
    const range=slot=>timeText(slot.start)+"–"+timeText(slot.end)+" WIB";
    const duration=slot=>(slot.end-slot.start)+" mnt";
    const outbound=["Langsir DAO → JAKK",range(p.out),duration(p.out)+" · "+t.mode+" ke Jalur "+t.outTrack+" · "+(t.mode==="LL"?llLead(t)+" mnt sebelum berangkat":leadFor(t)+" mnt sebelum berangkat")];
    const brakeCheck=[t.mode==="LD"?"Cek rem di DAO":"Cek rem di JAKK",range(check),duration(check)];
    const rows=[
      ["Datang JAKK",timeText(p.jay.end)+" WIB","Jalur "+t.inTrack+
        (p.jay.end!==t.arrival?" · jadwal "+timeText(t.arrival):"")+
        (night(t)?" · hari sebelumnya":"")],
      ["Tunggu di JAKK",dwellFor(t)+" mnt",waitReasons[t.id]?.join(" · ")],
      ["Langsir JAKK → DAO",range(p.in),duration(p.in)+" · LM "+t.formerCode+" ke DAO "+t.dao],
      ["Lok mantan keluar",range(p.lm),t.formerCode+" · "+duration(p.lm)],
      ["Lok dinas datang",timeText(t.loco)+" WIB",t.locoCode+" · Jalur "+(t.mode==="LD"?7:6)],
    ];
    if(t.mode==="LD"){
      const ld=p.ld??group;
      rows.push(["LD masuk DAO",range(ld),duration(ld)+(p.ld?"":" · bergandengan")]);
      if(check.start<check.end)rows.push(brakeCheck);
      rows.push(outbound);
    }else{
      rows.push(["LL menuju dan gandeng",range(p.pickup),"DAO "+t.dao+" · tergandeng "+timeText(p.pickup.end)+" WIB"]);
      rows.push(["Press rem di DAO",range(p.pressLL),duration(p.pressLL)+" · persiapan sebelum keluar DAO"]);
      rows.push(outbound);
      rows.push(["LL langsung pulang",range(p.ll),llDest(t)]);
      rows.push(["LD ke L104",range(p.l104),duration(p.l104)]);
      const person=jobBy.get(t.id+"|"+p.gandeng.start+"|gandeng").crew[0].number;
      rows.push(["LD gandeng di JAKK",range(p.gandeng),p.gandeng.waitReason||"Langsung saat rangkaian dan rute siap"]);
      rows.push(["PLR selesai gandeng",timeText(p.gandeng.end)+" WIB","P"+person+" bisa ditugaskan kembali"]);
      if(check.start<check.end)rows.push(brakeCheck);
    }
    rows.push([t.earlyBy?"Berangkat awal":"Berangkat tepat",timeText(t.departure)+" WIB","Jalur "+t.outTrack+" JAKK"+(t.earlyBy?" · "+earlyNote(t):"")]);
    const list=dom("dl",undefined,"train-timings");
    for(const [label,time,note] of rows){
      const value=dom("dd",time);
      if(note)value.append(dom("small",note));
      list.append(dom("dt",label),value);
    }
    ui["train-title"].textContent=t.inbound+" → "+t.id+" · "+t.name+" · keluar DAO dengan "+t.mode;
    ui["train-picker"].value=t.id;
    ui["train-times"].replaceChildren(list);
    const open=ui["train-detail"].hidden;
    ui["train-detail"].hidden=false;
    if(open)ui["train-close"].focus();
  }
  function closeTrain() {
    ui["train-detail"].hidden=true;
    ui["train-lookup"].focus();
  }
  listen(ui.map,"click",e=>{
    const train=diagram.pickTrain(ui.map,visibleStocks,e.clientX,e.clientY);
    if(train)openTrain(train.trainId);
  });
  ui["train-lookup"].onclick=()=>openTrain(detailTrain??picked?.id??visibleStocks.find(s=>s.cars)?.trainId??trains[0].id);
  ui["train-picker"].onchange=()=>openTrain(ui["train-picker"].value);
  ui["train-close"].onclick=closeTrain;
  listen(ui["shift-tabs"],"click",e=>{if(e.target.closest("button")?.dataset.shift)changeShift(e.target.closest("button").dataset.shift);});
  listen(ui["recap-tabs"],"click",e=>{
    const next=e.target.closest("button")?.dataset.table;
    if(next){tab=next;renderRecap();}
  });
  ui.play.onclick=()=>setPlay(!playing);
  ui.prev.onclick=()=>nextStep(-1);
  ui.next.onclick=()=>nextStep(1);
  ui.speed.onchange=()=>ui["custom-speed"].hidden=ui.speed.value!=="custom";
  ui.seek.oninput=()=>{setPlay(false);setTime(Number(ui.seek.value)/60);};
  ui["jump-form"].onsubmit=e=>{
    e.preventDefault();
    const [h,m]=ui["jump-time"].value.split(":").map(Number);
    if(Number.isFinite(h)&&Number.isFinite(m)){setPlay(false);setTime(h*60+m);}
  };
  ui.fullscreen.onclick=async()=>{
    const panel=ui["map-panel"];
    if(panel.classList.contains("is-full")){
      if(document.fullscreenElement===panel) await document.exitFullscreen();
      toggleFull(false);
    }else{
      toggleFull(true);
      try{if(document.fullscreenEnabled)await panel.requestFullscreen({navigationUI:"hide"});}catch{}
    }
  };
  listen(document,"fullscreenchange",()=>{if(!document.fullscreenElement)toggleFull(false);});
  listen(document,"keydown",e=>{
    if(e.key!=="Escape") return;
    if(!ui["train-detail"].hidden){closeTrain();return;}
    if(!document.fullscreenElement)toggleFull(false);
  });
  document.documentElement.dataset.kurangPlr=String(shortages.length);
  ui.scenario.value=scenario;
  ui.scenario.onchange=()=>{
    setPlay(false);
    clearNotices();
    listeners.abort();
    ui["train-detail"].hidden=true;
    startSimulation(ui.scenario.value,{shift,tab,tick});
  };
  changeShift(shift,false);
}
startSimulation("full");

// Jadwal lengkap dan jadwal dari tiga lembar dinas.
function readSchedules() {
  return {
    "full": {
      "source": "GAPEKA ANYAR EDIT 2026(1).xlsx",
      "rencana": {"trains":{"R54":{"jay":[16,19,9],"in":[22,30,9],"lm":[31,37,7],"out":[196,204,8],"dep":[281,284,8],"pickup":[179,189,0],"ll":[204,210,8],"l104":[240,243,6],"gandeng":[243,248,8],"early":15,"wait":0,"earlyReason":"Jalur 8 dipakai R3 (datang 04:47) · R130 berangkat 04:58","cepat":[]},"R130":{"jay":[90,93,9],"in":[98,106,9],"lm":[107,113,7],"out":[274,282,9],"dep":[298,301,9],"ld":[255,262,7],"early":9,"wait":0,"earlyReason":"LL kembali ke DAO 05:06","cepat":["ld"]},"R26":{"jay":[58,61,9],"in":[64,72,9],"lm":[73,79,7],"out":[300,306,8],"dep":[346,349,8],"pickup":[210,220,0],"ll":[306,311,8],"l104":[303,306,6],"gandeng":[311,316,8],"early":3,"wait":0,"earlyReason":"R64F keluar DAO 05:49 · Jalur 8 dipakai R64F (berangkat 06:09)","cepat":["out","ll"]},"R132":{"jay":[224,227,9],"in":[230,236,9],"lm":[237,243,7],"out":[337,345,9],"dep":[365,368,9],"ld":[314,324,7],"early":0,"wait":0,"cepat":["in"]},"R64F":{"jay":[176,179,9],"in":[184,192,9],"lm":[193,199,7],"out":[349,357,8],"dep":[369,372,8],"ld":[330,337,7],"early":16,"wait":0,"earlyReason":"Jalur 8 dipakai R20 (berangkat 06:44) · R57 masuk DAO 06:24","cepat":["ld"]},"R32":{"jay":[1339,1342,9],"in":[1345,1353,9],"lm":[1354,1360,7],"out":[390,396,9],"dep":[398,401,9],"ld":[330,337,7],"early":2,"wait":0,"earlyReason":"R125 datang 06:41 · Jalur 9 dipakai R125 (datang 06:44)","outReason":["R57 datang 06:18","Jalur 9 dipakai R57 (datang 06:21)"],"pasangan":"R64F","cepat":["out","ld"]},"R20":{"jay":[253,256,9],"in":[262,270,9],"lm":[271,277,7],"out":[372,378,8],"dep":[404,407,8],"ld":[354,361,7],"early":9,"wait":0,"earlyReason":"R125 masuk DAO 06:51 · R61 datang 06:54","outReason":["R57 masuk DAO 06:24"],"cepat":["out","ld"]},"R138":{"jay":[311,314,9],"in":[319,327,9],"lm":[334,340,7],"out":[417,423,9],"dep":[425,428,9],"ld":[367,377,7],"early":0,"wait":0,"outReason":["Jalur 9 dipakai R125 (datang 06:44)","R20 berangkat 06:44"],"cepat":["out"]},"R2":{"jay":[284,287,8],"in":[290,296,8],"lm":[297,303,7],"out":[432,438,9],"dep":[444,447,9],"early":0,"wait":0,"outReason":["Jalur 9 dipakai R138 (berangkat 07:05)","LD R56 masuk DAO 07:05"],"cepat":["in","out"]},"R16":{"jay":[236,239,9],"in":[245,253,9],"lm":[259,265,7],"out":[452,460,9],"dep":[473,476,9],"early":0,"wait":2,"waitReason":["Jalur 9 dipakai R49 (datang 03:47)"],"cepat":[]},"R56":{"jay":[378,381,9],"in":[384,390,9],"lm":[429,435,7],"out":[476,484,9],"dep":[501,504,9],"ld":[425,432,7],"early":0,"wait":1,"waitReason":["R20 keluar DAO 06:12"],"cepat":["in","ld"]},"R46":{"jay":[1285,1288,8],"in":[1291,1299,8],"lm":[1300,1306,7],"out":[491,499,8],"dep":[521,524,8],"ld":[470,480,7],"early":0,"wait":5,"waitReason":["R62 keluar DAO 21:16","LL kembali ke DAO 21:22"],"cepat":[]},"R126":{"jay":[401,404,9],"in":[411,417,9],"lm":[436,442,7],"out":[523,531,9],"dep":[552,555,9],"ld":[496,506,7],"early":0,"wait":5,"waitReason":["Jalur 9 dipakai R32 (berangkat 06:38)","R32 berangkat 06:38"],"cepat":["in"]},"R60":{"jay":[414,417,8],"in":[439,447,8],"lm":[448,454,7],"out":[587,595,9],"dep":[613,616,9],"ld":[556,566,7],"early":0,"wait":1,"waitReason":["R125 masuk DAO 06:51"],"cepat":[]},"R18":{"jay":[680,683,9],"in":[686,694,9],"lm":[695,701,7],"out":[923,929,8],"dep":[950,953,8],"pickup":[877,887,0],"ll":[929,934,8],"l104":[931,934,6],"gandeng":[934,939,8],"early":17,"wait":0,"earlyReason":"Jalur 8 dipakai R13 (datang 15:58) · R76F keluar DAO 16:08","cepat":["out","ll"]},"R76F":{"jay":[858,861,8],"in":[866,874,8],"lm":[875,881,7],"out":[968,974,8],"dep":[993,996,8],"ld":[945,952,7],"early":0,"wait":0,"cepat":["out","ld"]},"R52":{"jay":[584,587,8],"in":[595,603,8],"lm":[604,610,7],"out":[986,992,9],"dep":[1007,1010,9],"ld":[945,952,7],"early":0,"wait":0,"pasangan":"R76F","cepat":["out","ld"]},"R58":{"jay":[974,977,9],"in":[980,986,9],"lm":[992,998,7],"out":[1015,1021,9],"dep":[1090,1093,9],"pickup":[988,995,0],"ll":[1021,1026,9],"l104":[1023,1026,6],"gandeng":[1026,1031,9],"early":0,"wait":2,"waitReason":["R76F keluar DAO 16:08"],"cepat":["in","out","pickup","ll"]},"R50":{"jay":[845,848,9],"in":[853,861,9],"lm":[862,868,7],"out":[1098,1106,8],"dep":[1122,1125,8],"ld":[1077,1087,7],"early":5,"wait":0,"earlyReason":"R4 keluar DAO 18:44","cepat":[]},"R4":{"jay":[997,1000,8],"in":[1003,1011,8],"lm":[1012,1018,7],"out":[1124,1132,9],"dep":[1170,1173,9],"pickup":[1026,1036,0],"ll":[1132,1138,9],"l104":[1149,1152,6],"gandeng":[1152,1157,9],"early":0,"wait":0,"cepat":[]},"R14":{"jay":[955,958,8],"in":[962,968,8],"lm":[972,978,7],"out":[1178,1186,9],"dep":[1208,1211,9],"ld":[1145,1155,7],"early":0,"wait":1,"waitReason":["R137 masuk DAO 15:52"],"cepat":["in"]},"R42":{"jay":[942,945,9],"in":[952,958,9],"lm":[959,965,7],"out":[1211,1219,9],"dep":[1238,1241,9],"ld":[1187,1197,7],"early":0,"wait":5,"waitReason":["Jalur 9 dipakai R29 (datang 15:23)","R29 masuk DAO 15:34"],"cepat":["in"]},"R34":{"jay":[920,923,9],"in":[934,942,9],"lm":[949,955,7],"out":[1248,1256,9],"dep":[1273,1276,9],"ld":[1227,1237,7],"early":20,"wait":0,"earlyReason":"Jalur 9 dipakai R62 (berangkat 22:11) · R45 masuk DAO 21:31","cepat":[]},"R62":{"jay":[1105,1108,9],"in":[1112,1120,9],"lm":[1121,1127,7],"out":[1276,1282,9],"dep":[1331,1334,9],"pickup":[1232,1242,0],"ll":[1282,1288,9],"l104":[1290,1293,6],"gandeng":[1293,1298,9],"early":0,"wait":0,"cepat":["out"]},"R36":{"jay":[1142,1145,8],"in":[1150,1158,8],"lm":[1159,1165,7],"out":[1359,1367,9],"dep":[1382,1385,9],"ld":[1338,1348,7],"early":0,"wait":0,"cepat":[]},"R80F":{"jay":[572,575,9],"in":[579,587,9],"lm":[592,598,7],"out":[1366,1374,8],"dep":[1415,1418,8],"pickup":[1333,1343,0],"ll":[1374,1380,8],"l104":[1380,1383,6],"gandeng":[1383,1388,8],"early":0,"wait":0,"cepat":[]}},"pelanggaran":["R32 keluar DAO 8 mnt sebelum berangkat (aturan 20–30) karena R57 datang 06:18, Jalur 9 dipakai R57 (datang 06:21)","R20 keluar DAO 32 mnt sebelum berangkat (aturan 20–30) karena R57 masuk DAO 06:24","R138 keluar DAO 8 mnt sebelum berangkat (aturan 20–30) karena Jalur 9 dipakai R125 (datang 06:44), R20 berangkat 06:44","R2 keluar DAO 12 mnt sebelum berangkat (aturan 20–30) karena Jalur 9 dipakai R138 (berangkat 07:05), LD R56 masuk DAO 07:05","LM L57-2 menunggu 39 mnt di DAO (aturan maks 7)","LM L125-2 menunggu 19 mnt di DAO (aturan maks 7)"],"ringkasan":{"tepat":17,"awal":{"R54":15,"R130":9,"R26":3,"R64F":16,"R32":2,"R20":9,"R18":17,"R50":5,"R34":20},"tertahan":{"R15":2,"R57":1,"R45":5,"R125":5,"R61":1,"R55":2,"R13":1,"R137":5},"cepat":28,"pergerakan":175,"status":"OPTIMAL"}},
      "pilihan": {"early": {"R54": 5, "R20": 5, "R52": 2, "R138": 3, "R32": 1, "R18": 5, "R130": 5, "R36": 5, "R34": 5, "R50": 5}, "outTrack": {"R4": 8}, "inTrack": {}, "hold": {}},
      "trains": [
        {
          "id": "R54",
          "inbound": "R53",
          "name": "Brawijaya",
          "line": "JAKK-GMR",
          "loco": 239,
          "locoCode": "L54-1",
          "formerCode": "L53-2",
          "departure": 296,
          "arrival": 19,
          "mode": "LL",
          "formation": "8K1 1M 1P",
          "dao": 8,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 2
            }
          ],
          "arrivalSource": {
            "code": "R53",
            "arrival": 19,
            "name": "Dinas Rangkaian Brawijaya",
            "movement": "Langsung Mundur",
            "dao": "3",
            "peron": "LANGSIR R53 2 STAY",
            "row": 18,
            "shift": "Malam"
          }
        },
        {
          "id": "R130",
          "inbound": "R127",
          "name": "Papandayan",
          "line": "JAKK-GMR",
          "loco": 254,
          "locoCode": "L130-1",
          "formerCode": "L127-2",
          "departure": 307,
          "arrival": 93,
          "mode": "LD",
          "formation": "1Pano 3K1SS 4K3SS 1M1 1 P",
          "dao": 6,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 3
            }
          ],
          "arrivalSource": {
            "code": "R127",
            "arrival": 93,
            "name": "Dinas Rangkaian Pangandaran",
            "movement": "Langsung Mundur",
            "dao": "3",
            "peron": "LANGSIR R127 2 STAY",
            "row": 20,
            "shift": "Malam"
          }
        },
        {
          "id": "R26",
          "inbound": "R25",
          "name": "Muria",
          "line": "JAKK-GMR",
          "loco": 299,
          "locoCode": "L26-1",
          "formerCode": "L25-2",
          "departure": 349,
          "arrival": 61,
          "mode": "LL",
          "formation": "9K1 1M 1P",
          "dao": 3,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 4
            }
          ],
          "arrivalSource": {
            "code": "R25",
            "arrival": 61,
            "name": "Dinas Rangkaian Muria",
            "movement": "Langsung Mundur",
            "dao": "3",
            "peron": "LANGSIR R25 2 STAY",
            "row": 19,
            "shift": "Malam"
          }
        },
        {
          "id": "R132",
          "inbound": "R49",
          "name": "Parahyangan",
          "line": "JAKK-GMR",
          "loco": 309,
          "locoCode": "L132-1",
          "formerCode": "L49-2",
          "departure": 365,
          "arrival": 227,
          "mode": "LD",
          "formation": "1 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 PSS(NG)",
          "dao": 7,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 5
            }
          ],
          "arrivalSource": {
            "code": "R49",
            "arrival": 227,
            "name": "Dinas Rangkaian Gajayana",
            "movement": "Langsung Mundur",
            "dao": "1R54 1W 1Stay",
            "peron": "LANGSIR R49 2 STAY",
            "row": 21,
            "shift": "Malam"
          }
        },
        {
          "id": "R64F",
          "inbound": "R71F",
          "name": "Purwojaya",
          "line": "JAKK-GMR",
          "loco": 324,
          "locoCode": "L64F-1",
          "formerCode": "L71F-2",
          "departure": 385,
          "arrival": 179,
          "mode": "LD",
          "formation": "10 kereta",
          "dao": 4,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "code": "R64F",
              "row": 9,
              "shift": "Malam",
              "supplemental": true
            }
          ],
          "arrivalSource": {
            "code": "R71F",
            "arrival": 179,
            "name": "Purwojaya",
            "movement": "Langsir ke DAO",
            "dao": "Sesuai simulasi PLR",
            "peron": "Sesuai simulasi PLR",
            "row": 8,
            "shift": "Malam",
            "supplemental": true
          },
          "supplemental": true
        },
        {
          "id": "R32",
          "inbound": "R33",
          "name": "Taksaka",
          "line": "JAKK-GMR",
          "loco": 329,
          "locoCode": "L32-1",
          "formerCode": "L33-2",
          "departure": 400,
          "arrival": 1342,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 9,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 6
            }
          ],
          "arrivalSource": {
            "code": "R33",
            "arrival": 1342,
            "name": "Dinas Rangkaian Taksaka",
            "movement": "TERSERAH",
            "dao": "1W 1LL,1S.21",
            "peron": "1L36, 2R33, 1S.21R36",
            "row": 27,
            "shift": "Siang"
          }
        },
        {
          "id": "R20",
          "inbound": "R19",
          "name": "Muria",
          "line": "JAKK-GMR",
          "loco": 348,
          "locoCode": "L20-1",
          "formerCode": "L19-2",
          "departure": 413,
          "arrival": 256,
          "mode": "LD",
          "formation": "9 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 5,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 7
            }
          ],
          "arrivalSource": {
            "code": "R19",
            "arrival": 256,
            "name": "Dinas Rangkaian Muria",
            "movement": "Tunggu L130 Masuk DAO",
            "dao": "1R26, 2W",
            "peron": "1Lok R130, 2R19, 1stay",
            "row": 23,
            "shift": "Malam"
          }
        },
        {
          "id": "R138",
          "inbound": "R41",
          "name": "Parahyangan",
          "line": "JAKK-GMR",
          "loco": 365,
          "locoCode": "L138-1",
          "formerCode": "L41-2",
          "departure": 425,
          "arrival": 314,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P + 1 B/BP + 1Prio",
          "dao": 6,
          "arrivalCars": 12,
          "departureCars": 11,
          "requiredIn9": true,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 8
            }
          ],
          "arrivalSource": {
            "code": "R41",
            "arrival": 314,
            "name": "Dinas Rangkaian Pandalungan",
            "movement": "Langsung Mundur",
            "dao": "1LB41, 1W, 1B",
            "peron": "1L132, 2R41, L32, 1L20, 1S.21 R132 + L138",
            "row": 25,
            "shift": "Malam"
          }
        },
        {
          "id": "R2",
          "inbound": "R3",
          "name": "Anggrek",
          "line": "JAKK-GMR",
          "loco": 400,
          "locoCode": "L2-1",
          "formerCode": "L3-2",
          "departure": 444,
          "arrival": 287,
          "mode": "LD",
          "formation": "1 T + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 8,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 9
            },
            {
              "shift": "Pagi",
              "row": 2
            }
          ],
          "arrivalSource": {
            "code": "R3",
            "arrival": 287,
            "name": "Dinas Rangkaian Anggrek",
            "movement": "L Pulang Nunggu R26",
            "dao": "1R26,1S.21 1W",
            "peron": "2R3, 1CL, 1Gandeng Lok R26",
            "row": 24,
            "shift": "Malam"
          }
        },
        {
          "id": "R16",
          "inbound": "R15",
          "name": "Argo Dwipangga",
          "line": "JAKK-GMR",
          "loco": 400,
          "locoCode": "L16-1",
          "formerCode": "L15-2",
          "departure": 473,
          "arrival": 237,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 7 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 1,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 10
            },
            {
              "shift": "Pagi",
              "row": 3
            }
          ],
          "arrivalSource": {
            "code": "R15",
            "arrival": 237,
            "name": "Dinas Rangkaian Argo Dwipangga",
            "movement": "Tunggu R54 Mundur Dari DAO",
            "dao": "1R54 1W 1S.21",
            "peron": "1S.21 R54 Sekalian Lok R15, 1Gandeng Lok R54",
            "row": 22,
            "shift": "Malam"
          }
        },
        {
          "id": "R56",
          "inbound": "R57",
          "name": "Sembrani",
          "line": "JAKK-GMR",
          "loco": 424,
          "locoCode": "L56-1",
          "formerCode": "L57-2",
          "departure": 501,
          "arrival": 380,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 8 K1 SS + 1 M1 + 1 P",
          "dao": 3,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 4
            }
          ],
          "arrivalSource": {
            "code": "R57",
            "arrival": 380,
            "name": "Dinas Rangkaian Sembrani",
            "movement": "L Pulang Nunggu R32/ R32 Mundur Duluan",
            "dao": "1W, 2S.21",
            "peron": "1S.21 Dao, 1S.21Peron+Lok Dines 138, 2Lok Dines",
            "row": 26,
            "shift": "Malam"
          }
        },
        {
          "id": "R46",
          "inbound": "R45",
          "name": "Pandalungan",
          "line": "JAKK-GMR",
          "loco": 465,
          "locoCode": "L46-1",
          "formerCode": "L45-2",
          "departure": 521,
          "arrival": 1283,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P",
          "dao": 2,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 5
            }
          ],
          "arrivalSource": {
            "code": "R45",
            "arrival": 1283,
            "name": "Dinas Rangkaian Pandalungan",
            "movement": "BEBAS",
            "dao": "1W 1LL, 1S.21",
            "peron": "1L62, 2R45, 1S.21L62",
            "row": 26,
            "shift": "Siang"
          }
        },
        {
          "id": "R126",
          "inbound": "R125",
          "name": "Batavia",
          "line": "JAKK-GMR",
          "loco": 488,
          "locoCode": "L126-1",
          "formerCode": "L125-2",
          "departure": 552,
          "arrival": 399,
          "mode": "LD",
          "formation": "4 K1 SS(NG) + 4 K3 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 4,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 6
            }
          ],
          "arrivalSource": {
            "code": "R125",
            "arrival": 399,
            "name": "Dinas Rangkaian Batavia",
            "movement": "Tunggu L2/16, Keluar R20",
            "dao": "2W, 1S.21",
            "peron": "1L20, 1L138, 1S.21DAO, 1S.21 Peron",
            "row": 27,
            "shift": "Malam"
          }
        },
        {
          "id": "R60",
          "inbound": "R61",
          "name": "Manahan",
          "line": "JAKK-GMR",
          "loco": 548,
          "locoCode": "L60-1",
          "formerCode": "L61-2",
          "departure": 613,
          "arrival": 416,
          "mode": "LD",
          "formation": "1 K1 WIS + 8 K1 SS + 1 M1 + 1 P",
          "dao": 7,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 7
            }
          ],
          "arrivalSource": {
            "code": "R61",
            "arrival": 416,
            "name": "Dinas Rangkaian Manahan",
            "movement": "Tunggu R138 Mundur",
            "dao": "2W, 1S.21",
            "peron": "2R61 2Serah terima",
            "row": 28,
            "shift": "Malam"
          }
        },
        {
          "id": "R18",
          "inbound": "R17",
          "name": "Muria",
          "line": "JAKK-GMR",
          "loco": 914,
          "locoCode": "L18-1",
          "formerCode": "L17-2",
          "departure": 967,
          "arrival": 683,
          "mode": "LL",
          "formation": "9 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 4,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 2
            }
          ],
          "arrivalSource": {
            "code": "R17",
            "arrival": 683,
            "name": "Dinas Rangkaian Muria",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W 2NGANGA",
            "peron": "TERSERAH",
            "row": 15,
            "shift": "Pagi"
          }
        },
        {
          "id": "R76F",
          "inbound": "R75F",
          "name": "Borobudur",
          "line": "JAKK-GMR",
          "loco": 944,
          "locoCode": "L76F-1",
          "formerCode": "L75F-2",
          "departure": 993,
          "arrival": 861,
          "mode": "LD",
          "formation": "10 kereta",
          "dao": 8,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 8,
          "departureSources": [
            {
              "code": "R76F",
              "row": 20,
              "shift": "Siang",
              "supplemental": true
            }
          ],
          "arrivalSource": {
            "code": "R75F",
            "arrival": 861,
            "name": "Borobudur",
            "movement": "Langsir ke DAO",
            "dao": "Sesuai simulasi PLR",
            "peron": "Sesuai simulasi PLR",
            "row": 21,
            "shift": "Pagi",
            "supplemental": true
          },
          "supplemental": true
        },
        {
          "id": "R52",
          "inbound": "R51",
          "name": "Brawijaya",
          "line": "JAKK-GMR",
          "loco": 944,
          "locoCode": "L52-1",
          "formerCode": "L51-2",
          "departure": 1007,
          "arrival": 587,
          "mode": "LD",
          "formation": "8 K1 NI + 1 M1 + 1 P",
          "dao": 2,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 3
            }
          ],
          "arrivalSource": {
            "code": "R51",
            "arrival": 587,
            "name": "Dinas Rangkaian Brawijaya",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1 W 2NGANGA",
            "peron": "BEBAS",
            "row": 14,
            "shift": "Pagi"
          }
        },
        {
          "id": "R58",
          "inbound": "R55",
          "name": "Sembrani",
          "line": "JAKK-GMR",
          "loco": 1016,
          "locoCode": "L58-1",
          "formerCode": "L55-2",
          "departure": 1090,
          "arrival": 975,
          "mode": "LL",
          "formation": "2 K1 LUX 26 + 8 K1 SS + 1 M1 + 1 P",
          "dao": 3,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 4
            }
          ],
          "arrivalSource": {
            "code": "R55",
            "arrival": 975,
            "name": "Dinas Rangkaian Sembrani",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "2R55 2STAY",
            "row": 22,
            "shift": "Siang"
          }
        },
        {
          "id": "R50",
          "inbound": "R133",
          "name": "Gajayana",
          "line": "JAKK-GMR",
          "loco": 1070,
          "locoCode": "L50-1",
          "formerCode": "L133-2",
          "departure": 1127,
          "arrival": 848,
          "mode": "LD",
          "formation": "1 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 7,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 5
            }
          ],
          "arrivalSource": {
            "code": "R133",
            "arrival": 848,
            "name": "Dinas Rangkaian Parahyangan",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W 2NGANGA",
            "peron": "KUMAHA SIA",
            "row": 16,
            "shift": "Pagi"
          }
        },
        {
          "id": "R4",
          "inbound": "R1",
          "name": "Anggrek",
          "line": "JAKK-GMR",
          "loco": 1098,
          "locoCode": "L4-1",
          "formerCode": "L1-2",
          "departure": 1170,
          "arrival": 1000,
          "mode": "LL",
          "formation": "1 T + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 4,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 6
            }
          ],
          "arrivalSource": {
            "code": "R1",
            "arrival": 1000,
            "name": "Dinas Rangkaian Anggrek",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W1LL",
            "peron": "2R1 1L58 1STAY",
            "row": 23,
            "shift": "Siang"
          }
        },
        {
          "id": "R14",
          "inbound": "R13",
          "name": "Argo Lawu",
          "line": "JAKK-GMR",
          "loco": 1137,
          "locoCode": "L14-1",
          "formerCode": "L13-2",
          "departure": 1208,
          "arrival": 957,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 7 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 5,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 7
            }
          ],
          "arrivalSource": {
            "code": "R13",
            "arrival": 957,
            "name": "Dinas Rangkaian Argo Lawu",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "2R13 2STAY",
            "row": 21,
            "shift": "Siang"
          }
        },
        {
          "id": "R42",
          "inbound": "R137",
          "name": "Pandalungan",
          "line": "JAKK-GMR",
          "loco": 1179,
          "locoCode": "L42-1",
          "formerCode": "L137-2",
          "departure": 1238,
          "arrival": 940,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P + 1 B/BP",
          "dao": 6,
          "arrivalCars": 11,
          "departureCars": 12,
          "requiredIn9": false,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 8
            }
          ],
          "arrivalSource": {
            "code": "R137",
            "arrival": 940,
            "name": "Dinas Rangkaian Parahyangan",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "1L52, 2R137,1S.21 R52",
            "row": 20,
            "shift": "Siang"
          }
        },
        {
          "id": "R34",
          "inbound": "R29",
          "name": "Taksaka",
          "line": "JAKK-GMR",
          "loco": 1219,
          "locoCode": "L34-1",
          "formerCode": "L29-2",
          "departure": 1293,
          "arrival": 923,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 9,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 9
            }
          ],
          "arrivalSource": {
            "code": "R29",
            "arrival": 923,
            "name": "Dinas Rangkaian Taksaka",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "2R29 1L18 1R137",
            "row": 19,
            "shift": "Siang"
          }
        },
        {
          "id": "R62",
          "inbound": "R59",
          "name": "Manahan",
          "line": "JAKK-GMR",
          "loco": 1278,
          "locoCode": "L62-1",
          "formerCode": "L59-2",
          "departure": 1331,
          "arrival": 1108,
          "mode": "LL",
          "formation": "1 K1 WIS + 8 K1 SS + 1 M1 + 1 P",
          "dao": 8,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 10
            }
          ],
          "arrivalSource": {
            "code": "R59",
            "arrival": 1108,
            "name": "Dinas Rangkaian Manahan",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W, 1LL, 1S.21 R4",
            "peron": "1L4, 2R1, 1S.21 R4",
            "row": 24,
            "shift": "Siang"
          }
        },
        {
          "id": "R36",
          "inbound": "R35",
          "name": "Argo Anjasmoro",
          "line": "JAKK-GMR",
          "loco": 1331,
          "locoCode": "L36-1",
          "formerCode": "L35-2",
          "departure": 1382,
          "arrival": 1145,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P",
          "dao": 3,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 11
            }
          ],
          "arrivalSource": {
            "code": "R35",
            "arrival": 1145,
            "name": "Dinas Rangkaian Argo Anjasmoro",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W, 1LL, 1B",
            "peron": "1L14, 2R35, 1STAY",
            "row": 25,
            "shift": "Siang"
          }
        },
        {
          "id": "R80F",
          "inbound": "R79F",
          "name": "Gajayana Fakultatif",
          "line": "JAKK-GMR",
          "loco": 1361,
          "locoCode": "L80F-1",
          "formerCode": "L79F-2",
          "departure": 1415,
          "arrival": 575,
          "mode": "LL",
          "formation": "10 kereta",
          "dao": 1,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "code": "R80F",
              "row": 30,
              "shift": "Malam",
              "supplemental": true
            }
          ],
          "arrivalSource": {
            "code": "R79F",
            "arrival": 575,
            "name": "Gajayana Fakultatif",
            "movement": "Langsir ke DAO",
            "dao": "Sesuai simulasi PLR",
            "peron": "Sesuai simulasi PLR",
            "row": 17,
            "shift": "Pagi",
            "supplemental": true
          },
          "supplemental": true
        }
      ],
      "shifts": [
        {
          "name": "Malam",
          "sheet": "DINAS MALAM",
          "arrivals": [
            {
              "code": "R53",
              "arrival": 19,
              "name": "Dinas Rangkaian Brawijaya",
              "movement": "Langsung Mundur",
              "dao": "3",
              "peron": "LANGSIR R53 2 STAY",
              "row": 18,
              "shift": "Malam"
            },
            {
              "code": "R25",
              "arrival": 61,
              "name": "Dinas Rangkaian Muria",
              "movement": "Langsung Mundur",
              "dao": "3",
              "peron": "LANGSIR R25 2 STAY",
              "row": 19,
              "shift": "Malam"
            },
            {
              "code": "R127",
              "arrival": 93,
              "name": "Dinas Rangkaian Pangandaran",
              "movement": "Langsung Mundur",
              "dao": "3",
              "peron": "LANGSIR R127 2 STAY",
              "row": 20,
              "shift": "Malam"
            },
            {
              "code": "R71F",
              "arrival": 179,
              "name": "Purwojaya",
              "movement": "Langsir ke DAO",
              "dao": "Sesuai simulasi PLR",
              "peron": "Sesuai simulasi PLR",
              "row": 8,
              "shift": "Malam",
              "supplemental": true
            },
            {
              "code": "R49",
              "arrival": 227,
              "name": "Dinas Rangkaian Gajayana",
              "movement": "Langsung Mundur",
              "dao": "1R54 1W 1Stay",
              "peron": "LANGSIR R49 2 STAY",
              "row": 21,
              "shift": "Malam"
            },
            {
              "code": "R15",
              "arrival": 237,
              "name": "Dinas Rangkaian Argo Dwipangga",
              "movement": "Tunggu R54 Mundur Dari DAO",
              "dao": "1R54 1W 1S.21",
              "peron": "1S.21 R54 Sekalian Lok R15, 1Gandeng Lok R54",
              "row": 22,
              "shift": "Malam"
            },
            {
              "code": "R19",
              "arrival": 256,
              "name": "Dinas Rangkaian Muria",
              "movement": "Tunggu L130 Masuk DAO",
              "dao": "1R26, 2W",
              "peron": "1Lok R130, 2R19, 1stay",
              "row": 23,
              "shift": "Malam"
            },
            {
              "code": "R3",
              "arrival": 287,
              "name": "Dinas Rangkaian Anggrek",
              "movement": "L Pulang Nunggu R26",
              "dao": "1R26,1S.21 1W",
              "peron": "2R3, 1CL, 1Gandeng Lok R26",
              "row": 24,
              "shift": "Malam"
            },
            {
              "code": "R41",
              "arrival": 314,
              "name": "Dinas Rangkaian Pandalungan",
              "movement": "Langsung Mundur",
              "dao": "1LB41, 1W, 1B",
              "peron": "1L132, 2R41, L32, 1L20, 1S.21 R132 + L138",
              "row": 25,
              "shift": "Malam"
            },
            {
              "code": "R57",
              "arrival": 380,
              "name": "Dinas Rangkaian Sembrani",
              "movement": "L Pulang Nunggu R32/ R32 Mundur Duluan",
              "dao": "1W, 2S.21",
              "peron": "1S.21 Dao, 1S.21Peron+Lok Dines 138, 2Lok Dines",
              "row": 26,
              "shift": "Malam"
            },
            {
              "code": "R125",
              "arrival": 399,
              "name": "Dinas Rangkaian Batavia",
              "movement": "Tunggu L2/16, Keluar R20",
              "dao": "2W, 1S.21",
              "peron": "1L20, 1L138, 1S.21DAO, 1S.21 Peron",
              "row": 27,
              "shift": "Malam"
            },
            {
              "code": "R61",
              "arrival": 416,
              "name": "Dinas Rangkaian Manahan",
              "movement": "Tunggu R138 Mundur",
              "dao": "2W, 1S.21",
              "peron": "2R61 2Serah terima",
              "row": 28,
              "shift": "Malam"
            }
          ],
          "departures": [
            {
              "code": "R54",
              "row": 2
            },
            {
              "code": "R130",
              "row": 3
            },
            {
              "code": "R26",
              "row": 4
            },
            {
              "code": "R132",
              "row": 5
            },
            {
              "code": "R64F",
              "row": 9,
              "shift": "Malam",
              "supplemental": true
            },
            {
              "code": "R32",
              "row": 6
            },
            {
              "code": "R20",
              "row": 7
            },
            {
              "code": "R138",
              "row": 8
            },
            {
              "code": "R2",
              "row": 9
            },
            {
              "code": "R16",
              "row": 10
            },
            {
              "code": "R80F",
              "row": 30,
              "shift": "Malam",
              "supplemental": true
            }
          ],
          "notes": []
        },
        {
          "name": "Pagi",
          "sheet": "DINAS PAGI",
          "arrivals": [
            {
              "code": "R79F",
              "arrival": 575,
              "name": "Gajayana Fakultatif",
              "movement": "Langsir ke DAO",
              "dao": "Sesuai simulasi PLR",
              "peron": "Sesuai simulasi PLR",
              "row": 17,
              "shift": "Pagi",
              "supplemental": true
            },
            {
              "code": "R51",
              "arrival": 587,
              "name": "Dinas Rangkaian Brawijaya",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1 W 2NGANGA",
              "peron": "BEBAS",
              "row": 14,
              "shift": "Pagi"
            },
            {
              "code": "R17",
              "arrival": 683,
              "name": "Dinas Rangkaian Muria",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W 2NGANGA",
              "peron": "TERSERAH",
              "row": 15,
              "shift": "Pagi"
            },
            {
              "code": "R133",
              "arrival": 848,
              "name": "Dinas Rangkaian Parahyangan",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W 2NGANGA",
              "peron": "KUMAHA SIA",
              "row": 16,
              "shift": "Pagi"
            },
            {
              "code": "R75F",
              "arrival": 861,
              "name": "Borobudur",
              "movement": "Langsir ke DAO",
              "dao": "Sesuai simulasi PLR",
              "peron": "Sesuai simulasi PLR",
              "row": 21,
              "shift": "Pagi",
              "supplemental": true
            }
          ],
          "departures": [
            {
              "code": "R2",
              "row": 2
            },
            {
              "code": "R16",
              "row": 3
            },
            {
              "code": "R56",
              "row": 4
            },
            {
              "code": "R46",
              "row": 5
            },
            {
              "code": "R126",
              "row": 6
            },
            {
              "code": "R60",
              "row": 7
            }
          ],
          "notes": [
            {
              "text": "APLUSAN DINAS MALAM KE PAGI LANGSUNG BAWA L2 SAMA L16",
              "row": 18
            },
            {
              "text": "APLUSAN DINAS PAGI KE SIANG, DINES PAGI DORONG R18 KE PERON",
              "row": 19
            }
          ]
        },
        {
          "name": "Siang",
          "sheet": "DINAS SIANG",
          "arrivals": [
            {
              "code": "R29",
              "arrival": 923,
              "name": "Dinas Rangkaian Taksaka",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "2R29 1L18 1R137",
              "row": 19,
              "shift": "Siang"
            },
            {
              "code": "R137",
              "arrival": 940,
              "name": "Dinas Rangkaian Parahyangan",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "1L52, 2R137,1S.21 R52",
              "row": 20,
              "shift": "Siang"
            },
            {
              "code": "R13",
              "arrival": 957,
              "name": "Dinas Rangkaian Argo Lawu",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "2R13 2STAY",
              "row": 21,
              "shift": "Siang"
            },
            {
              "code": "R55",
              "arrival": 975,
              "name": "Dinas Rangkaian Sembrani",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "2R55 2STAY",
              "row": 22,
              "shift": "Siang"
            },
            {
              "code": "R1",
              "arrival": 1000,
              "name": "Dinas Rangkaian Anggrek",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W1LL",
              "peron": "2R1 1L58 1STAY",
              "row": 23,
              "shift": "Siang"
            },
            {
              "code": "R59",
              "arrival": 1108,
              "name": "Dinas Rangkaian Manahan",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W, 1LL, 1S.21 R4",
              "peron": "1L4, 2R1, 1S.21 R4",
              "row": 24,
              "shift": "Siang"
            },
            {
              "code": "R35",
              "arrival": 1145,
              "name": "Dinas Rangkaian Argo Anjasmoro",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W, 1LL, 1B",
              "peron": "1L14, 2R35, 1STAY",
              "row": 25,
              "shift": "Siang"
            },
            {
              "code": "R45",
              "arrival": 1283,
              "name": "Dinas Rangkaian Pandalungan",
              "movement": "BEBAS",
              "dao": "1W 1LL, 1S.21",
              "peron": "1L62, 2R45, 1S.21L62",
              "row": 26,
              "shift": "Siang"
            },
            {
              "code": "R33",
              "arrival": 1342,
              "name": "Dinas Rangkaian Taksaka",
              "movement": "TERSERAH",
              "dao": "1W 1LL,1S.21",
              "peron": "1L36, 2R33, 1S.21R36",
              "row": 27,
              "shift": "Siang"
            }
          ],
          "departures": [
            {
              "code": "R18",
              "row": 2
            },
            {
              "code": "R76F",
              "row": 20,
              "shift": "Siang",
              "supplemental": true
            },
            {
              "code": "R52",
              "row": 3
            },
            {
              "code": "R58",
              "row": 4
            },
            {
              "code": "R50",
              "row": 5
            },
            {
              "code": "R4",
              "row": 6
            },
            {
              "code": "R14",
              "row": 7
            },
            {
              "code": "R42",
              "row": 8
            },
            {
              "code": "R34",
              "row": 9
            },
            {
              "code": "R62",
              "row": 10
            },
            {
              "code": "R36",
              "row": 11
            }
          ],
          "notes": [
            {
              "text": "APLUSAN SIANG KE MALAM DORONGIN R62 KE PERON",
              "row": 29
            }
          ]
        }
      ],
      "waitReasons": {
        "R20": [
          "LD R130 masuk DAO"
        ],
        "R16": [
          "LL kembali setelah R54"
        ]
      },
      "targets": {
        "dwell": [
          3,
          5
        ],
        "llRelease": 60,
        "llBrakes": 20
      },
      "llReleaseReasons": {
        "R26": [
          "Jalur 8 dipakai R54"
        ],
        "R52": [
          "Jalur 9 dipakai R13",
          "Jalur 9 dipakai R55"
        ],
        "R4": [
          "R59 masuk DAO"
        ],
        "R62": [
          "Jalur 9 dipakai R34"
        ],
        "R36": [
          "Jalur 9 dipakai R62",
          "Jalur 9 dipakai R33"
        ],
        "R80F": [
          "LL kembali setelah R36",
          "LD gandeng R36"
        ]
      },
      "plan": {
        "R54": {
          "jay": {
            "start": 16,
            "end": 19,
            "track": 9
          },
          "in": {
            "start": 22,
            "end": 26,
            "track": 9
          },
          "lm": {
            "start": 27,
            "end": 30,
            "track": 7
          },
          "out": {
            "start": 235,
            "end": 240,
            "track": 8
          },
          "ll": {
            "start": 240,
            "end": 243,
            "track": 0
          },
          "pickup": {
            "start": 223,
            "end": 226,
            "track": 0
          },
          "l104": {
            "start": 241,
            "end": 244,
            "track": 6
          },
          "gandeng": {
            "start": 244,
            "end": 248,
            "track": 8,
            "waitReason": ""
          }
        },
        "R130": {
          "jay": {
            "start": 90,
            "end": 93,
            "track": 9
          },
          "in": {
            "start": 96,
            "end": 100,
            "track": 9
          },
          "lm": {
            "start": 101,
            "end": 104,
            "track": 7
          },
          "out": {
            "start": 299,
            "end": 304,
            "track": 9
          },
          "ld": {
            "start": 258,
            "end": 262,
            "track": 7
          }
        },
        "R26": {
          "jay": {
            "start": 58,
            "end": 61,
            "track": 9
          },
          "in": {
            "start": 64,
            "end": 68,
            "track": 9
          },
          "lm": {
            "start": 69,
            "end": 72,
            "track": 7
          },
          "out": {
            "start": 322,
            "end": 327,
            "track": 8
          },
          "ll": {
            "start": 327,
            "end": 330,
            "track": 0
          },
          "pickup": {
            "start": 276,
            "end": 279,
            "track": 0
          },
          "l104": {
            "start": 301,
            "end": 304,
            "track": 6
          },
          "gandeng": {
            "start": 328,
            "end": 332,
            "track": 8,
            "waitReason": "Menunggu L32-1 datang"
          }
        },
        "R132": {
          "jay": {
            "start": 224,
            "end": 227,
            "track": 8
          },
          "in": {
            "start": 230,
            "end": 234,
            "track": 8
          },
          "lm": {
            "start": 247,
            "end": 250,
            "track": 7
          },
          "out": {
            "start": 344,
            "end": 349,
            "track": 9
          },
          "ld": {
            "start": 314,
            "end": 318,
            "track": 7
          }
        },
        "R64F": {
          "jay": {
            "start": 176,
            "end": 179,
            "track": 9
          },
          "in": {
            "start": 182,
            "end": 186,
            "track": 9
          },
          "lm": {
            "start": 187,
            "end": 190,
            "track": 7
          },
          "out": {
            "start": 368,
            "end": 373,
            "track": 8
          },
          "ld": {
            "start": 340,
            "end": 344,
            "track": 7
          }
        },
        "R32": {
          "jay": {
            "start": 1339,
            "end": 1342,
            "track": 9
          },
          "in": {
            "start": 1345,
            "end": 1349,
            "track": 9
          },
          "lm": {
            "start": 1360,
            "end": 1363,
            "track": 7
          },
          "out": {
            "start": 393,
            "end": 398,
            "track": 9
          },
          "ld": {
            "start": 336,
            "end": 340,
            "track": 7
          }
        },
        "R20": {
          "jay": {
            "start": 253,
            "end": 256,
            "track": 9
          },
          "in": {
            "start": 262,
            "end": 266,
            "track": 9
          },
          "lm": {
            "start": 267,
            "end": 270,
            "track": 7
          },
          "out": {
            "start": 388,
            "end": 393,
            "track": 8
          },
          "ld": {
            "start": 352,
            "end": 356,
            "track": 7
          }
        },
        "R138": {
          "jay": {
            "start": 311,
            "end": 314,
            "track": 9
          },
          "in": {
            "start": 318,
            "end": 322,
            "track": 9
          },
          "lm": {
            "start": 333,
            "end": 336,
            "track": 7
          },
          "out": {
            "start": 416,
            "end": 421,
            "track": 8
          },
          "ld": {
            "start": 373,
            "end": 377,
            "track": 7
          }
        },
        "R2": {
          "jay": {
            "start": 284,
            "end": 287,
            "track": 9
          },
          "in": {
            "start": 292,
            "end": 296,
            "track": 9
          },
          "lm": {
            "start": 304,
            "end": 307,
            "track": 7
          },
          "out": {
            "start": 434,
            "end": 439,
            "track": 8
          }
        },
        "R16": {
          "jay": {
            "start": 234,
            "end": 237,
            "track": 9
          },
          "in": {
            "start": 243,
            "end": 247,
            "track": 9
          },
          "lm": {
            "start": 250,
            "end": 253,
            "track": 7
          },
          "out": {
            "start": 447,
            "end": 452,
            "track": 9
          }
        },
        "R56": {
          "jay": {
            "start": 377,
            "end": 380,
            "track": 9
          },
          "in": {
            "start": 384,
            "end": 388,
            "track": 9
          },
          "lm": {
            "start": 398,
            "end": 401,
            "track": 7
          },
          "out": {
            "start": 476,
            "end": 481,
            "track": 9
          },
          "ld": {
            "start": 439,
            "end": 443,
            "track": 7
          }
        },
        "R46": {
          "jay": {
            "start": 1280,
            "end": 1283,
            "track": 8
          },
          "in": {
            "start": 1286,
            "end": 1290,
            "track": 8
          },
          "lm": {
            "start": 1291,
            "end": 1294,
            "track": 7
          },
          "out": {
            "start": 496,
            "end": 501,
            "track": 8
          },
          "ld": {
            "start": 469,
            "end": 473,
            "track": 7
          }
        },
        "R126": {
          "jay": {
            "start": 403,
            "end": 406,
            "track": 9
          },
          "in": {
            "start": 411,
            "end": 415,
            "track": 9
          },
          "lm": {
            "start": 428,
            "end": 431,
            "track": 7
          },
          "out": {
            "start": 524,
            "end": 529,
            "track": 9
          },
          "ld": {
            "start": 492,
            "end": 496,
            "track": 7
          }
        },
        "R60": {
          "jay": {
            "start": 416,
            "end": 419,
            "track": 9
          },
          "in": {
            "start": 423,
            "end": 427,
            "track": 9
          },
          "lm": {
            "start": 431,
            "end": 434,
            "track": 7
          },
          "out": {
            "start": 598,
            "end": 603,
            "track": 9
          },
          "ld": {
            "start": 555,
            "end": 559,
            "track": 7
          }
        },
        "R18": {
          "jay": {
            "start": 680,
            "end": 683,
            "track": 9
          },
          "in": {
            "start": 686,
            "end": 690,
            "track": 9
          },
          "lm": {
            "start": 691,
            "end": 694,
            "track": 7
          },
          "out": {
            "start": 907,
            "end": 912,
            "track": 8
          },
          "ll": {
            "start": 912,
            "end": 915,
            "track": 0
          },
          "pickup": {
            "start": 894,
            "end": 897,
            "track": 0
          },
          "l104": {
            "start": 916,
            "end": 919,
            "track": 6
          },
          "gandeng": {
            "start": 919,
            "end": 923,
            "track": 8,
            "waitReason": ""
          }
        },
        "R76F": {
          "jay": {
            "start": 858,
            "end": 861,
            "track": 8
          },
          "in": {
            "start": 864,
            "end": 868,
            "track": 8
          },
          "lm": {
            "start": 869,
            "end": 872,
            "track": 7
          },
          "out": {
            "start": 973,
            "end": 978,
            "track": 8
          },
          "ld": {
            "start": 948,
            "end": 952,
            "track": 7
          }
        },
        "R52": {
          "jay": {
            "start": 584,
            "end": 587,
            "track": 8
          },
          "in": {
            "start": 590,
            "end": 594,
            "track": 8
          },
          "lm": {
            "start": 595,
            "end": 598,
            "track": 7
          },
          "out": {
            "start": 982,
            "end": 987,
            "track": 9
          },
          "ll": {
            "start": 987,
            "end": 990,
            "track": 0
          },
          "pickup": {
            "start": 915,
            "end": 918,
            "track": 0
          },
          "l104": {
            "start": 950,
            "end": 953,
            "track": 6
          },
          "gandeng": {
            "start": 987,
            "end": 991,
            "track": 9,
            "waitReason": ""
          }
        },
        "R58": {
          "jay": {
            "start": 972,
            "end": 975,
            "track": 9
          },
          "in": {
            "start": 978,
            "end": 982,
            "track": 9
          },
          "lm": {
            "start": 1013,
            "end": 1016,
            "track": 7
          },
          "out": {
            "start": 1030,
            "end": 1035,
            "track": 9
          },
          "ll": {
            "start": 1035,
            "end": 1038,
            "track": 0
          },
          "pickup": {
            "start": 1017,
            "end": 1020,
            "track": 0
          },
          "l104": {
            "start": 1018,
            "end": 1021,
            "track": 6
          },
          "gandeng": {
            "start": 1035,
            "end": 1039,
            "track": 9,
            "waitReason": ""
          }
        },
        "R50": {
          "jay": {
            "start": 845,
            "end": 848,
            "track": 9
          },
          "in": {
            "start": 853,
            "end": 857,
            "track": 9
          },
          "lm": {
            "start": 861,
            "end": 864,
            "track": 7
          },
          "out": {
            "start": 1099,
            "end": 1104,
            "track": 8
          },
          "ld": {
            "start": 1074,
            "end": 1078,
            "track": 7
          }
        },
        "R4": {
          "jay": {
            "start": 997,
            "end": 1000,
            "track": 8
          },
          "in": {
            "start": 1005,
            "end": 1009,
            "track": 8
          },
          "lm": {
            "start": 1010,
            "end": 1013,
            "track": 7
          },
          "out": {
            "start": 1119,
            "end": 1124,
            "track": 9
          },
          "ll": {
            "start": 1124,
            "end": 1127,
            "track": 0
          },
          "pickup": {
            "start": 1096,
            "end": 1099,
            "track": 0
          },
          "l104": {
            "start": 1100,
            "end": 1103,
            "track": 6
          },
          "gandeng": {
            "start": 1127,
            "end": 1131,
            "track": 9,
            "waitReason": "Menunggu R50 berangkat"
          }
        },
        "R14": {
          "jay": {
            "start": 954,
            "end": 957,
            "track": 9
          },
          "in": {
            "start": 962,
            "end": 966,
            "track": 9
          },
          "lm": {
            "start": 1000,
            "end": 1003,
            "track": 7
          },
          "out": {
            "start": 1180,
            "end": 1185,
            "track": 9
          },
          "ld": {
            "start": 1145,
            "end": 1149,
            "track": 7
          }
        },
        "R42": {
          "jay": {
            "start": 937,
            "end": 940,
            "track": 9
          },
          "in": {
            "start": 944,
            "end": 948,
            "track": 9
          },
          "lm": {
            "start": 957,
            "end": 960,
            "track": 7
          },
          "out": {
            "start": 1211,
            "end": 1216,
            "track": 9
          },
          "ld": {
            "start": 1185,
            "end": 1189,
            "track": 7
          }
        },
        "R34": {
          "jay": {
            "start": 920,
            "end": 923,
            "track": 9
          },
          "in": {
            "start": 927,
            "end": 931,
            "track": 9
          },
          "lm": {
            "start": 932,
            "end": 935,
            "track": 7
          },
          "out": {
            "start": 1265,
            "end": 1270,
            "track": 9
          },
          "ld": {
            "start": 1223,
            "end": 1227,
            "track": 7
          }
        },
        "R62": {
          "jay": {
            "start": 1105,
            "end": 1108,
            "track": 9
          },
          "in": {
            "start": 1111,
            "end": 1115,
            "track": 9
          },
          "lm": {
            "start": 1116,
            "end": 1119,
            "track": 7
          },
          "out": {
            "start": 1296,
            "end": 1301,
            "track": 9
          },
          "ll": {
            "start": 1301,
            "end": 1304,
            "track": 0
          },
          "pickup": {
            "start": 1258,
            "end": 1261,
            "track": 0
          },
          "l104": {
            "start": 1280,
            "end": 1283,
            "track": 6
          },
          "gandeng": {
            "start": 1301,
            "end": 1305,
            "track": 9,
            "waitReason": ""
          }
        },
        "R36": {
          "jay": {
            "start": 1142,
            "end": 1145,
            "track": 8
          },
          "in": {
            "start": 1149,
            "end": 1153,
            "track": 8
          },
          "lm": {
            "start": 1154,
            "end": 1157,
            "track": 7
          },
          "out": {
            "start": 1349,
            "end": 1354,
            "track": 9
          },
          "ll": {
            "start": 1354,
            "end": 1357,
            "track": 0
          },
          "pickup": {
            "start": 1304,
            "end": 1307,
            "track": 0
          },
          "l104": {
            "start": 1333,
            "end": 1336,
            "track": 6
          },
          "gandeng": {
            "start": 1354,
            "end": 1358,
            "track": 9,
            "waitReason": ""
          }
        },
        "R80F": {
          "jay": {
            "start": 572,
            "end": 575,
            "track": 9
          },
          "in": {
            "start": 580,
            "end": 584,
            "track": 9
          },
          "lm": {
            "start": 587,
            "end": 590,
            "track": 7
          },
          "out": {
            "start": 1363,
            "end": 1368,
            "track": 8
          },
          "ll": {
            "start": 1368,
            "end": 1371,
            "track": 0
          },
          "pickup": {
            "start": 1357,
            "end": 1360,
            "track": 0
          },
          "l104": {
            "start": 1363,
            "end": 1366,
            "track": 6
          },
          "gandeng": {
            "start": 1368,
            "end": 1372,
            "track": 8,
            "waitReason": ""
          }
        },
        "PAGI": {
          "combiner": {
            "start": 406,
            "end": 411,
            "track": 7
          }
        }
      },
      "berths": {
        "R130": 0,
        "R132": 0,
        "R64F": 0,
        "R32": 1,
        "R20": 0,
        "R138": 0,
        "R2": 0,
        "R56": 0,
        "R46": 0,
        "R126": 0,
        "R60": 0,
        "R76F": 0,
        "R50": 0,
        "R14": 0,
        "R42": 0,
        "R34": 0
      }
    },
    "regular": {
      "source": "GAPEKA ANYAR EDIT 2026(1).xlsx",
      "rencana": {"trains":{"R26":{"jay":[58,61,9],"in":[64,72,9],"lm":[73,79,7],"out":[300,306,8],"dep":[346,349,8],"pickup":[210,220,0],"ll":[306,311,8],"l104":[303,306,6],"gandeng":[311,316,8],"early":3,"wait":0,"earlyReason":"Langsir keluar DAO terhalang LM L41-2 keluar DAO 05:34 · R41 masuk DAO 05:19","cepat":["out","ll"]},"R138":{"jay":[311,314,9],"in":[319,327,9],"lm":[334,340,7],"out":[417,423,9],"dep":[425,428,9],"ld":[367,377,7],"early":0,"wait":0,"outReason":["Jalur 9 dipakai R125 (datang 06:44)","R20 berangkat 06:44"],"cepat":["out"]},"R130":{"jay":[90,93,9],"in":[98,106,9],"lm":[107,113,7],"out":[274,282,9],"dep":[298,301,9],"ld":[255,262,7],"early":9,"wait":0,"earlyReason":"LL kembali ke DAO 05:06","cepat":["ld"]},"R56":{"jay":[378,381,9],"in":[384,390,9],"lm":[429,435,7],"out":[476,484,9],"dep":[501,504,9],"ld":[425,432,7],"early":0,"wait":1,"waitReason":["R20 keluar DAO 06:12"],"cepat":["in","ld"]},"R126":{"jay":[401,404,9],"in":[411,417,9],"lm":[436,442,7],"out":[523,531,9],"dep":[552,555,9],"ld":[496,506,7],"early":0,"wait":5,"waitReason":["Jalur 9 dipakai R32 (berangkat 06:38)","R32 berangkat 06:38"],"cepat":["in"]},"R62":{"jay":[1105,1108,9],"in":[1112,1120,9],"lm":[1121,1127,7],"out":[1276,1282,9],"dep":[1331,1334,9],"pickup":[1232,1242,0],"ll":[1282,1288,9],"l104":[1290,1293,6],"gandeng":[1293,1298,9],"early":0,"wait":0,"cepat":["out"]},"R34":{"jay":[920,923,9],"in":[934,942,9],"lm":[949,955,7],"out":[1248,1256,9],"dep":[1273,1276,9],"ld":[1227,1237,7],"early":20,"wait":0,"earlyReason":"Jalur 9 dipakai R62 (berangkat 22:11) · R45 masuk DAO 21:31","cepat":[]},"R58":{"jay":[974,977,9],"in":[980,986,9],"lm":[992,998,7],"out":[1015,1021,9],"dep":[1090,1093,9],"pickup":[988,995,0],"ll":[1021,1026,9],"l104":[1023,1026,6],"gandeng":[1026,1031,9],"early":0,"wait":2,"waitReason":[],"cepat":["in","out","pickup","ll"]},"R16":{"jay":[236,239,9],"in":[245,253,9],"lm":[259,265,7],"out":[452,460,9],"dep":[473,476,9],"early":0,"wait":2,"waitReason":["Jalur 9 dipakai R49 (datang 03:47)"],"cepat":[]},"R14":{"jay":[955,958,8],"in":[962,968,8],"lm":[972,978,7],"out":[1178,1186,9],"dep":[1208,1211,9],"ld":[1145,1155,7],"early":0,"wait":1,"waitReason":["R137 masuk DAO 15:52"],"cepat":["in"]},"R54":{"jay":[16,19,9],"in":[22,30,9],"lm":[31,37,7],"out":[196,204,8],"dep":[281,284,8],"pickup":[179,189,0],"ll":[204,210,8],"l104":[240,243,6],"gandeng":[243,248,8],"early":15,"wait":0,"earlyReason":"Jalur 8 dipakai R3 (datang 04:47) · R130 berangkat 04:58","cepat":[]},"R18":{"jay":[680,683,9],"in":[686,694,9],"lm":[695,701,7],"out":[923,929,8],"dep":[950,953,8],"pickup":[877,887,0],"ll":[929,934,8],"l104":[931,934,6],"gandeng":[934,939,8],"early":17,"wait":0,"earlyReason":"Jalur 8 dipakai R13 (datang 15:58)","cepat":["out","ll"]},"R4":{"jay":[997,1000,8],"in":[1003,1011,8],"lm":[1012,1018,7],"out":[1124,1132,9],"dep":[1170,1173,9],"pickup":[1026,1036,0],"ll":[1132,1138,9],"l104":[1149,1152,6],"gandeng":[1152,1157,9],"early":0,"wait":0,"cepat":[]},"R50":{"jay":[845,848,9],"in":[853,861,9],"lm":[862,868,7],"out":[1098,1106,8],"dep":[1122,1125,8],"ld":[1077,1087,7],"early":5,"wait":0,"earlyReason":"R4 keluar DAO 18:44","cepat":[]},"R42":{"jay":[942,945,9],"in":[952,958,9],"lm":[959,965,7],"out":[1211,1219,9],"dep":[1238,1241,9],"ld":[1187,1197,7],"early":0,"wait":5,"waitReason":["Jalur 9 dipakai R29 (datang 15:23)","R29 masuk DAO 15:34"],"cepat":["in"]},"R60":{"jay":[414,417,8],"in":[439,447,8],"lm":[448,454,7],"out":[587,595,9],"dep":[613,616,9],"ld":[556,566,7],"early":0,"wait":1,"waitReason":["R125 masuk DAO 06:51"],"cepat":[]},"R52":{"jay":[584,587,8],"in":[595,603,8],"lm":[604,610,7],"out":[986,992,9],"dep":[1007,1010,9],"ld":[945,952,7],"early":0,"wait":0,"cepat":["out","ld"]},"R2":{"jay":[284,287,8],"in":[290,296,8],"lm":[297,303,7],"out":[432,438,9],"dep":[444,447,9],"early":0,"wait":0,"outReason":["Jalur 9 dipakai R138 (berangkat 07:05)","LD R56 masuk DAO 07:05"],"cepat":["in","out"]},"R132":{"jay":[224,227,9],"in":[230,236,9],"lm":[237,243,7],"out":[337,345,9],"dep":[365,368,9],"ld":[314,324,7],"early":0,"wait":0,"cepat":["in"]},"R32":{"jay":[1339,1342,9],"in":[1345,1353,9],"lm":[1354,1360,7],"out":[390,396,9],"dep":[398,401,9],"ld":[330,337,7],"early":2,"wait":0,"earlyReason":"R125 datang 06:41 · Jalur 9 dipakai R125 (datang 06:44)","outReason":["R57 datang 06:18","Jalur 9 dipakai R57 (datang 06:21)"],"cepat":["out","ld"]},"R20":{"jay":[253,256,9],"in":[262,270,9],"lm":[271,277,7],"out":[372,378,8],"dep":[404,407,8],"ld":[354,361,7],"early":9,"wait":0,"earlyReason":"R125 masuk DAO 06:51 · R61 datang 06:54","outReason":["R57 masuk DAO 06:24"],"cepat":["out","ld"]},"R36":{"jay":[1142,1145,8],"in":[1150,1158,8],"lm":[1159,1165,7],"out":[1359,1367,9],"dep":[1382,1385,9],"ld":[1338,1348,7],"early":0,"wait":0,"cepat":[]},"R46":{"jay":[1285,1288,8],"in":[1291,1299,8],"lm":[1300,1306,7],"out":[491,499,8],"dep":[521,524,8],"ld":[470,480,7],"early":0,"wait":5,"waitReason":["R62 keluar DAO 21:16","LL kembali ke DAO 21:22"],"cepat":[]}},"pelanggaran":["R32 keluar DAO 8 mnt sebelum berangkat (aturan 20–30) karena R57 datang 06:18, Jalur 9 dipakai R57 (datang 06:21)","R20 keluar DAO 32 mnt sebelum berangkat (aturan 20–30) karena R57 masuk DAO 06:24","R138 keluar DAO 8 mnt sebelum berangkat (aturan 20–30) karena Jalur 9 dipakai R125 (datang 06:44), R20 berangkat 06:44","R2 keluar DAO 12 mnt sebelum berangkat (aturan 20–30) karena Jalur 9 dipakai R138 (berangkat 07:05), LD R56 masuk DAO 07:05","LM L57-2 menunggu 39 mnt di DAO (aturan maks 7)","LM L125-2 menunggu 19 mnt di DAO (aturan maks 7)"],"ringkasan":{"tepat":15,"awal":{"R26":3,"R130":9,"R34":20,"R54":15,"R18":17,"R50":5,"R32":2,"R20":9},"tertahan":{"R57":1,"R125":5,"R55":2,"R15":2,"R13":1,"R137":5,"R61":1,"R45":5},"cepat":25,"pergerakan":175,"status":"OPTIMAL"}},
      "pilihan": {"early": {"R54": 5, "R20": 5, "R52": 2, "R32": 1, "R138": 3, "R18": 5, "R130": 5, "R36": 5, "R50": 5, "R34": 5}, "outTrack": {}, "inTrack": {"R36": 9}, "hold": {"R34": 24}},
      "trains": [
        {
          "id": "R54",
          "inbound": "R53",
          "name": "Brawijaya",
          "line": "JAKK-GMR",
          "loco": 239,
          "locoCode": "L54-1",
          "formerCode": "L53-2",
          "departure": 296,
          "arrival": 19,
          "mode": "LL",
          "formation": "8K1 1M 1P",
          "dao": 8,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 2
            }
          ],
          "arrivalSource": {
            "code": "R53",
            "arrival": 19,
            "name": "Dinas Rangkaian Brawijaya",
            "movement": "Langsung Mundur",
            "dao": "3",
            "peron": "LANGSIR R53 2 STAY",
            "row": 18,
            "shift": "Malam"
          }
        },
        {
          "id": "R130",
          "inbound": "R127",
          "name": "Papandayan",
          "line": "JAKK-GMR",
          "loco": 254,
          "locoCode": "L130-1",
          "formerCode": "L127-2",
          "departure": 307,
          "arrival": 93,
          "mode": "LD",
          "formation": "1Pano 3K1SS 4K3SS 1M1 1 P",
          "dao": 6,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 3
            }
          ],
          "arrivalSource": {
            "code": "R127",
            "arrival": 93,
            "name": "Dinas Rangkaian Pangandaran",
            "movement": "Langsung Mundur",
            "dao": "3",
            "peron": "LANGSIR R127 2 STAY",
            "row": 20,
            "shift": "Malam"
          }
        },
        {
          "id": "R26",
          "inbound": "R25",
          "name": "Muria",
          "line": "JAKK-GMR",
          "loco": 299,
          "locoCode": "L26-1",
          "formerCode": "L25-2",
          "departure": 349,
          "arrival": 61,
          "mode": "LL",
          "formation": "9K1 1M 1P",
          "dao": 3,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 4
            }
          ],
          "arrivalSource": {
            "code": "R25",
            "arrival": 61,
            "name": "Dinas Rangkaian Muria",
            "movement": "Langsung Mundur",
            "dao": "3",
            "peron": "LANGSIR R25 2 STAY",
            "row": 19,
            "shift": "Malam"
          }
        },
        {
          "id": "R132",
          "inbound": "R49",
          "name": "Parahyangan",
          "line": "JAKK-GMR",
          "loco": 309,
          "locoCode": "L132-1",
          "formerCode": "L49-2",
          "departure": 365,
          "arrival": 227,
          "mode": "LD",
          "formation": "1 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 PSS(NG)",
          "dao": 7,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 5
            }
          ],
          "arrivalSource": {
            "code": "R49",
            "arrival": 227,
            "name": "Dinas Rangkaian Gajayana",
            "movement": "Langsung Mundur",
            "dao": "1R54 1W 1Stay",
            "peron": "LANGSIR R49 2 STAY",
            "row": 21,
            "shift": "Malam"
          }
        },
        {
          "id": "R32",
          "inbound": "R33",
          "name": "Taksaka",
          "line": "JAKK-GMR",
          "loco": 329,
          "locoCode": "L32-1",
          "formerCode": "L33-2",
          "departure": 400,
          "arrival": 1342,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 9,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 6
            }
          ],
          "arrivalSource": {
            "code": "R33",
            "arrival": 1342,
            "name": "Dinas Rangkaian Taksaka",
            "movement": "TERSERAH",
            "dao": "1W 1LL,1S.21",
            "peron": "1L36, 2R33, 1S.21R36",
            "row": 27,
            "shift": "Siang"
          }
        },
        {
          "id": "R20",
          "inbound": "R19",
          "name": "Muria",
          "line": "JAKK-GMR",
          "loco": 348,
          "locoCode": "L20-1",
          "formerCode": "L19-2",
          "departure": 413,
          "arrival": 256,
          "mode": "LD",
          "formation": "9 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 5,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 7
            }
          ],
          "arrivalSource": {
            "code": "R19",
            "arrival": 256,
            "name": "Dinas Rangkaian Muria",
            "movement": "Tunggu L130 Masuk DAO",
            "dao": "1R26, 2W",
            "peron": "1Lok R130, 2R19, 1stay",
            "row": 23,
            "shift": "Malam"
          }
        },
        {
          "id": "R138",
          "inbound": "R41",
          "name": "Parahyangan",
          "line": "JAKK-GMR",
          "loco": 365,
          "locoCode": "L138-1",
          "formerCode": "L41-2",
          "departure": 425,
          "arrival": 314,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P + 1 B/BP + 1Prio",
          "dao": 6,
          "arrivalCars": 12,
          "departureCars": 11,
          "requiredIn9": true,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 8
            }
          ],
          "arrivalSource": {
            "code": "R41",
            "arrival": 314,
            "name": "Dinas Rangkaian Pandalungan",
            "movement": "Langsung Mundur",
            "dao": "1LB41, 1W, 1B",
            "peron": "1L132, 2R41, L32, 1L20, 1S.21 R132 + L138",
            "row": 25,
            "shift": "Malam"
          }
        },
        {
          "id": "R2",
          "inbound": "R3",
          "name": "Anggrek",
          "line": "JAKK-GMR",
          "loco": 400,
          "locoCode": "L2-1",
          "formerCode": "L3-2",
          "departure": 444,
          "arrival": 287,
          "mode": "LD",
          "formation": "1 T + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 8,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 9
            },
            {
              "shift": "Pagi",
              "row": 2
            }
          ],
          "arrivalSource": {
            "code": "R3",
            "arrival": 287,
            "name": "Dinas Rangkaian Anggrek",
            "movement": "L Pulang Nunggu R26",
            "dao": "1R26,1S.21 1W",
            "peron": "2R3, 1CL, 1Gandeng Lok R26",
            "row": 24,
            "shift": "Malam"
          }
        },
        {
          "id": "R16",
          "inbound": "R15",
          "name": "Argo Dwipangga",
          "line": "JAKK-GMR",
          "loco": 400,
          "locoCode": "L16-1",
          "formerCode": "L15-2",
          "departure": 473,
          "arrival": 237,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 7 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 1,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Malam",
              "row": 10
            },
            {
              "shift": "Pagi",
              "row": 3
            }
          ],
          "arrivalSource": {
            "code": "R15",
            "arrival": 237,
            "name": "Dinas Rangkaian Argo Dwipangga",
            "movement": "Tunggu R54 Mundur Dari DAO",
            "dao": "1R54 1W 1S.21",
            "peron": "1S.21 R54 Sekalian Lok R15, 1Gandeng Lok R54",
            "row": 22,
            "shift": "Malam"
          }
        },
        {
          "id": "R56",
          "inbound": "R57",
          "name": "Sembrani",
          "line": "JAKK-GMR",
          "loco": 424,
          "locoCode": "L56-1",
          "formerCode": "L57-2",
          "departure": 501,
          "arrival": 380,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 8 K1 SS + 1 M1 + 1 P",
          "dao": 3,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 4
            }
          ],
          "arrivalSource": {
            "code": "R57",
            "arrival": 380,
            "name": "Dinas Rangkaian Sembrani",
            "movement": "L Pulang Nunggu R32/ R32 Mundur Duluan",
            "dao": "1W, 2S.21",
            "peron": "1S.21 Dao, 1S.21Peron+Lok Dines 138, 2Lok Dines",
            "row": 26,
            "shift": "Malam"
          }
        },
        {
          "id": "R46",
          "inbound": "R45",
          "name": "Pandalungan",
          "line": "JAKK-GMR",
          "loco": 465,
          "locoCode": "L46-1",
          "formerCode": "L45-2",
          "departure": 521,
          "arrival": 1283,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P",
          "dao": 2,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 5
            }
          ],
          "arrivalSource": {
            "code": "R45",
            "arrival": 1283,
            "name": "Dinas Rangkaian Pandalungan",
            "movement": "BEBAS",
            "dao": "1W 1LL, 1S.21",
            "peron": "1L62, 2R45, 1S.21L62",
            "row": 26,
            "shift": "Siang"
          }
        },
        {
          "id": "R126",
          "inbound": "R125",
          "name": "Batavia",
          "line": "JAKK-GMR",
          "loco": 488,
          "locoCode": "L126-1",
          "formerCode": "L125-2",
          "departure": 552,
          "arrival": 399,
          "mode": "LD",
          "formation": "4 K1 SS(NG) + 4 K3 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 4,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 6
            }
          ],
          "arrivalSource": {
            "code": "R125",
            "arrival": 399,
            "name": "Dinas Rangkaian Batavia",
            "movement": "Tunggu L2/16, Keluar R20",
            "dao": "2W, 1S.21",
            "peron": "1L20, 1L138, 1S.21DAO, 1S.21 Peron",
            "row": 27,
            "shift": "Malam"
          }
        },
        {
          "id": "R60",
          "inbound": "R61",
          "name": "Manahan",
          "line": "JAKK-GMR",
          "loco": 548,
          "locoCode": "L60-1",
          "formerCode": "L61-2",
          "departure": 613,
          "arrival": 416,
          "mode": "LD",
          "formation": "1 K1 WIS + 8 K1 SS + 1 M1 + 1 P",
          "dao": 7,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Pagi",
              "row": 7
            }
          ],
          "arrivalSource": {
            "code": "R61",
            "arrival": 416,
            "name": "Dinas Rangkaian Manahan",
            "movement": "Tunggu R138 Mundur",
            "dao": "2W, 1S.21",
            "peron": "2R61 2Serah terima",
            "row": 28,
            "shift": "Malam"
          }
        },
        {
          "id": "R18",
          "inbound": "R17",
          "name": "Muria",
          "line": "JAKK-GMR",
          "loco": 914,
          "locoCode": "L18-1",
          "formerCode": "L17-2",
          "departure": 967,
          "arrival": 683,
          "mode": "LL",
          "formation": "9 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 4,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 2
            }
          ],
          "arrivalSource": {
            "code": "R17",
            "arrival": 683,
            "name": "Dinas Rangkaian Muria",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W 2NGANGA",
            "peron": "TERSERAH",
            "row": 15,
            "shift": "Pagi"
          }
        },
        {
          "id": "R52",
          "inbound": "R51",
          "name": "Brawijaya",
          "line": "JAKK-GMR",
          "loco": 944,
          "locoCode": "L52-1",
          "formerCode": "L51-2",
          "departure": 1007,
          "arrival": 587,
          "mode": "LD",
          "formation": "8 K1 NI + 1 M1 + 1 P",
          "dao": 2,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 3
            }
          ],
          "arrivalSource": {
            "code": "R51",
            "arrival": 587,
            "name": "Dinas Rangkaian Brawijaya",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1 W 2NGANGA",
            "peron": "BEBAS",
            "row": 14,
            "shift": "Pagi"
          }
        },
        {
          "id": "R58",
          "inbound": "R55",
          "name": "Sembrani",
          "line": "JAKK-GMR",
          "loco": 1016,
          "locoCode": "L58-1",
          "formerCode": "L55-2",
          "departure": 1090,
          "arrival": 975,
          "mode": "LL",
          "formation": "2 K1 LUX 26 + 8 K1 SS + 1 M1 + 1 P",
          "dao": 3,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 4
            }
          ],
          "arrivalSource": {
            "code": "R55",
            "arrival": 975,
            "name": "Dinas Rangkaian Sembrani",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "2R55 2STAY",
            "row": 22,
            "shift": "Siang"
          }
        },
        {
          "id": "R50",
          "inbound": "R133",
          "name": "Gajayana",
          "line": "JAKK-GMR",
          "loco": 1070,
          "locoCode": "L50-1",
          "formerCode": "L133-2",
          "departure": 1127,
          "arrival": 848,
          "mode": "LD",
          "formation": "1 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 7,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 8,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 5
            }
          ],
          "arrivalSource": {
            "code": "R133",
            "arrival": 848,
            "name": "Dinas Rangkaian Parahyangan",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W 2NGANGA",
            "peron": "KUMAHA SIA",
            "row": 16,
            "shift": "Pagi"
          }
        },
        {
          "id": "R4",
          "inbound": "R1",
          "name": "Anggrek",
          "line": "JAKK-GMR",
          "loco": 1098,
          "locoCode": "L4-1",
          "formerCode": "L1-2",
          "departure": 1170,
          "arrival": 1000,
          "mode": "LL",
          "formation": "1 T + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 4,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 6
            }
          ],
          "arrivalSource": {
            "code": "R1",
            "arrival": 1000,
            "name": "Dinas Rangkaian Anggrek",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W1LL",
            "peron": "2R1 1L58 1STAY",
            "row": 23,
            "shift": "Siang"
          }
        },
        {
          "id": "R14",
          "inbound": "R13",
          "name": "Argo Lawu",
          "line": "JAKK-GMR",
          "loco": 1137,
          "locoCode": "L14-1",
          "formerCode": "L13-2",
          "departure": 1208,
          "arrival": 957,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 7 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 5,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 7
            }
          ],
          "arrivalSource": {
            "code": "R13",
            "arrival": 957,
            "name": "Dinas Rangkaian Argo Lawu",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "2R13 2STAY",
            "row": 21,
            "shift": "Siang"
          }
        },
        {
          "id": "R42",
          "inbound": "R137",
          "name": "Pandalungan",
          "line": "JAKK-GMR",
          "loco": 1179,
          "locoCode": "L42-1",
          "formerCode": "L137-2",
          "departure": 1238,
          "arrival": 940,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P + 1 B/BP",
          "dao": 6,
          "arrivalCars": 11,
          "departureCars": 12,
          "requiredIn9": false,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 8
            }
          ],
          "arrivalSource": {
            "code": "R137",
            "arrival": 940,
            "name": "Dinas Rangkaian Parahyangan",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "1L52, 2R137,1S.21 R52",
            "row": 20,
            "shift": "Siang"
          }
        },
        {
          "id": "R34",
          "inbound": "R29",
          "name": "Taksaka",
          "line": "JAKK-GMR",
          "loco": 1219,
          "locoCode": "L34-1",
          "formerCode": "L29-2",
          "departure": 1293,
          "arrival": 923,
          "mode": "LD",
          "formation": "2 K1 LUX 26 + 8 K1 SS(NG) + 1 M1 SS(NG) + 1 P SS(NG)",
          "dao": 9,
          "arrivalCars": 12,
          "departureCars": 12,
          "requiredIn9": true,
          "requiredOut9": true,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 9
            }
          ],
          "arrivalSource": {
            "code": "R29",
            "arrival": 923,
            "name": "Dinas Rangkaian Taksaka",
            "movement": "LANGSUNG MUNDUR",
            "dao": "2W 1LL",
            "peron": "2R29 1L18 1R137",
            "row": 19,
            "shift": "Siang"
          }
        },
        {
          "id": "R62",
          "inbound": "R59",
          "name": "Manahan",
          "line": "JAKK-GMR",
          "loco": 1278,
          "locoCode": "L62-1",
          "formerCode": "L59-2",
          "departure": 1331,
          "arrival": 1108,
          "mode": "LL",
          "formation": "1 K1 WIS + 8 K1 SS + 1 M1 + 1 P",
          "dao": 8,
          "arrivalCars": 11,
          "departureCars": 11,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 9,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 10
            }
          ],
          "arrivalSource": {
            "code": "R59",
            "arrival": 1108,
            "name": "Dinas Rangkaian Manahan",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W, 1LL, 1S.21 R4",
            "peron": "1L4, 2R1, 1S.21 R4",
            "row": 24,
            "shift": "Siang"
          }
        },
        {
          "id": "R36",
          "inbound": "R35",
          "name": "Argo Anjasmoro",
          "line": "JAKK-GMR",
          "loco": 1331,
          "locoCode": "L36-1",
          "formerCode": "L35-2",
          "departure": 1382,
          "arrival": 1145,
          "mode": "LD",
          "formation": "8 K1 SS + 1 M1 + 1 P",
          "dao": 3,
          "arrivalCars": 10,
          "departureCars": 10,
          "requiredIn9": false,
          "requiredOut9": false,
          "inTrack": 8,
          "outTrack": 9,
          "departureSources": [
            {
              "shift": "Siang",
              "row": 11
            }
          ],
          "arrivalSource": {
            "code": "R35",
            "arrival": 1145,
            "name": "Dinas Rangkaian Argo Anjasmoro",
            "movement": "LANGSUNG MUNDUR",
            "dao": "1W, 1LL, 1B",
            "peron": "1L14, 2R35, 1STAY",
            "row": 25,
            "shift": "Siang"
          }
        }
      ],
      "shifts": [
        {
          "name": "Malam",
          "sheet": "DINAS MALAM",
          "arrivals": [
            {
              "code": "R53",
              "arrival": 19,
              "name": "Dinas Rangkaian Brawijaya",
              "movement": "Langsung Mundur",
              "dao": "3",
              "peron": "LANGSIR R53 2 STAY",
              "row": 18,
              "shift": "Malam"
            },
            {
              "code": "R25",
              "arrival": 61,
              "name": "Dinas Rangkaian Muria",
              "movement": "Langsung Mundur",
              "dao": "3",
              "peron": "LANGSIR R25 2 STAY",
              "row": 19,
              "shift": "Malam"
            },
            {
              "code": "R127",
              "arrival": 93,
              "name": "Dinas Rangkaian Pangandaran",
              "movement": "Langsung Mundur",
              "dao": "3",
              "peron": "LANGSIR R127 2 STAY",
              "row": 20,
              "shift": "Malam"
            },
            {
              "code": "R49",
              "arrival": 227,
              "name": "Dinas Rangkaian Gajayana",
              "movement": "Langsung Mundur",
              "dao": "1R54 1W 1Stay",
              "peron": "LANGSIR R49 2 STAY",
              "row": 21,
              "shift": "Malam"
            },
            {
              "code": "R15",
              "arrival": 237,
              "name": "Dinas Rangkaian Argo Dwipangga",
              "movement": "Tunggu R54 Mundur Dari DAO",
              "dao": "1R54 1W 1S.21",
              "peron": "1S.21 R54 Sekalian Lok R15, 1Gandeng Lok R54",
              "row": 22,
              "shift": "Malam"
            },
            {
              "code": "R19",
              "arrival": 256,
              "name": "Dinas Rangkaian Muria",
              "movement": "Tunggu L130 Masuk DAO",
              "dao": "1R26, 2W",
              "peron": "1Lok R130, 2R19, 1stay",
              "row": 23,
              "shift": "Malam"
            },
            {
              "code": "R3",
              "arrival": 287,
              "name": "Dinas Rangkaian Anggrek",
              "movement": "L Pulang Nunggu R26",
              "dao": "1R26,1S.21 1W",
              "peron": "2R3, 1CL, 1Gandeng Lok R26",
              "row": 24,
              "shift": "Malam"
            },
            {
              "code": "R41",
              "arrival": 314,
              "name": "Dinas Rangkaian Pandalungan",
              "movement": "Langsung Mundur",
              "dao": "1LB41, 1W, 1B",
              "peron": "1L132, 2R41, L32, 1L20, 1S.21 R132 + L138",
              "row": 25,
              "shift": "Malam"
            },
            {
              "code": "R57",
              "arrival": 380,
              "name": "Dinas Rangkaian Sembrani",
              "movement": "L Pulang Nunggu R32/ R32 Mundur Duluan",
              "dao": "1W, 2S.21",
              "peron": "1S.21 Dao, 1S.21Peron+Lok Dines 138, 2Lok Dines",
              "row": 26,
              "shift": "Malam"
            },
            {
              "code": "R125",
              "arrival": 399,
              "name": "Dinas Rangkaian Batavia",
              "movement": "Tunggu L2/16, Keluar R20",
              "dao": "2W, 1S.21",
              "peron": "1L20, 1L138, 1S.21DAO, 1S.21 Peron",
              "row": 27,
              "shift": "Malam"
            },
            {
              "code": "R61",
              "arrival": 416,
              "name": "Dinas Rangkaian Manahan",
              "movement": "Tunggu R138 Mundur",
              "dao": "2W, 1S.21",
              "peron": "2R61 2Serah terima",
              "row": 28,
              "shift": "Malam"
            }
          ],
          "departures": [
            {
              "code": "R54",
              "row": 2
            },
            {
              "code": "R130",
              "row": 3
            },
            {
              "code": "R26",
              "row": 4
            },
            {
              "code": "R132",
              "row": 5
            },
            {
              "code": "R32",
              "row": 6
            },
            {
              "code": "R20",
              "row": 7
            },
            {
              "code": "R138",
              "row": 8
            },
            {
              "code": "R2",
              "row": 9
            },
            {
              "code": "R16",
              "row": 10
            }
          ],
          "notes": []
        },
        {
          "name": "Pagi",
          "sheet": "DINAS PAGI",
          "arrivals": [
            {
              "code": "R51",
              "arrival": 587,
              "name": "Dinas Rangkaian Brawijaya",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1 W 2NGANGA",
              "peron": "BEBAS",
              "row": 14,
              "shift": "Pagi"
            },
            {
              "code": "R17",
              "arrival": 683,
              "name": "Dinas Rangkaian Muria",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W 2NGANGA",
              "peron": "TERSERAH",
              "row": 15,
              "shift": "Pagi"
            },
            {
              "code": "R133",
              "arrival": 848,
              "name": "Dinas Rangkaian Parahyangan",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W 2NGANGA",
              "peron": "KUMAHA SIA",
              "row": 16,
              "shift": "Pagi"
            }
          ],
          "departures": [
            {
              "code": "R2",
              "row": 2
            },
            {
              "code": "R16",
              "row": 3
            },
            {
              "code": "R56",
              "row": 4
            },
            {
              "code": "R46",
              "row": 5
            },
            {
              "code": "R126",
              "row": 6
            },
            {
              "code": "R60",
              "row": 7
            }
          ],
          "notes": [
            {
              "text": "APLUSAN DINAS MALAM KE PAGI LANGSUNG BAWA L2 SAMA L16",
              "row": 18
            },
            {
              "text": "APLUSAN DINAS PAGI KE SIANG, DINES PAGI DORONG R18 KE PERON",
              "row": 19
            }
          ]
        },
        {
          "name": "Siang",
          "sheet": "DINAS SIANG",
          "arrivals": [
            {
              "code": "R29",
              "arrival": 923,
              "name": "Dinas Rangkaian Taksaka",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "2R29 1L18 1R137",
              "row": 19,
              "shift": "Siang"
            },
            {
              "code": "R137",
              "arrival": 940,
              "name": "Dinas Rangkaian Parahyangan",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "1L52, 2R137,1S.21 R52",
              "row": 20,
              "shift": "Siang"
            },
            {
              "code": "R13",
              "arrival": 957,
              "name": "Dinas Rangkaian Argo Lawu",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "2R13 2STAY",
              "row": 21,
              "shift": "Siang"
            },
            {
              "code": "R55",
              "arrival": 975,
              "name": "Dinas Rangkaian Sembrani",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W 1LL",
              "peron": "2R55 2STAY",
              "row": 22,
              "shift": "Siang"
            },
            {
              "code": "R1",
              "arrival": 1000,
              "name": "Dinas Rangkaian Anggrek",
              "movement": "LANGSUNG MUNDUR",
              "dao": "2W1LL",
              "peron": "2R1 1L58 1STAY",
              "row": 23,
              "shift": "Siang"
            },
            {
              "code": "R59",
              "arrival": 1108,
              "name": "Dinas Rangkaian Manahan",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W, 1LL, 1S.21 R4",
              "peron": "1L4, 2R1, 1S.21 R4",
              "row": 24,
              "shift": "Siang"
            },
            {
              "code": "R35",
              "arrival": 1145,
              "name": "Dinas Rangkaian Argo Anjasmoro",
              "movement": "LANGSUNG MUNDUR",
              "dao": "1W, 1LL, 1B",
              "peron": "1L14, 2R35, 1STAY",
              "row": 25,
              "shift": "Siang"
            },
            {
              "code": "R45",
              "arrival": 1283,
              "name": "Dinas Rangkaian Pandalungan",
              "movement": "BEBAS",
              "dao": "1W 1LL, 1S.21",
              "peron": "1L62, 2R45, 1S.21L62",
              "row": 26,
              "shift": "Siang"
            },
            {
              "code": "R33",
              "arrival": 1342,
              "name": "Dinas Rangkaian Taksaka",
              "movement": "TERSERAH",
              "dao": "1W 1LL,1S.21",
              "peron": "1L36, 2R33, 1S.21R36",
              "row": 27,
              "shift": "Siang"
            }
          ],
          "departures": [
            {
              "code": "R18",
              "row": 2
            },
            {
              "code": "R52",
              "row": 3
            },
            {
              "code": "R58",
              "row": 4
            },
            {
              "code": "R50",
              "row": 5
            },
            {
              "code": "R4",
              "row": 6
            },
            {
              "code": "R14",
              "row": 7
            },
            {
              "code": "R42",
              "row": 8
            },
            {
              "code": "R34",
              "row": 9
            },
            {
              "code": "R62",
              "row": 10
            },
            {
              "code": "R36",
              "row": 11
            }
          ],
          "notes": [
            {
              "text": "APLUSAN SIANG KE MALAM DORONGIN R62 KE PERON",
              "row": 29
            }
          ]
        }
      ],
      "waitReasons": {
        "R20": [
          "LD R130 masuk DAO"
        ],
        "R16": [
          "R54 keluar DAO",
          "LL kembali setelah R54"
        ],
        "R60": [
          "R138 keluar DAO",
          "R138 berangkat dari JAKK"
        ]
      },
      "targets": {
        "dwell": [
          3,
          5
        ],
        "llRelease": 60,
        "llBrakes": 20
      },
      "llReleaseReasons": {
        "R54": [
          "R15 tiba JAKK"
        ],
        "R26": [
          "Jalur 8 dipakai R54"
        ],
        "R52": [
          "Jalur 9 dipakai R13",
          "Jalur 9 dipakai R55"
        ],
        "R4": [
          "R59 masuk DAO"
        ],
        "R62": [
          "Jalur 9 dipakai R34"
        ],
        "R36": [
          "Jalur 9 dipakai R62",
          "Jalur 9 dipakai R33"
        ]
      },
      "plan": {
        "R54": {
          "jay": {
            "start": 16,
            "end": 19,
            "track": 9
          },
          "in": {
            "start": 22,
            "end": 26,
            "track": 9
          },
          "lm": {
            "start": 27,
            "end": 30,
            "track": 7
          },
          "out": {
            "start": 237,
            "end": 242,
            "track": 8
          },
          "ll": {
            "start": 242,
            "end": 245,
            "track": 0
          },
          "pickup": {
            "start": 223,
            "end": 226,
            "track": 0
          },
          "l104": {
            "start": 241,
            "end": 244,
            "track": 6
          },
          "gandeng": {
            "start": 244,
            "end": 248,
            "track": 8,
            "waitReason": ""
          }
        },
        "R130": {
          "jay": {
            "start": 90,
            "end": 93,
            "track": 9
          },
          "in": {
            "start": 96,
            "end": 100,
            "track": 9
          },
          "lm": {
            "start": 101,
            "end": 104,
            "track": 7
          },
          "out": {
            "start": 299,
            "end": 304,
            "track": 9
          },
          "ld": {
            "start": 259,
            "end": 263,
            "track": 7
          }
        },
        "R26": {
          "jay": {
            "start": 58,
            "end": 61,
            "track": 9
          },
          "in": {
            "start": 64,
            "end": 68,
            "track": 9
          },
          "lm": {
            "start": 69,
            "end": 72,
            "track": 7
          },
          "out": {
            "start": 322,
            "end": 327,
            "track": 8
          },
          "ll": {
            "start": 327,
            "end": 330,
            "track": 0
          },
          "pickup": {
            "start": 276,
            "end": 279,
            "track": 0
          },
          "l104": {
            "start": 301,
            "end": 304,
            "track": 6
          },
          "gandeng": {
            "start": 327,
            "end": 331,
            "track": 8,
            "waitReason": ""
          }
        },
        "R132": {
          "jay": {
            "start": 224,
            "end": 227,
            "track": 8
          },
          "in": {
            "start": 230,
            "end": 234,
            "track": 8
          },
          "lm": {
            "start": 249,
            "end": 252,
            "track": 7
          },
          "out": {
            "start": 341,
            "end": 346,
            "track": 9
          },
          "ld": {
            "start": 314,
            "end": 318,
            "track": 7
          }
        },
        "R32": {
          "jay": {
            "start": 1339,
            "end": 1342,
            "track": 9
          },
          "in": {
            "start": 1345,
            "end": 1349,
            "track": 9
          },
          "lm": {
            "start": 1361,
            "end": 1364,
            "track": 7
          },
          "out": {
            "start": 393,
            "end": 398,
            "track": 9
          },
          "ld": {
            "start": 337,
            "end": 341,
            "track": 7
          }
        },
        "R20": {
          "jay": {
            "start": 253,
            "end": 256,
            "track": 9
          },
          "in": {
            "start": 263,
            "end": 267,
            "track": 9
          },
          "lm": {
            "start": 268,
            "end": 271,
            "track": 7
          },
          "out": {
            "start": 380,
            "end": 385,
            "track": 8
          },
          "ld": {
            "start": 352,
            "end": 356,
            "track": 7
          }
        },
        "R138": {
          "jay": {
            "start": 311,
            "end": 314,
            "track": 9
          },
          "in": {
            "start": 318,
            "end": 322,
            "track": 9
          },
          "lm": {
            "start": 334,
            "end": 337,
            "track": 7
          },
          "out": {
            "start": 419,
            "end": 424,
            "track": 8
          },
          "ld": {
            "start": 369,
            "end": 373,
            "track": 7
          }
        },
        "R2": {
          "jay": {
            "start": 284,
            "end": 287,
            "track": 9
          },
          "in": {
            "start": 292,
            "end": 296,
            "track": 9
          },
          "lm": {
            "start": 304,
            "end": 307,
            "track": 7
          },
          "out": {
            "start": 438,
            "end": 443,
            "track": 8
          }
        },
        "R16": {
          "jay": {
            "start": 234,
            "end": 237,
            "track": 9
          },
          "in": {
            "start": 245,
            "end": 249,
            "track": 9
          },
          "lm": {
            "start": 256,
            "end": 259,
            "track": 7
          },
          "out": {
            "start": 451,
            "end": 456,
            "track": 9
          }
        },
        "R56": {
          "jay": {
            "start": 377,
            "end": 380,
            "track": 9
          },
          "in": {
            "start": 385,
            "end": 389,
            "track": 9
          },
          "lm": {
            "start": 390,
            "end": 393,
            "track": 7
          },
          "out": {
            "start": 476,
            "end": 481,
            "track": 9
          },
          "ld": {
            "start": 447,
            "end": 451,
            "track": 7
          }
        },
        "R46": {
          "jay": {
            "start": 1280,
            "end": 1283,
            "track": 8
          },
          "in": {
            "start": 1286,
            "end": 1290,
            "track": 8
          },
          "lm": {
            "start": 1291,
            "end": 1294,
            "track": 7
          },
          "out": {
            "start": 496,
            "end": 501,
            "track": 8
          },
          "ld": {
            "start": 469,
            "end": 473,
            "track": 7
          }
        },
        "R126": {
          "jay": {
            "start": 403,
            "end": 406,
            "track": 9
          },
          "in": {
            "start": 411,
            "end": 415,
            "track": 9
          },
          "lm": {
            "start": 432,
            "end": 435,
            "track": 7
          },
          "out": {
            "start": 524,
            "end": 529,
            "track": 9
          },
          "ld": {
            "start": 492,
            "end": 496,
            "track": 7
          }
        },
        "R60": {
          "jay": {
            "start": 416,
            "end": 419,
            "track": 9
          },
          "in": {
            "start": 428,
            "end": 432,
            "track": 9
          },
          "lm": {
            "start": 435,
            "end": 438,
            "track": 7
          },
          "out": {
            "start": 587,
            "end": 592,
            "track": 9
          },
          "ld": {
            "start": 555,
            "end": 559,
            "track": 7
          }
        },
        "R18": {
          "jay": {
            "start": 680,
            "end": 683,
            "track": 9
          },
          "in": {
            "start": 686,
            "end": 690,
            "track": 9
          },
          "lm": {
            "start": 691,
            "end": 694,
            "track": 7
          },
          "out": {
            "start": 907,
            "end": 912,
            "track": 8
          },
          "ll": {
            "start": 912,
            "end": 915,
            "track": 0
          },
          "pickup": {
            "start": 894,
            "end": 897,
            "track": 0
          },
          "l104": {
            "start": 916,
            "end": 919,
            "track": 6
          },
          "gandeng": {
            "start": 919,
            "end": 923,
            "track": 8,
            "waitReason": ""
          }
        },
        "R52": {
          "jay": {
            "start": 584,
            "end": 587,
            "track": 8
          },
          "in": {
            "start": 592,
            "end": 596,
            "track": 8
          },
          "lm": {
            "start": 597,
            "end": 600,
            "track": 7
          },
          "out": {
            "start": 982,
            "end": 987,
            "track": 9
          },
          "ll": {
            "start": 987,
            "end": 990,
            "track": 0
          },
          "pickup": {
            "start": 915,
            "end": 918,
            "track": 0
          },
          "l104": {
            "start": 946,
            "end": 949,
            "track": 6
          },
          "gandeng": {
            "start": 987,
            "end": 991,
            "track": 9,
            "waitReason": ""
          }
        },
        "R58": {
          "jay": {
            "start": 972,
            "end": 975,
            "track": 9
          },
          "in": {
            "start": 978,
            "end": 982,
            "track": 9
          },
          "lm": {
            "start": 994,
            "end": 997,
            "track": 7
          },
          "out": {
            "start": 1030,
            "end": 1035,
            "track": 9
          },
          "ll": {
            "start": 1035,
            "end": 1038,
            "track": 0
          },
          "pickup": {
            "start": 1017,
            "end": 1020,
            "track": 0
          },
          "l104": {
            "start": 1018,
            "end": 1021,
            "track": 6
          },
          "gandeng": {
            "start": 1035,
            "end": 1039,
            "track": 9,
            "waitReason": ""
          }
        },
        "R50": {
          "jay": {
            "start": 845,
            "end": 848,
            "track": 9
          },
          "in": {
            "start": 851,
            "end": 855,
            "track": 9
          },
          "lm": {
            "start": 856,
            "end": 859,
            "track": 7
          },
          "out": {
            "start": 1099,
            "end": 1104,
            "track": 8
          },
          "ld": {
            "start": 1074,
            "end": 1078,
            "track": 7
          }
        },
        "R4": {
          "jay": {
            "start": 997,
            "end": 1000,
            "track": 8
          },
          "in": {
            "start": 1005,
            "end": 1009,
            "track": 8
          },
          "lm": {
            "start": 1010,
            "end": 1013,
            "track": 7
          },
          "out": {
            "start": 1119,
            "end": 1124,
            "track": 9
          },
          "ll": {
            "start": 1124,
            "end": 1127,
            "track": 0
          },
          "pickup": {
            "start": 1096,
            "end": 1099,
            "track": 0
          },
          "l104": {
            "start": 1100,
            "end": 1103,
            "track": 6
          },
          "gandeng": {
            "start": 1127,
            "end": 1131,
            "track": 9,
            "waitReason": "Menunggu R50 berangkat"
          }
        },
        "R14": {
          "jay": {
            "start": 954,
            "end": 957,
            "track": 9
          },
          "in": {
            "start": 962,
            "end": 966,
            "track": 9
          },
          "lm": {
            "start": 975,
            "end": 978,
            "track": 7
          },
          "out": {
            "start": 1180,
            "end": 1185,
            "track": 9
          },
          "ld": {
            "start": 1145,
            "end": 1149,
            "track": 7
          }
        },
        "R42": {
          "jay": {
            "start": 937,
            "end": 940,
            "track": 9
          },
          "in": {
            "start": 943,
            "end": 947,
            "track": 9
          },
          "lm": {
            "start": 948,
            "end": 951,
            "track": 7
          },
          "out": {
            "start": 1211,
            "end": 1216,
            "track": 9
          },
          "ld": {
            "start": 1185,
            "end": 1189,
            "track": 7
          }
        },
        "R34": {
          "jay": {
            "start": 920,
            "end": 923,
            "track": 9
          },
          "in": {
            "start": 927,
            "end": 931,
            "track": 9
          },
          "lm": {
            "start": 932,
            "end": 935,
            "track": 7
          },
          "out": {
            "start": 1265,
            "end": 1270,
            "track": 9
          },
          "ld": {
            "start": 1223,
            "end": 1227,
            "track": 7
          }
        },
        "R62": {
          "jay": {
            "start": 1105,
            "end": 1108,
            "track": 9
          },
          "in": {
            "start": 1111,
            "end": 1115,
            "track": 9
          },
          "lm": {
            "start": 1116,
            "end": 1119,
            "track": 7
          },
          "out": {
            "start": 1296,
            "end": 1301,
            "track": 9
          },
          "ll": {
            "start": 1301,
            "end": 1304,
            "track": 0
          },
          "pickup": {
            "start": 1258,
            "end": 1261,
            "track": 0
          },
          "l104": {
            "start": 1280,
            "end": 1283,
            "track": 6
          },
          "gandeng": {
            "start": 1301,
            "end": 1305,
            "track": 9,
            "waitReason": ""
          }
        },
        "R36": {
          "jay": {
            "start": 1142,
            "end": 1145,
            "track": 8
          },
          "in": {
            "start": 1149,
            "end": 1153,
            "track": 8
          },
          "lm": {
            "start": 1154,
            "end": 1157,
            "track": 7
          },
          "out": {
            "start": 1349,
            "end": 1354,
            "track": 9
          },
          "ll": {
            "start": 1354,
            "end": 1357,
            "track": 0
          },
          "pickup": {
            "start": 1304,
            "end": 1307,
            "track": 0
          },
          "l104": {
            "start": 1333,
            "end": 1336,
            "track": 6
          },
          "gandeng": {
            "start": 1354,
            "end": 1358,
            "track": 9,
            "waitReason": ""
          }
        },
        "PAGI": {
          "combiner": {
            "start": 406,
            "end": 411,
            "track": 7
          }
        }
      },
      "berths": {
        "R130": 0,
        "R132": 0,
        "R32": 0,
        "R20": 0,
        "R138": 0,
        "R2": 0,
        "R56": 0,
        "R46": 0,
        "R126": 0,
        "R60": 0,
        "R50": 0,
        "R14": 0,
        "R42": 0,
        "R34": 0
      }
    }
  };
}
})();
