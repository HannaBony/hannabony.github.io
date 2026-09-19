(function () {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  function titleFor(view) {
    return view.dataset["title" + (root.lang === "fr" ? "Fr" : "En")] || "";
  }
  function show(name, scroll) {
    if (!names.includes(name)) name = "home";
    const view = views.find(v => v.dataset.view === name);
    views.forEach(v => v.classList.toggle("active", v === view));
    tabs.forEach(a => a.classList.toggle("active", a.dataset.tab === name));
    document.body.dataset.view = name;
    pageTitle.textContent = titleFor(view);
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
    if (active) pageTitle.textContent = titleFor(active);
  }
  setLang(store.get("lang") || ((navigator.language || "en").startsWith("fr") ? "fr" : "en"));
  langBtn.addEventListener("click", () => setLang(root.lang === "en" ? "fr" : "en"));

  function setTheme(th) { root.dataset.theme = th; store.set("theme-galerie", th); strata.redraw(); }
  setTheme(store.get("theme-galerie") || "light");
  document.getElementById("theme-toggle").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

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
