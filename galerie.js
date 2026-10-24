(function () {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let redrawCoverage = null, redrawGrids = null;   // remplis plus bas
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ================= Strates génératives ================= */
  const EARTH = {
    bone: "#e3d5bd", sand: "#cdb48c", ochre: "#c98a2b", clay: "#a8431f",
    oxblood: "#6b2317", umber: "#3b1f17", ink: "#141210",
  };
  const BANDS = ["sand", "ochre", "bone", "clay", "oxblood", "sand", "umber", "ochre", "ink",
                 "vermilion", "bone", "oxblood", "sand", "clay", "umber", "ochre", "ink", "bone",
                 "oxblood", "sand", "clay", "ink", "ochre", "umber", "bone", "oxblood"];

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function Strata(canvas, opts) {
    const ctx = canvas.getContext("2d");
    const o = Object.assign({ bands: 26, base: .6, peak: .44, cx: .64, seed: 7 }, opts);
    let W = 0, H = 0, spacing = [], t = Math.random() * 100, running = false;
    const m = { x: -9999, y: -9999, sx: -9999, sy: -9999, k: 0, tk: 0 };
    const B = () => W < 700 ? o.base + .08 : o.base;
    const P = () => W < 700 ? o.peak * .7 : o.peak;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = rng(o.seed); let total = 0; spacing = [];
      for (let i = 0; i < o.bands; i++) { const s = BANDS[i % BANDS.length] === "vermilion" ? .35 : .6 + r() * .9; spacing.push(s); total += s; }
      const span = H * (1 - B()) + 40;
      spacing = spacing.map(s => s / total * span);
    }

    function mountain(x) {
      const cx = W * (W < 700 ? .58 : o.cx);
      const a = Math.exp(-Math.pow((x - cx) / (W * .16), 2));
      const b = .22 * Math.exp(-Math.pow((x - cx + W * .27) / (W * .13), 2));
      const c = .22 * Math.exp(-Math.pow((x - cx - W * .3) / (W * .15), 2));
      return H * P() * (a + b + c);
    }

    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      const accent = getComputedStyle(root).getPropertyValue("--accent").trim() || "#e0401f";
      m.sx += (m.x - m.sx) * .12; m.sy += (m.y - m.sy) * .12; m.k += (m.tk - m.k) * .06;

      // soleil
      const sx = W * (W < 700 ? .8 : o.cx - .12) + (m.k ? (m.sx - W / 2) * .02 : 0);
      const sy = H * B() - H * P() * (W < 700 ? 1.25 : 1.02) + (m.k ? (m.sy - H / 2) * .02 : 0);
      const sr = Math.min(W, H) * .11;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(sx, Math.max(sy, sr + 80), sr, 0, Math.PI * 2); ctx.fill();

      const step = W < 700 ? 5 : 6, n = Math.ceil(W / step) + 1;
      const lineCol = root.dataset.theme === "dark" ? "rgba(236,230,219,.22)" : "rgba(20,18,16,.28)";
      let prev = null, y0 = H * B();
      for (let i = 0; i < o.bands; i++) {
        const d = i / o.bands, A = 5 + d * 12, ys = new Float32Array(n);
        for (let j = 0; j < n; j++) {
          const x = j * step;
          let y = y0 - mountain(x) * (1 - d * .6)
                + A * (.6 * Math.sin(x * .0042 + t * .45 + i * .22) + .4 * Math.sin(x * .011 - t * .7 + i * .35));
          if (m.k > .01) {
            const dx = x - m.sx, dy = y - m.sy;
            y += (dy < 0 ? -1 : 1) * 95 * m.k * Math.exp(-(dx * dx + dy * dy) / (2 * 120 * 120));
          }
          if (prev && y < prev[j] + .6) y = prev[j] + .6;
          ys[j] = y;
        }
        const key = BANDS[(i + o.seed) % BANDS.length];
        ctx.beginPath(); ctx.moveTo(0, ys[0]);
        for (let j = 1; j < n; j++) ctx.lineTo(j * step, ys[j]);
        ctx.lineTo(W, H + 10); ctx.lineTo(0, H + 10); ctx.closePath();
        ctx.fillStyle = key === "vermilion" ? accent : EARTH[key]; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, ys[0]);
        for (let j = 1; j < n; j++) ctx.lineTo(j * step, ys[j]);
        ctx.strokeStyle = lineCol; ctx.lineWidth = .7; ctx.stroke();
        prev = ys; y0 += spacing[i];
      }
    }

    function loop() { if (!running) return; t += .006; draw(); requestAnimationFrame(loop); }
    function start() { if (running || reduce) return; running = true; requestAnimationFrame(loop); }
    function stop() { running = false; }

    new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop())).observe(canvas);
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

    const host = canvas.parentElement;
    host.addEventListener("pointermove", e => {
      const r = canvas.getBoundingClientRect();
      m.x = e.clientX - r.left; m.y = e.clientY - r.top;
      if (m.sx < -999) { m.sx = m.x; m.sy = m.y; }
      m.tk = 1;
    });
    host.addEventListener("pointerleave", () => { m.tk = 0; });
    return { redraw: draw };
  }

  const strata = Strata(document.getElementById("strata"), {});

  /* ================= Onglets ================= */
  const views = [...document.querySelectorAll(".view")];
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const pageTitle = document.getElementById("page-title");
  const names = views.map(v => v.dataset.view);

  const pageSub = document.getElementById("page-sub");
  // Le titre peut tenir sur une ou deux lignes : on place le sous-titre d'apres sa hauteur reelle.
  function placeSub() {
    if (!pageSub.textContent) return;
    requestAnimationFrame(() => {
      // en chapeau, au-dessus du titre : la seule zone du bandeau qui reste unie
      pageSub.style.top = Math.max(6, pageTitle.offsetTop - pageSub.offsetHeight - 14) + "px";
    });
  }
  addEventListener("resize", placeSub);
  if (document.fonts) document.fonts.ready.then(placeSub);
  // Le titre change de hauteur quand il passe sur deux lignes ou que la police arrive :
  // on suit sa boite plutot que de deviner le moment.
  if (window.ResizeObserver) new ResizeObserver(placeSub).observe(pageTitle);
  function titleFor(view) {
    return view.dataset["title" + (root.lang === "fr" ? "Fr" : "En")] || "";
  }
  function subFor(view) {
    return view.dataset["sub" + (root.lang === "fr" ? "Fr" : "En")] || "";
  }
  function show(name, scroll) {
    if (!names.includes(name)) name = "home";
    const view = views.find(v => v.dataset.view === name);
    views.forEach(v => v.classList.toggle("active", v === view));
    tabs.forEach(a => a.classList.toggle("active", a.dataset.tab === name));
    document.body.dataset.view = name;
    pageTitle.textContent = titleFor(view);
    pageSub.textContent = subFor(view);
    placeSub();
    pageTitle.classList.remove("swap"); void pageTitle.offsetWidth; pageTitle.classList.add("swap");
    document.title = name === "home" ? "Hanna Bony" : titleFor(view) + " — Hanna Bony";
    if (scroll) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
  addEventListener("hashchange", () => show(location.hash.slice(1), true));

  /* ================= Langue & thème ================= */
  const langBtn = document.getElementById("lang-toggle");
  function setLang(l) {
    root.lang = l; store.set("lang", l);
    const [en, fr] = langBtn.querySelectorAll("span");
    en.classList.toggle("on", l === "en"); fr.classList.toggle("on", l === "fr");
    const active = views.find(v => v.classList.contains("active"));
    if (active) { pageTitle.textContent = titleFor(active); pageSub.textContent = subFor(active); placeSub(); }
    if (redrawCoverage) redrawCoverage();
    if (redrawGrids) redrawGrids();
  }
  setLang(store.get("lang") || ((navigator.language || "en").startsWith("fr") ? "fr" : "en"));
  langBtn.addEventListener("click", () => setLang(root.lang === "en" ? "fr" : "en"));

  function setTheme(th) { root.dataset.theme = th; store.set("theme-galerie", th); strata.redraw(); }
  setTheme(store.get("theme-galerie") || "light");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    paintIcons();
    if (redrawCoverage) redrawCoverage();
    if (redrawGrids) redrawGrids();
    paintThumbs();
  });

  show(location.hash.slice(1), false);

  const heroName = document.querySelector(".hero-name");
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => heroName.classList.add("in"), 150));

  /* ================= Recherche : filtres & détails ================= */
  const works = document.querySelectorAll(".work");
  document.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x === b));
    const f = b.dataset.filter;
    works.forEach(w => w.classList.toggle("hidden", f !== "all" && !w.dataset.tags.split(" ").includes(f)));
  }));
  works.forEach(w => {
    const row = w.querySelector(".work-row");
    row.addEventListener("click", () => {
      const open = w.classList.toggle("open");
      row.setAttribute("aria-expanded", open);
    });
  });

  /* ================= Tableaux cartographiques ================= */
  // Chaque projet : sa région découpée dans des strates, sur papier, avec le soleil vermillon.
  function drawMap(canvas) {
    const map = (window.MAPS || {})[canvas.dataset.map];
    if (!map) return;
    const tall = canvas.dataset.frame === "tall";
    const wide = !tall && map.w / map.h > 1.6;
    const W = wide ? 520 : 400, H = wide ? 340 : (map.pts ? Math.round(400 * map.h / map.w) : 500), dpr = 2;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(+canvas.dataset.seed || 1);
    const accent = "#e0401f";

    c.fillStyle = "#e9dfcc"; c.fillRect(0, 0, W, H);

    const pad = map.pts ? 0 : wide ? .06 : .1;
    const s = Math.min(W * (1 - 2 * pad) / map.w, H * (1 - 2 * pad) / map.h);
    const ox = (W - map.w * s) / 2, oy = (H - map.h * s) / 2 + (wide ? 0 : H * .03);

    c.save(); c.translate(ox, oy); c.scale(s, s);
    const ctxPath = map.context ? new Path2D(map.context) : null;
    const focus = new Path2D(map.focus);
    if (ctxPath) {
      c.fillStyle = "#ddcfb6"; c.fill(ctxPath);
      c.strokeStyle = "rgba(20,18,16,.35)"; c.lineWidth = .8 / s; c.stroke(ctxPath);
    }
    // soleil, par-dessus le contexte, sous la région étudiée
    c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalCompositeOperation = "multiply"; c.fillStyle = accent; c.beginPath();
    if (!map.pts) c.arc(W * (wide ? .88 : .8), H * (wide ? .18 : .15), Math.min(W, H) * (wide ? .08 : .1), 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.save(); c.clip(focus);
    const cols = ["#cdb48c", "#c98a2b", "#e3d5bd", "#a8431f", "#6b2317", "#3b1f17", "#141210"];
    const tilt = (r() - .5) * .25;
    let y = -map.h * .3, k = 0;
    while (y < map.h * 1.3) {
      const h = map.h * (.018 + r() * .05);
      c.beginPath(); c.moveTo(-map.w * .2, y);
      for (let x = -map.w * .2; x <= map.w * 1.2; x += map.w / 60)
        c.lineTo(x, y + x * tilt + Math.sin(x / map.w * 9 + k) * map.h * .012);
      c.lineTo(map.w * 1.2, map.h * 2); c.lineTo(-map.w * .2, map.h * 2); c.closePath();
      c.fillStyle = k % 9 === 6 ? accent : cols[Math.floor(r() * cols.length)];
      c.fill(); y += h; k++;
    }
    c.restore();
    c.strokeStyle = "#141210"; c.lineWidth = (map.w / map.h > 1.6 ? .5 : 1.2) / s; c.stroke(focus);
    c.restore();

    // villes (carte des présentations)
    (map.pts || []).forEach(([name, x, y, side]) => {
      const px = ox + x * s, py = oy + y * s;
      c.fillStyle = "#e9dfcc"; c.beginPath(); c.arc(px, py, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = accent; c.beginPath(); c.arc(px, py, 4, 0, Math.PI * 2); c.fill();
      c.font = "500 10px 'IBM Plex Mono', monospace"; c.textBaseline = "middle";
      const label = name.toUpperCase(), tw = c.measureText(label).width;
      const lx = side === "l" ? px - 17 - tw : px + 9;
      c.fillStyle = "rgba(233,223,204,.9)"; c.fillRect(lx, py - 8, tw + 8, 16);
      c.fillStyle = "#141210"; c.fillText(label, lx + 4, py + .5);
    });

    c.strokeStyle = "rgba(20,18,16,.55)"; c.lineWidth = 1; c.strokeRect(.5, .5, W - 1, H - 1);
  }
  const paint = () => document.querySelectorAll("canvas[data-map]").forEach(drawMap);
  paint();
  if (document.fonts) document.fonts.ready.then(paint);

  // Mur de tableaux : ouvre le projet correspondant dans l'onglet Recherche
  document.querySelectorAll(".frame[data-open]").forEach(f => f.addEventListener("click", () => {
    const w = works[+f.dataset.open];
    if (!w) return;
    w.classList.add("open"); w.querySelector(".work-row").setAttribute("aria-expanded", true);
    setTimeout(() => w.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }), 450);
  }));




  /* ================= Vignettes des rubriques ================= */
  // Un petit tableau par catégorie, dessiné dans la palette des strates.
  function drawIcon(canvas) {
    const kind = canvas.dataset.icon, r = rng(+canvas.dataset.seed || 1);
    const W = 300, H = 210, dpr = 2;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#e0401f";
    const P = ["#cdb48c", "#c98a2b", "#e3d5bd", "#a8431f", "#6b2317", "#3b1f17"];
    const pick = i => P[i % P.length];
    c.fillStyle = "#e9dfcc"; c.fillRect(0, 0, W, H);

    const bands = (n, h0) => {           // strates de fond
      let y = h0;
      for (let i = 0; i < n; i++) {
        const hh = 6 + r() * 16;
        c.fillStyle = i === 2 ? acc : pick(i + 1);
        c.beginPath(); c.moveTo(0, y);
        for (let x = 0; x <= W; x += 10) c.lineTo(x, y + Math.sin(x * .02 + i) * 4);
        c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
        y += hh;
      }
    };

    if (kind === "survey") {             // grappes d'enquête
      bands(5, H * .62);
      for (let y = 22; y < H * .62; y += 26) for (let x = 24; x < W - 10; x += 30) {
        const v = r();
        c.fillStyle = v > .88 ? acc : pick(Math.floor(v * 4) + 1);
        c.beginPath(); c.arc(x, y, 3 + v * 7, 0, Math.PI * 2); c.fill();
      }
    } else if (kind === "climate") {     // pluie sur les strates
      bands(6, H * .5);
      c.strokeStyle = acc; c.lineWidth = 2; c.lineCap = "round";
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = r() * H * .46;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 13); c.stroke();
      }
    } else if (kind === "course") {      // écran et lecture
      bands(4, H * .72);
      c.fillStyle = pick(5); c.fillRect(44, 30, W - 88, H * .46);
      c.fillStyle = "#e9dfcc"; c.fillRect(52, 38, W - 104, H * .46 - 16);
      c.fillStyle = acc;
      c.beginPath(); c.moveTo(W / 2 - 14, H * .26 - 18); c.lineTo(W / 2 + 20, H * .26); c.lineTo(W / 2 - 14, H * .26 + 18); c.closePath(); c.fill();
    } else if (kind === "method") {      // étude d'événements
      bands(3, H * .84);
      c.strokeStyle = "rgba(20,18,16,.35)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(20, H * .52); c.lineTo(W - 20, H * .52); c.stroke();
      c.setLineDash([4, 4]); c.beginPath(); c.moveTo(W / 2, 20); c.lineTo(W / 2, H * .78); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 9; i++) {
        const x = 32 + i * 29, after = x > W / 2;
        const y = after ? H * .52 - 22 - r() * 26 : H * .52 - r() * 8;
        c.strokeStyle = after ? acc : pick(4); c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x, y + 9); c.stroke();
        c.fillStyle = after ? acc : pick(4);
        c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill();
      }
    } else if (kind === "school") {      // soleil d'été
      bands(6, H * .52);
      c.fillStyle = acc; c.beginPath(); c.arc(W / 2, H * .4, 42, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(20,18,16,.3)"; c.lineWidth = 1.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
        c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * 52, H * .4 + Math.sin(a) * 52);
        c.lineTo(W / 2 + Math.cos(a) * 64, H * .4 + Math.sin(a) * 64); c.stroke();
      }
    } else if (kind === "seminar") {     // rangées de sièges
      bands(3, H * .84);
      c.fillStyle = pick(5); c.fillRect(W / 2 - 54, 20, 108, 26);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 7 + row; i++) {
        const w = 22, gap = 6, total = (7 + row) * (w + gap) - gap;
        c.fillStyle = (row + i) % 5 === 0 ? acc : pick(i + row + 1);
        c.fillRect(W / 2 - total / 2 + i * (w + gap), 64 + row * 28, w, 18);
      }
    } else if (kind === "network") {     // réseau
      bands(3, H * .86);
      const pts = Array.from({ length: 9 }, () => [30 + r() * (W - 60), 24 + r() * (H * .66)]);
      c.strokeStyle = "rgba(20,18,16,.3)"; c.lineWidth = 1;
      pts.forEach((p, i) => pts.slice(i + 1).forEach(q => {
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 110) { c.beginPath(); c.moveTo(...p); c.lineTo(...q); c.stroke(); }
      }));
      pts.forEach((p, i) => { c.fillStyle = i === 3 ? acc : pick(i + 1); c.beginPath(); c.arc(p[0], p[1], 7, 0, Math.PI * 2); c.fill(); });
    } else if (kind === "books") {       // dos de livres
      let x = 18;
      while (x < W - 18) {
        const w = 14 + r() * 24, hh = H * (.42 + r() * .42);
        c.fillStyle = r() < .14 ? acc : pick(Math.floor(r() * 6));
        c.fillRect(x, H - 24 - hh, w, hh);
        c.strokeStyle = "rgba(233,223,204,.45)"; c.lineWidth = 1;
        c.strokeRect(x + .5, H - 24 - hh + .5, w - 1, hh - 1);
        x += w + 4;
      }
      c.fillStyle = pick(5); c.fillRect(0, H - 24, W, 24);
    } else if (kind === "media") {       // forme d'onde
      bands(3, H * .86);
      for (let i = 0; i < 34; i++) {
        const x = 16 + i * 8, hh = 8 + Math.abs(Math.sin(i * .6) * 54) + r() * 18;
        c.fillStyle = i % 8 === 0 ? acc : pick(i + 1);
        c.fillRect(x, H * .46 - hh / 2, 5, hh);
      }
    } else if (kind === "rdd") {        // régression sur discontinuité
      bands(3, H * .88);
      const cut = W / 2, base = H * .60;
      c.strokeStyle = "rgba(20,18,16,.3)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(18, base + 18); c.lineTo(W - 18, base + 18); c.stroke();
      c.setLineDash([5, 5]); c.strokeStyle = "rgba(20,18,16,.5)";
      c.beginPath(); c.moveTo(cut, 16); c.lineTo(cut, base + 24); c.stroke(); c.setLineDash([]);
      const fy = x => x < cut ? base - 6 - (cut - x) * .10 : base - 50 - (W - x) * .10;
      for (let i = 0; i < 30; i++) {
        const x = 24 + i * ((W - 48) / 29);
        const y = fy(x) + (r() - .5) * 17;
        c.fillStyle = x < cut ? P[4] : acc;
        c.beginPath(); c.arc(x, y, 3.4, 0, Math.PI * 2); c.fill();
      }
      c.lineWidth = 3; c.lineCap = "round";
      c.strokeStyle = P[5];
      c.beginPath(); c.moveTo(24, fy(24)); c.lineTo(cut - 2, fy(cut - 2)); c.stroke();
      c.strokeStyle = acc;
      c.beginPath(); c.moveTo(cut + 2, fy(cut + 2)); c.lineTo(W - 24, fy(W - 24)); c.stroke();
    } else if (kind === "ethnic") {     // atlas des groupes ethniques
      const seeds = Array.from({ length: 11 }, () => [r() * W, r() * H, Math.floor(r() * 6)]);
      const g = 7;
      for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) {
        let best = 0, bd = 1e9;
        seeds.forEach((s, i) => {
          const d = (x - s[0]) ** 2 + (y - s[1]) ** 2;
          if (d < bd) { bd = d; best = i; }
        });
        c.fillStyle = best === 2 ? acc : P[seeds[best][2]];
        c.fillRect(x, y, g + 1, g + 1);
      }
      c.strokeStyle = "rgba(233,223,204,.5)"; c.lineWidth = 1.5;
      seeds.forEach(s => { c.beginPath(); c.arc(s[0], s[1], 3, 0, Math.PI * 2); c.stroke(); });
    } else if (kind === "admin") {      // limites administratives emboîtées
      const rects = [[6, 6, W - 12, H - 12, 0]];
      while (rects.length < 16) {
        let bi = 0, ba = 0;
        rects.forEach(([, , w, hh], i) => { if (w * hh > ba) { ba = w * hh; bi = i; } });
        const [x, y, w, hh, d] = rects.splice(bi, 1)[0];
        const vert = w > hh, f = .34 + r() * .32;
        if (vert) { rects.push([x, y, w * f, hh, d + 1], [x + w * f, y, w * (1 - f), hh, d + 1]); }
        else { rects.push([x, y, w, hh * f, d + 1], [x, y + hh * f, w, hh * (1 - f), d + 1]); }
      }
      rects.forEach(([x, y, w, hh, d], i) => {
        c.fillStyle = i === 4 ? acc : P[(d + i) % 6];
        c.fillRect(x, y, w, hh);
        c.strokeStyle = "#e9dfcc"; c.lineWidth = 2.5; c.strokeRect(x, y, w, hh);
      });
    } else if (kind === "coast") {      // littoral et graticule
      c.fillStyle = P[2]; c.fillRect(0, 0, W, H);
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const y = H * .62 + Math.sin(x * .021) * 26 + Math.sin(x * .053 + 2) * 12;
        c.lineTo(x, y);
      }
      c.lineTo(W, H); c.closePath();
      c.fillStyle = P[1]; c.fill();
      c.strokeStyle = "#141210"; c.lineWidth = 2; c.stroke();
      c.strokeStyle = "rgba(20,18,16,.22)"; c.lineWidth = 1;
      for (let x = W / 5; x < W; x += W / 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = H / 4; y < H; y += H / 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.fillStyle = acc; c.beginPath(); c.arc(W * .68, H * .76, 6, 0, Math.PI * 2); c.fill();
    } else if (kind === "funding") {   // des piles de jetons
      bands(8, H * .34);
      const cols = 5, cw = (W - 44) / cols;
      for (let i = 0; i < cols; i++) {
        const n = 3 + Math.floor(r() * 6), cx = 30 + cw * i + cw * .5, rw = cw * .38, rh = rw * .34;
        for (let k = 0; k < n; k++) {
          const cy = H - 26 - k * rh * 1.25;
          c.fillStyle = pick(i + k);
          c.beginPath(); c.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "rgba(20,18,16,.45)"; c.lineWidth = 1; c.stroke();
        }
        c.fillStyle = i === 2 ? acc : "#3b1f17";
        c.beginPath(); c.ellipse(cx, H - 26 - n * rh * 1.25, rw * .34, rh * .34, 0, 0, Math.PI * 2); c.fill();
      }
    } else if (kind === "jobs") {       // un tableau d'affichage
      bands(8, H * .3);
      for (let i = 0; i < 7; i++) {
        const w = 44 + r() * 38, h = 32 + r() * 26;
        const x = 12 + r() * (W - w - 24), y = 12 + r() * (H - h - 24);
        c.save(); c.translate(x + w / 2, y + h / 2); c.rotate((r() - .5) * .22);
        c.fillStyle = "#e9dfcc"; c.fillRect(-w / 2, -h / 2, w, h);
        c.strokeStyle = "rgba(20,18,16,.4)"; c.lineWidth = 1; c.strokeRect(-w / 2, -h / 2, w, h);
        c.fillStyle = pick(i + 1);
        for (let l = 0; l < 3; l++) c.fillRect(-w / 2 + 6, -h / 2 + 8 + l * 7, (w - 12) * (.45 + r() * .55), 2.5);
        c.fillStyle = i % 3 === 0 ? acc : "#3b1f17";
        c.beginPath(); c.arc(0, -h / 2 + 5, 2.8, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    } else if (kind === "conference") {  // épingles sur la carte
      bands(5, H * .56);
      const pins = [[70, 60], [128, 38], [186, 72], [240, 48], [100, 104], [206, 112]];
      pins.forEach(([x, y], i) => {
        c.fillStyle = i === 1 ? acc : pick(i + 3);
        c.beginPath(); c.arc(x, y, 11, Math.PI, 0); c.lineTo(x, y + 20); c.closePath(); c.fill();
        c.fillStyle = "#e9dfcc"; c.beginPath(); c.arc(x, y - 1, 4, 0, Math.PI * 2); c.fill();
      });
    }
    c.strokeStyle = "rgba(20,18,16,.5)"; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
  }
  const paintIcons = () => document.querySelectorAll("canvas[data-icon]").forEach(drawIcon);
  paintIcons();
  if (document.fonts) document.fonts.ready.then(paintIcons);


  /* ================= Carte de couverture des bases ================= */
  // Une phrase par programme, affichee sous la carte de couverture.
  const COV_DESC = {
    dhs: { fr: "Enquêtes démographiques et de santé : des enquêtes ménages représentatives au niveau national, standardisées d’un pays à l’autre, avec un module sur les violences conjugales et les coordonnées GPS de chaque grappe.",
           en: "Demographic and Health Surveys: nationally representative household surveys, standardised across countries, with a domestic violence module and GPS coordinates for every cluster." },
    afro: { fr: "Des enquêtes d’opinion répétées dans une quarantaine de pays africains : confiance, normes, perception des institutions.",
            en: "Repeated opinion surveys across some forty African countries: trust, norms, perceptions of institutions." },
    latino: { fr: "L’équivalent latino-américain de l’Afrobaromètre. Attention : le site annonce dix-huit pays mais n’en nomme que dix-sept.",
              en: "The Latin American counterpart of Afrobarometer. Note that the site claims eighteen countries but names only seventeen." },
    arab: { fr: "Le même dispositif pour le Moyen-Orient et l’Afrique du Nord, avec des questions sur les attitudes de genre qu’on ne trouve pas ailleurs dans la région.",
            en: "The same design for the Middle East and North Africa, with questions on gender attitudes that are hard to find elsewhere in the region." },
    erf: { fr: "Enquêtes emploi et ménages pour le Moyen-Orient et l’Afrique du Nord, diffusées par l’Economic Research Forum.",
           en: "Labour force and household surveys for the Middle East and North Africa, distributed by the Economic Research Forum." },
    asia: { fr: "Le volet asiatique de la même famille d’enquêtes, pour l’Asie de l’Est et du Sud-Est.",
            en: "The Asian arm of the same family of surveys, covering East and Southeast Asia." },
    lsms: { fr: "Les panels de ménages de la Banque mondiale : consommation, pauvreté et conditions de vie, sur plusieurs vagues.",
            en: "The World Bank’s household panels: consumption, poverty and living standards, over several waves." },
    isa: { fr: "Le volet agricole du LSMS : des pays d’Afrique subsaharienne suivis dans la durée, avec des parcelles géolocalisées.",
           en: "The agricultural arm of the LSMS: sub-Saharan countries followed over time, with geolocated plots." },
    ipums: { fr: "Des microdonnées de recensement harmonisées — utiles pour la migration et pour construire des variables de contexte.",
             en: "Harmonised census microdata — useful for migration and for building context variables." },
    epr: { fr: "Les données de l’ETH Zurich sur les groupes ethniques politiquement pertinents : leur accès au pouvoir exécutif et leur zone de peuplement.",
           en: "ETH Zurich’s data on politically relevant ethnic groups: their access to executive power and their settlement areas." },
    es: { fr: "Des enquêtes auprès des entreprises sur l’environnement des affaires, l’informalité et l’accès au crédit.",
          en: "Firm-level surveys on the business environment, informality and access to credit." },
  };

  function initCoverage() {
    const canvas = document.getElementById("cov-canvas");
    const world = (window.MAPS || {}).world;
    if (!canvas || !world || !world.coverage) return;
    const chips = document.querySelector(".cov-chips");
    const cap = document.querySelector(".cov-cap");
    const desc = document.querySelector(".cov-desc");
    const keys = Object.keys(world.coverage);
    let current = keys[0];

    chips.innerHTML = keys.map(k =>
      `<button class="cov-chip" data-cov="${k}">${world.coverage[k].fr === world.coverage[k].en
        ? world.coverage[k].fr
        : `<span lang="en">${world.coverage[k].en}</span><span lang="fr">${world.coverage[k].fr}</span>`}</button>`
    ).join("");

    const PAL = ["#cdb48c", "#c98a2b", "#a8431f", "#6b2317", "#3b1f17"];
    function draw(key) {
      const cov = world.coverage[key];
      const W = 760, H = Math.round(760 * world.h / world.w), dpr = 2;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#e0401f";
      c.fillStyle = "#e9dfcc"; c.fillRect(0, 0, W, H);
      const s = W / world.w, set = new Set(cov.countries);
      c.save(); c.scale(s, s);
      let i = 0;
      for (const [name, d] of Object.entries(world.shapes)) {
        const p = new Path2D(d), on = set.has(name);
        c.fillStyle = on ? (i++ % 7 === 3 ? acc : PAL[i % PAL.length]) : "#ddcfb6";
        c.fill(p);
        c.strokeStyle = on ? "rgba(20,18,16,.55)" : "rgba(20,18,16,.18)";
        c.lineWidth = (on ? 1 : .6) / s; c.stroke(p);
      }
      c.restore();
      c.strokeStyle = "rgba(20,18,16,.5)"; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
      const label = root.lang === "fr" ? cov.fr : cov.en;
      const word = root.lang === "fr" ? "pays · depuis" : "countries · since";
      cap.textContent = `${label} — ${cov.n} ${word} ${cov.since}`;
      const d = COV_DESC[key];
      if (desc) desc.textContent = d ? (root.lang === "fr" ? d.fr : d.en) : "";
    }
    function select(key) {
      current = key;
      chips.querySelectorAll(".cov-chip").forEach(b => b.classList.toggle("active", b.dataset.cov === key));
      draw(key);
    }
    chips.addEventListener("click", e => {
      const b = e.target.closest(".cov-chip");
      if (b) select(b.dataset.cov);
    });
    select(current);
    return () => draw(current);
  }
  redrawCoverage = initCoverage();


  /* ================= Comparaison des resolutions ================= */
  // Un carre de 50 x 50 km dessine a la maille de chaque base, avec un rayon de 10 km pour l'echelle.
  const GRIDS = [
    { k: "worldpop", fr: "WorldPop", en: "WorldPop", m: 100, lab: "100 m" },
    { k: "viirs", fr: "Lumières nocturnes", en: "Nighttime lights", m: 500, lab: "~500 m" },
    { k: "chirps", fr: "CHIRPS", en: "CHIRPS", m: 5500, lab: "0,05° ≈ 5,5 km", labEn: "0.05° ≈ 5.5 km" },
    { k: "era5", fr: "ERA5", en: "ERA5", m: 31000, lab: "0,25° ≈ 31 km", labEn: "0.25° ≈ 31 km" },
    { k: "spei", fr: "SPEI", en: "SPEI", m: 55000, lab: "0,5° ≈ 55 km", labEn: "0.5° ≈ 55 km" },
    { k: "gadm", fr: "GADM", en: "GADM", vec: "admin",
      note: "limites administratives emboîtées — vecteur, pas de résolution",
      noteEn: "nested administrative boundaries — vector, no resolution" },
    { k: "ne", fr: "Natural Earth", en: "Natural Earth", vec: "coast",
      note: "traits de côte, frontières, fleuves — vecteur au 1:10 m",
      noteEn: "coastlines, borders, rivers — vector at 1:10 m" },
    { k: "murdock", fr: "Carte de Murdock", en: "Murdock’s map", vec: "ethnic",
      note: "territoires ethniques précoloniaux — polygones",
      noteEn: "pre-colonial ethnic territories — polygons" },
    { k: "dplace", fr: "D-PLACE", en: "D-PLACE", vec: "points",
      note: "sociétés géoréférencées — points",
      noteEn: "georeferenced societies — points" },
  ];
  // Une phrase par base, affichee sous la figure des resolutions.
  const GRID_DESC = {
    worldpop: { fr: "Des grilles de population à 100 m, estimées à partir du bâti et des recensements — pour compter les habitants dans un rayon donné.",
          en: "Population grids at 100 m, estimated from built-up areas and censuses — to count people within a given radius." },
    viirs: { fr: "Des composites mensuels et annuels de lumières nocturnes, utilisés comme approximation de l’activité économique locale là où il n’existe pas de données de revenu.",
          en: "Monthly and annual night-light composites, used as a proxy for local economic activity where no income data exist." },
    chirps: { fr: "Les précipitations sur une grille de 0,05° depuis 1981, satellite et stations au sol combinés. La source standard pour les chocs pluviométriques en Afrique.",
          en: "Rainfall on a 0.05° grid since 1981, combining satellite imagery with station data. The standard source for rainfall shocks in Africa." },
    era5: { fr: "Une réanalyse horaire mondiale depuis 1940 : température, précipitations, vent. Plus lourde que CHIRPS, mais elle couvre tout.",
          en: "Hourly global reanalysis since 1940: temperature, precipitation, wind. Heavier than CHIRPS, but it covers everything." },
    spei: { fr: "Un indice de sécheresse standardisé qui combine pluies et évapotranspiration — la façon habituelle de transformer une série de pluies en mesure de stress agricole.",
          en: "A standardised drought index combining rainfall and evapotranspiration — the usual way to turn a rainfall series into a measure of agricultural stress." },
    gadm: { fr: "Les limites administratives de tous les pays, du niveau national jusqu’au plus petit échelon — ce qui sert à agréger les données à un niveau donné.",
          en: "Administrative boundaries for every country, from national down to the smallest tier — what you use to aggregate data at a given level." },
    ne: { fr: "Traits de côte, frontières, fleuves et villes au 1:10 m, dans le domaine public. C’est le fond de carte, pas une source de variables.",
          en: "Coastlines, borders, rivers and cities at 1:10 m, in the public domain. This is the base layer, not a source of variables." },
    murdock: { fr: "L’atlas ethnographique de Murdock cartographié : les territoires des groupes ethniques africains avant la colonisation. C’est un atlas d’ethnicité, pas une grille de données.",
          en: "Murdock’s Ethnographic Atlas mapped: the territories of African ethnic groups before colonisation. It is an atlas of ethnicity, not a data grid." },
    dplace: { fr: "Des sociétés géoréférencées reliées à leurs pratiques culturelles — la version ouverte et étendue de l’atlas ethnographique.",
          en: "Georeferenced societies linked to their cultural practices — the open, extended version of the ethnographic atlas." },
  };

  function initGrids() {
    const canvas = document.getElementById("grid-canvas");
    if (!canvas) return;
    const chips = document.querySelector(".grid-chips");
    const cap = document.querySelector(".grid-cap");
    const desc = document.querySelector(".grid-desc");
    let current = GRIDS[0].k;
    chips.innerHTML = GRIDS.map(g =>
      `<button class="grid-chip" data-grid="${g.k}">${g.fr === g.en ? g.fr
        : `<span lang="en">${g.en}</span><span lang="fr">${g.fr}</span>`}</button>`).join("");

    const SIDE_M = 50000;          // 50 km de cote
    const PAL = ["#e3d5bd", "#cdb48c", "#c98a2b", "#a8431f", "#6b2317"];

    // Les quatre dernieres bases ne sont pas des grilles : on dessine ce qu'elles sont.
    function drawVector(c, W, H, kind) {
      const r = rng(kind.length * 97 + 11);
      if (kind === "admin") {
        const split = (x, y, w, h, d) => {
          if (d === 0 || w < 38 || h < 38) {
            c.fillStyle = PAL[Math.floor(r() * 3)];
            c.fillRect(x, y, w + 1, h + 1);
            return;
          }
          const vert = w >= h, f = .34 + r() * .32;
          if (vert) {
            split(x, y, w * f, h, d - 1); split(x + w * f, y, w * (1 - f), h, d - 1);
            c.strokeStyle = "#e9dfcc"; c.lineWidth = d * 1.5;
            c.beginPath(); c.moveTo(x + w * f, y); c.lineTo(x + w * f, y + h); c.stroke();
          } else {
            split(x, y, w, h * f, d - 1); split(x, y + h * f, w, h * (1 - f), d - 1);
            c.strokeStyle = "#e9dfcc"; c.lineWidth = d * 1.5;
            c.beginPath(); c.moveTo(x, y + h * f); c.lineTo(x + w, y + h * f); c.stroke();
          }
        };
        split(0, 0, W, H, 4);
      } else if (kind === "coast") {
        c.fillStyle = "#b7c9c0"; c.fillRect(0, 0, W, H);          // la mer
        const pts = [];
        for (let x = 0; x <= W; x += 8)
          pts.push([x, H * .54 + Math.sin(x / W * 6.2) * H * .13 + Math.cos(x / W * 13.5) * H * .05 + (r() - .5) * 5]);
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(p => c.lineTo(p[0], p[1]));
        c.lineTo(W, H); c.lineTo(0, H); c.closePath();
        c.fillStyle = PAL[1]; c.fill();
        c.strokeStyle = "rgba(20,18,16,.2)"; c.lineWidth = 1;     // graticule
        for (let i = 1; i < 5; i++) {
          c.beginPath(); c.moveTo(W * i / 5, 0); c.lineTo(W * i / 5, H); c.stroke();
          c.beginPath(); c.moveTo(0, H * i / 5); c.lineTo(W, H * i / 5); c.stroke();
        }
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);            // le trait de cote
        pts.forEach(p => c.lineTo(p[0], p[1]));
        c.strokeStyle = "#3b1f17"; c.lineWidth = 1.8; c.stroke();
      } else if (kind === "ethnic") {
        const n = 9, seeds = [];
        for (let i = 0; i < n; i++) seeds.push({ x: r() * W, y: r() * H, col: PAL[i % PAL.length] });
        const step = 2;
        for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
          let bi = 0, bd = 1e9;
          for (let i = 0; i < n; i++) {
            const dx = x - seeds[i].x, dy = y - seeds[i].y, d = dx * dx + dy * dy;
            if (d < bd) { bd = d; bi = i; }
          }
          c.fillStyle = seeds[bi].col; c.fillRect(x, y, step + 1, step + 1);
        }
        seeds.forEach(sd => {
          c.fillStyle = "#e9dfcc"; c.beginPath(); c.arc(sd.x, sd.y, 3.4, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "#3b1f17"; c.lineWidth = 1.2; c.stroke();
        });
      } else {                                                     // points : D-PLACE
        c.fillStyle = PAL[1]; c.fillRect(0, 0, W, H);
        const band = (y0, amp, col) => {                           // un terrain doux, sans maille
          c.beginPath(); c.moveTo(0, y0);
          for (let x = 0; x <= W; x += 6) c.lineTo(x, y0 + Math.sin(x / W * 5 + y0) * amp);
          c.lineTo(W, H); c.lineTo(0, H); c.closePath();
          c.fillStyle = col; c.fill();
        };
        band(H * .34, H * .07, PAL[0]);
        band(H * .68, H * .06, PAL[2]);
        for (let i = 0; i < 24; i++) {
          const x = 14 + r() * (W - 28), y = 14 + r() * (H - 28);
          c.fillStyle = "#3b1f17"; c.beginPath(); c.arc(x, y, 3.4, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "#e9dfcc"; c.lineWidth = 1.3; c.stroke();
        }
      }
    }

    function draw(key) {
      const g = GRIDS.find(x => x.k === key) || GRIDS[0];
      const W = 640, H = 640, dpr = 2;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#e0401f";
      c.fillStyle = "#e9dfcc"; c.fillRect(0, 0, W, H);

      let cells = 0;
      if (g.vec) drawVector(c, W, H, g.vec); else {
      cells = Math.max(1, Math.round(SIDE_M / g.m));
      const px = W / cells, r = rng(5);
      const fine = px < 2;
      for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
        // un relief doux, pour que la maille se lise
        const v = (Math.sin(x / cells * 5.5) + Math.cos(y / cells * 4.2)) * .25 + .5 + r() * .18;
        c.fillStyle = PAL[Math.min(PAL.length - 1, Math.max(0, Math.floor(v * PAL.length)))];
        c.fillRect(x * px, y * px, Math.ceil(px) + (fine ? 0 : .5), Math.ceil(px) + (fine ? 0 : .5));
      }
      if (!fine && px > 6) {                       // trait de maille quand elle est lisible
        c.strokeStyle = "rgba(233,223,204,.5)"; c.lineWidth = 1;
        for (let i = 1; i < cells; i++) {
          c.beginPath(); c.moveTo(i * px, 0); c.lineTo(i * px, H); c.stroke();
          c.beginPath(); c.moveTo(0, i * px); c.lineTo(W, i * px); c.stroke();
        }
      }
      }
      // rayon de 10 km
      const rad = W * (10000 / SIDE_M);
      c.strokeStyle = acc; c.lineWidth = 2.5;
      c.beginPath(); c.arc(W / 2, H / 2, rad, 0, Math.PI * 2); c.stroke();
      c.fillStyle = acc; c.beginPath(); c.arc(W / 2, H / 2, 3.5, 0, Math.PI * 2); c.fill();
      c.font = "500 11px 'IBM Plex Mono', monospace"; c.textBaseline = "middle";
      const t = root.lang === "fr" ? "10 km" : "10 km", tw = c.measureText(t).width;
      c.fillStyle = "rgba(233,223,204,.92)"; c.fillRect(W / 2 + 7, H / 2 - rad - 9, tw + 8, 17);
      c.fillStyle = "#141210"; c.fillText(t, W / 2 + 11, H / 2 - rad);

      c.strokeStyle = "rgba(20,18,16,.5)"; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
      const label = root.lang === "fr" ? g.fr : g.en;
      if (g.vec) {
        cap.textContent = `${label} — ${root.lang === "fr" ? g.note : (g.noteEn || g.note)}`;
      } else {
        const size = root.lang === "fr" ? g.lab : (g.labEn || g.lab);
        const word = root.lang === "fr"
          ? `${cells} × ${cells} cellules sur 50 km`
          : `${cells} × ${cells} cells across 50 km`;
        cap.textContent = `${label} — ${size} · ${word}`;
      }
      const d = GRID_DESC[g.k];
      if (desc) desc.textContent = d ? (root.lang === "fr" ? d.fr : d.en) : "";
    }
    function select(k) {
      current = k;
      chips.querySelectorAll(".grid-chip").forEach(b => b.classList.toggle("active", b.dataset.grid === k));
      draw(k);
    }
    chips.addEventListener("click", e => {
      const b = e.target.closest(".grid-chip");
      if (b) select(b.dataset.grid);
    });
    select(current);
    return () => draw(current);
  }
  redrawGrids = initGrids();


  /* ================= Vignettes de chaque ressource ================= */
  function drawThumb(canvas) {
    const W = 184, H = 132, dpr = 2;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#e0401f";
    c.fillStyle = "#e9dfcc"; c.fillRect(0, 0, W, H);
    const covKey = canvas.dataset.rowcov, gridKey = canvas.dataset.rowgrid;
    const world = (window.MAPS || {}).world;

    if (covKey && world && world.coverage && world.coverage[covKey]) {
      const s = Math.min(W / world.w, H / world.h);
      const ox = (W - world.w * s) / 2, oy = (H - world.h * s) / 2;
      c.save(); c.translate(ox, oy); c.scale(s, s);
      const set = new Set(world.coverage[covKey].countries);
      for (const [name, d] of Object.entries(world.shapes)) {
        const p = new Path2D(d);
        c.fillStyle = set.has(name) ? acc : "#ddcfb6"; c.fill(p);
      }
      c.restore();
    } else if (gridKey) {
      const g = GRIDS.find(x => x.k === gridKey);
      const cells = g ? Math.max(1, Math.round(50000 / g.m)) : 8;
      const px = W / cells, r = rng(5), PAL = ["#e3d5bd", "#cdb48c", "#c98a2b", "#a8431f", "#6b2317"];
      const rows = Math.ceil(H / px);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cells; x++) {
        const v = (Math.sin(x / cells * 5.5) + Math.cos(y / rows * 4.2)) * .25 + .5 + r() * .18;
        c.fillStyle = PAL[Math.min(PAL.length - 1, Math.max(0, Math.floor(v * PAL.length)))];
        c.fillRect(x * px, y * px, Math.ceil(px) + .5, Math.ceil(px) + .5);
      }
      const rad = W * (10000 / 50000);
      c.strokeStyle = acc; c.lineWidth = 2;
      c.beginPath(); c.arc(W / 2, H / 2, rad, 0, Math.PI * 2); c.stroke();
    } else {
      // variation du motif de la rubrique
      const block = canvas.closest(".res-block");
      const src = block && block.querySelector(".sec-art");
      const tmp = document.createElement("canvas");
      tmp.dataset.icon = canvas.dataset.icon || (src ? src.dataset.icon : "survey");
      tmp.dataset.seed = canvas.dataset.seed;
      drawIcon(tmp);
      c.drawImage(tmp, 0, 0, W, H);
    }
    c.strokeStyle = "rgba(20,18,16,.45)"; c.lineWidth = 1.5; c.strokeRect(.75, .75, W - 1.5, H - 1.5);
  }
  const paintThumbs = () => document.querySelectorAll("canvas.row-art").forEach(drawThumb);
  paintThumbs();
  if (document.fonts) document.fonts.ready.then(paintThumbs);

  /* ================= Sommaire des ressources ================= */
  document.querySelectorAll("[data-jump]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const t = document.getElementById(a.dataset.jump);
    if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }));

  /* ================= Ressources : filtre par public ================= */
  const resBlocks = [...document.querySelectorAll(".res-block")];
  // L'etiquette visible est engendree depuis data-kind : les deux ne peuvent plus diverger.
  const KIND_LABEL = {
    these:      ["Doctoral funding", "Bourse de thèse"],
    recherche:  ["Research", "Recherche"],
    terrain:    ["Fieldwork", "Terrain"],
    visiting:   ["Visiting", "Séjour"],
    postdoc:    ["Postdoc", "Postdoc"],
    repertoire: ["Directory", "Répertoire"],
  };
  document.querySelectorAll(".res-list li[data-kind]").forEach(li => {
    const tag = li.querySelector(".res-tag");
    if (!tag) return;
    tag.innerHTML = li.dataset.kind.split(" ").filter(k => KIND_LABEL[k])
      .map(k => `<span lang="en">${KIND_LABEL[k][0]}</span><span lang="fr">${KIND_LABEL[k][1]}</span>`)
      .join(" · ");
  });

  let curAud = "all";
  function setAudience(aud) {
    curAud = aud;
    document.querySelectorAll(".res-filter").forEach(b => b.classList.toggle("active", b.dataset.audience === aud));
    resBlocks.forEach(block => {
      let shown = 0;
      const bar = block.querySelector(".kind-chips");
      const kind = bar ? (bar.dataset.current || "all") : "all";
      block.querySelectorAll(".res-list li").forEach(li => {
        const okA = aud === "all" || li.dataset.level.split(" ").includes(aud);
        const okK = kind === "all" || (li.dataset.kind || "").split(" ").includes(kind);
        const ok = okA && okK;
        li.hidden = !ok;
        if (ok) shown++;
      });
      const tbl = block.querySelector(".res-table-wrap");
      if (tbl) {
        const okT = aud === "all" || tbl.dataset.level.split(" ").includes(aud);
        tbl.hidden = !okT;
        if (okT) shown++;
      }
      block.classList.toggle("is-empty", shown === 0);
      const jump = document.querySelector(`[data-jump="${block.id}"]`);
      if (jump) jump.hidden = shown === 0;
    });
  }
  document.querySelectorAll(".res-filter").forEach(b =>
    b.addEventListener("click", () => setAudience(b.dataset.audience)));
  document.querySelectorAll(".kind-chips").forEach(bar => {
    bar.dataset.current = "all";
    bar.addEventListener("click", e => {
      const b = e.target.closest(".kind-chip");
      if (!b) return;
      bar.dataset.current = b.dataset.kind;
      bar.querySelectorAll(".kind-chip").forEach(x => x.classList.toggle("active", x === b));
      setAudience(curAud);
    });
  });
  if (resBlocks.length) setAudience("all");



  /* ================= Carte des conferences ================= */

  /* ================= Tableau des conferences : filtre et tri ================= */
  const confTable = document.getElementById("conf-table");
  if (confTable) {
    const tbody = confTable.tBodies[0];
    const allRows = [...tbody.rows];
    let field = "all", sortKey = null, sortDir = 1;
    function renderConf() {
      const rows = allRows.slice();
      if (sortKey) rows.sort((a, b) => {
        const va = sortKey === "month" ? +a.dataset.month : a.dataset.name.toLowerCase();
        const vb = sortKey === "month" ? +b.dataset.month : b.dataset.name.toLowerCase();
        return (va > vb ? 1 : va < vb ? -1 : 0) * sortDir;
      });
      rows.forEach(r => {
        r.hidden = field === "open" ? !r.dataset.open : (field !== "all" && r.dataset.field !== field);
        tbody.appendChild(r);
      });
    }
    document.querySelectorAll(".conf-chip").forEach(c => c.addEventListener("click", () => {
      field = c.dataset.field;
      document.querySelectorAll(".conf-chip").forEach(x => x.classList.toggle("active", x === c));
      renderConf();
    }));
    document.querySelectorAll(".th-sort").forEach(th => th.addEventListener("click", () => {
      sortDir = sortKey === th.dataset.sort ? -sortDir : 1;
      sortKey = th.dataset.sort;
      document.querySelectorAll(".th-sort").forEach(x => {
        x.classList.remove("asc", "desc");
        if (x === th) x.classList.add(sortDir === 1 ? "asc" : "desc");
      });
      renderConf();
    }));
  }

  /* ================= Copier l'email ================= */
  const toast = document.getElementById("toast");
  document.getElementById("copy-mail").addEventListener("click", async e => {
    try { await navigator.clipboard.writeText(e.currentTarget.dataset.mail); } catch (err) {}
    toast.textContent = root.lang === "fr" ? "Adresse copiée" : "Address copied";
    toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1900);
  });

  const nav = document.querySelector(".nav"), stage = document.querySelector(".stage");
  const onScroll = () => nav.classList.toggle("solid", scrollY > stage.offsetHeight - 70);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  document.getElementById("to-top").addEventListener("click", e => {
    e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });
})();
