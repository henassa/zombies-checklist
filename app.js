(function () {
  "use strict";

  const STORE_KEY = "zombies-checklist-v1";
  const SECTIONS = [
    ["ee", "Easter egg principal", true],   // true : liste numérotée
    ["ww", "Armes miracle", false],
    ["side", "Quêtes secondaires", false],
    ["secrets", "Secrets et bonus", false],
    ["relics", "Reliques (mode Cursed)", false],
    ["darkops", "Dark Ops", false],
    ["bestiary", "Bestiaire", false],
    ["obj", "Objectifs", false],
    ["custom", "Mes objectifs perso", false]
  ];
  const STD_ROUNDS = ["Atteindre la manche 30", "Atteindre la manche 50", "Atteindre la manche 100"];

  // couleur et abréviation des tuiles
  const LOOK = {
    all:      { c: "#8E8E93", a: "Tout" },
    waw:      { c: "#A2845E", a: "WaW" },
    bo1:      { c: "#FF9500", a: "BO1" },
    bo2:      { c: "#FF3B30", a: "BO2" },
    aw:       { c: "#30B0C7", a: "AW" },
    bo3:      { c: "#AF52DE", a: "BO3" },
    iw:       { c: "#32ADE6", a: "IW" },
    ww2:      { c: "#8E8E93", a: "WW2" },
    bo4:      { c: "#5856D6", a: "BO4" },
    cw:       { c: "#007AFF", a: "CW" },
    vanguard: { c: "#00C7BE", a: "VG" },
    mw3:      { c: "#34C759", a: "MW3" },
    bo6:      { c: "#FF2D55", a: "BO6" },
    bo7:      { c: "#E5A000", a: "BO7" }
  };
  const look = (id) => LOOK[id] || { c: "#007AFF", a: id.toUpperCase().slice(0, 3) };

  window.ZOMBIES_DATA.sort((a, b) => a.year - b.year);
  const ALL_MAPS = window.ZOMBIES_DATA.flatMap((g) => g.maps);
  const GAME_OF = new Map();
  for (const g of window.ZOMBIES_DATA) for (const m of g.maps) GAME_OF.set(m.id, g);
  const TIPS = window.ZOMBIES_TIPS || {};
  const tipFor = (mapId, text) => (TIPS[mapId] && TIPS[mapId][text]) || null;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let state = load();
  let currentGame = state.ui.game || "all";
  let openMaps = new Set(state.ui.open || []);
  let showTips = !!state.ui.tips;
  const openTips = new Set();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && raw.done) return { done: migrate(raw.done), custom: raw.custom || {}, ui: raw.ui || {} };
    } catch (e) {}
    return { done: {}, custom: {}, ui: {} };
  }
  // anciennes clés -> nouvelles, voir ZOMBIES_RENAMES / ZOMBIES_MOVES dans data.js
  function migrate(done) {
    const R = window.ZOMBIES_RENAMES || {};
    const M = window.ZOMBIES_MOVES || {};
    const out = {};
    for (const [key, val] of Object.entries(done)) {
      const parts = key.split("|");
      let mapId = parts[0];
      const sec = parts[1];
      let text = parts.slice(2).join("|");
      if (R[mapId] && R[mapId][text]) text = R[mapId][text];
      if (M[mapId] && M[mapId][text]) mapId = M[mapId][text];
      if (R[mapId] && R[mapId][text]) text = R[mapId][text];
      out[mapId + "|" + sec + "|" + text] = val;
    }
    return out;
  }
  function save() {
    state.ui = { game: currentGame, open: [...openMaps], tips: showTips };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function sectionsFor(map) {
    const out = [];
    for (const [key, label, ordered] of SECTIONS) {
      let items = key === "custom" ? (state.custom[map.id] || []) : (map[key] || []).slice();
      if (key === "obj" && map.std) items = items.concat(STD_ROUNDS);
      if (items.length) out.push({ key, label, ordered, items });
      // variantes (Maxis / Richtofen…) juste après la quête principale
      if (key === "ee") {
        for (const p of map.paths || []) {
          if (p.items && p.items.length) out.push({ key: "path-" + p.key, label: p.label, ordered: true, items: p.items.slice() });
        }
        if (map.eeEnd && map.eeEnd.length) out.push({ key: "eeEnd", label: "Étape finale", ordered: true, items: map.eeEnd.slice() });
      }
    }
    return out;
  }
  const itemId = (mapId, key, text) => mapId + "|" + key + "|" + text;

  function mapStats(map) {
    let total = 0, done = 0;
    for (const s of sectionsFor(map)) for (const t of s.items) {
      total++; if (state.done[itemId(map.id, s.key, t)]) done++;
    }
    return { total, done };
  }
  function statsOf(maps) {
    let total = 0, done = 0;
    for (const m of maps) { const s = mapStats(m); total += s.total; done += s.done; }
    return { total, done };
  }
  const pct = (s) => (s.total ? Math.round((s.done / s.total) * 100) : 0);

  const $ = (sel) => document.querySelector(sel);
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function svg(path, cls, stroke) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", stroke || "2.5");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true"); s.setAttribute("class", cls);
    s.innerHTML = path; return s;
  }
  function bar(p, color) {
    const b = el("div", "h-1 rounded-full bg-fill overflow-hidden");
    const f = el("div", "bar-fill h-full rounded-full");
    f.style.width = p + "%"; f.style.background = color; b.append(f); return b;
  }
  function highlight(node, text, q) {
    const i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i < 0) { node.textContent = text; return; }
    node.append(text.slice(0, i), el("mark", "bg-[#FFD60A]/60 text-inherit rounded-[3px] px-px", text.slice(i, i + q.length)), text.slice(i + q.length));
  }
  // repliable via grid-template-rows, voir .fold dans le CSS
  function collapsible(open) {
    const wrap = el("div", "fold");
    if (open) wrap.dataset.open = "";
    const inner = el("div");
    wrap.append(inner);
    return { wrap, inner };
  }
  function setOpen(wrap, open) {
    if (open) {
      void wrap.offsetHeight;
      wrap.dataset.open = "";
    } else delete wrap.dataset.open;
  }
  function tweenNumber(node, to, suffix) {
    const from = parseInt(node.dataset.v || "0", 10);
    node.dataset.v = String(to);
    if (REDUCED || from === to) { node.firstChild.nodeValue = String(to); return; }
    const t0 = performance.now(), dur = 420;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      node.firstChild.nodeValue = String(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function pop(node) {
    if (REDUCED || !node) return;
    node.classList.remove("pop"); void node.offsetWidth; node.classList.add("pop");
  }

  const navRefs = new Map();
  const cardRefs = new Map();

  function renderGlobal() {
    const s = statsOf(ALL_MAPS);
    $("#globalCount").textContent = s.done + " sur " + s.total + " objectifs cochés (" + pct(s) + " %)";
  }

  function renderNav() {
    const nav = $("#games"); nav.innerHTML = ""; navRefs.clear();
    const entries = [{ id: "all", name: "Tous les jeux", maps: ALL_MAPS }, ...window.ZOMBIES_DATA];
    for (const g of entries) {
      const s = statsOf(g.maps);
      const { c, a } = look(g.id);
      const active = g.id === currentGame;
      const b = el("button",
        "tile text-left rounded-xl p-3 pb-2.5 flex flex-col gap-2 " + (active ? "text-white" : "bg-cell"));
      b.type = "button";
      b.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) b.style.background = c;

      const top = el("div", "flex items-start justify-between");
      const icon = el("span", "size-8 rounded-full grid place-items-center text-[10px] font-bold tracking-tighter", a);
      if (active) { icon.style.background = "#fff"; icon.style.color = c; }
      else { icon.style.background = c; icon.style.color = "#fff"; }
      const num = el("span", "font-display text-[26px] leading-none font-bold tabular-nums");
      const val = el("span", null, String(pct(s))); val.dataset.v = String(pct(s));
      num.append(val, el("span", "text-[15px] font-semibold " + (active ? "text-white/80" : "text-label2"), " %"));
      top.append(icon, num);

      const name = el("span", "text-[15px] font-semibold leading-tight " + (active ? "" : "text-label2"), g.name);
      b.append(top, name);
      b.addEventListener("click", () => {
        if (currentGame === g.id) return;
        currentGame = g.id; save(); renderNav(); renderMain(true);
        const top = $("#main").getBoundingClientRect().top + window.scrollY - 56;
        if (window.scrollY > top) window.scrollTo({ top, behavior: REDUCED ? "auto" : "smooth" });
      });
      navRefs.set(g.id, val);
      nav.append(b);
    }
  }

  function updateNav() {
    const entries = [{ id: "all", maps: ALL_MAPS }, ...window.ZOMBIES_DATA];
    for (const g of entries) {
      const node = navRefs.get(g.id);
      if (node) tweenNumber(node, pct(statsOf(g.maps)));
    }
  }

  // met à jour les compteurs sans tout redessiner
  function updateCardHeader(map) {
    const r = cardRefs.get(map.id); if (!r) return;
    const st = mapStats(map);
    const complete = st.total > 0 && st.done === st.total;
    r.count.textContent = st.done + "/" + st.total;
    r.fill.style.width = pct(st) + "%";
    if (complete && !r.badge.isConnected) { r.badgeSlot.append(r.badge); pop(r.badge); r.card.classList.add("glow"); setTimeout(() => r.card.classList.remove("glow"), 900); }
    if (!complete && r.badge.isConnected) r.badge.remove();
    for (const [key, node] of r.secCounts) {
      const sec = sectionsFor(map).find((x) => x.key === key);
      if (sec) node.textContent = sec.items.filter((t) => state.done[itemId(map.id, key, t)]).length + "/" + sec.items.length;
    }
    const game = GAME_OF.get(map.id);
    const gHead = document.querySelector('[data-game-stats="' + game.id + '"]');
    if (gHead) { const gs = statsOf(game.maps); gHead.textContent = gs.done + " sur " + gs.total + " cochés, sorti en " + game.year; }
  }

  function afterToggle(map) {
    updateCardHeader(map); updateNav(); renderGlobal(); save();
  }

  function buildRow(map, s, it, q, color) {
    const checked = !!state.done[it.id];
    const tip = s.key === "custom" ? null : tipFor(map.id, it.t);
    const li = el("li", "row");
    const rowWrap = el("div", "row-anim");
    const line = el("div", "flex items-start");
    const lab = el("label", "flex-1 min-w-0 flex items-start gap-3 pl-4 py-[11px] cursor-pointer active:bg-fill/60 " + (tip || s.key === "custom" ? "pr-1" : "pr-4"));
    const cb = el("input", "check"); cb.type = "checkbox"; cb.checked = checked;
    const txt = el("span", "item-text flex-1 text-[16px] leading-snug " + (checked ? "is-done" : ""));
    if (s.ordered) txt.append(el("span", "text-label3 tabular-nums mr-1.5", (it.i + 1) + "."));
    const inner = el("span"); highlight(inner, it.t, q); txt.append(inner);
    lab.append(cb, txt);
    line.append(lab);

    cb.addEventListener("change", () => {
      if (cb.checked) state.done[it.id] = Date.now(); else delete state.done[it.id];
      txt.classList.toggle("is-done", cb.checked);
      if (cb.checked) { pop(cb); if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} }
      afterToggle(map);
      if (cb.checked && $("#hideDone").checked) {
        if (REDUCED) { li.remove(); return; }
        setTimeout(() => {
          rowWrap.style.height = rowWrap.offsetHeight + "px"; void rowWrap.offsetHeight;
          rowWrap.classList.add("leaving");
          rowWrap.addEventListener("transitionend", () => li.remove(), { once: true });
        }, 350);
      }
    });

    let tipBox = null;
    if (tip) {
      const open = showTips || openTips.has(it.id);
      const tb = el("button", "tip-btn shrink-0 mt-[7px] mr-3 size-[30px] rounded-full grid place-items-center " + (open ? "is-open" : ""));
      tb.type = "button";
      tb.setAttribute("aria-label", "Voir l'indice");
      tb.setAttribute("aria-expanded", open ? "true" : "false");
      tb.style.setProperty("--c", color);
      tb.append(svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>', "size-[17px]", "2"));
      tipBox = collapsible(open);
      const p = el("p", "tip-text mx-4 mb-2.5 ml-[50px] rounded-[10px] px-3 py-2 text-[14px] leading-snug text-label2", tip);
      tipBox.inner.append(p);
      tb.addEventListener("click", () => {
        const now = !("open" in tipBox.wrap.dataset);
        setOpen(tipBox.wrap, now);
        tb.classList.toggle("is-open", now);
        tb.setAttribute("aria-expanded", now ? "true" : "false");
        if (now) openTips.add(it.id); else openTips.delete(it.id);
      });
      line.append(tb);
    }

    if (s.key === "custom") {
      const del = el("button", "shrink-0 self-center pr-4 pl-2 text-[15px] text-[#FF3B30] active:opacity-50", "Retirer"); del.type = "button";
      del.addEventListener("click", () => {
        state.custom[map.id] = (state.custom[map.id] || []).filter((x) => x !== it.t);
        delete state.done[it.id]; save(); renderMain(); updateNav(); renderGlobal();
      });
      line.append(del);
    }
    rowWrap.append(line);
    if (tipBox) rowWrap.append(tipBox.wrap);
    li.append(rowWrap);
    return li;
  }

  function buildBody(map, color, secs, all, q, refs) {
    const body = el("div", "pb-1");
    if (map.note) body.append(el("p", "px-4 -mt-1 pb-2 text-[13px] text-label2", map.note));

    for (const s of secs) {
      const full = all.find((x) => x.key === s.key).items;
      const doneCount = full.filter((t) => state.done[itemId(map.id, s.key, t)]).length;
      const h4 = el("h4", "flex items-baseline justify-between px-4 pt-3 pb-1.5 text-[13px] font-semibold text-label2");
      const cnt = el("span", "font-normal tabular-nums", doneCount + "/" + full.length);
      refs.secCounts.set(s.key, cnt);
      h4.append(el("span", null, s.label), cnt);
      const list = el(s.ordered ? "ol" : "ul", "border-t-[0.5px] border-sep");
      for (const it of s.items) list.append(buildRow(map, s, it, q, color));
      body.append(h4, list);
    }

    const form = el("form", "flex items-center gap-3 px-4 py-[11px] mt-2 border-t-[0.5px] border-sep");
    const plus = el("span", "size-[22px] rounded-full grid place-items-center text-white shrink-0");
    plus.style.background = color;
    plus.append(svg('<path d="M12 6v12M6 12h12"/>', "size-3.5", "3"));
    const input = el("input", "flex-1 min-w-0 bg-transparent text-[16px] placeholder:text-label2 outline-none");
    input.type = "text"; input.placeholder = "Ajouter un objectif"; input.maxLength = 200;
    input.setAttribute("enterkeyhint", "done");
    const add = el("button", "text-[15px] font-semibold text-tint active:opacity-50", "Ajouter"); add.type = "submit";
    form.append(plus, input, add);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim(); if (!v) return;
      const list = state.custom[map.id] || (state.custom[map.id] = []);
      if (!list.includes(v)) list.push(v);
      save(); renderMain(); updateNav(); renderGlobal();
    });

    const reset = el("button", "w-full py-[11px] text-[16px] text-[#FF3B30] border-t-[0.5px] border-sep active:bg-fill/60", "Tout décocher");
    reset.type = "button";
    reset.addEventListener("click", () => {
      if (!confirm("Décocher tous les objectifs de « " + map.name + " » ?")) return;
      for (const k of Object.keys(state.done)) if (k.startsWith(map.id + "|")) delete state.done[k];
      save(); renderMain(); updateNav(); renderGlobal();
    });

    body.append(form, reset);
    return body;
  }

  function renderMain(animate) {
    const main = $("#main"); main.innerHTML = ""; cardRefs.clear();
    const q = $("#search").value.trim().toLowerCase();
    const hideDone = $("#hideDone").checked;
    const games = currentGame === "all" ? window.ZOMBIES_DATA : window.ZOMBIES_DATA.filter((g) => g.id === currentGame);
    let shown = 0, cardIndex = 0;

    for (const game of games) {
      const color = look(game.id).c;
      const section = el("section", "mb-10 scroll-mt-16");
      const head = el("div", "px-1 mb-3");
      const h2 = el("h2", "font-display text-[28px] font-bold tracking-tight leading-tight", game.name);
      h2.style.color = color;
      const gs = statsOf(game.maps);
      const gp = el("p", "text-[15px] text-label2", gs.done + " sur " + gs.total + " cochés, sorti en " + game.year);
      gp.dataset.gameStats = game.id;
      head.append(h2, gp);
      section.append(head);
      let mapsShown = 0;

      for (const map of game.maps) {
        const mapMatch = !q || map.name.toLowerCase().includes(q) || game.name.toLowerCase().includes(q) || (map.quest || "").toLowerCase().includes(q) || (map.tag || "").toLowerCase().includes(q);
        const all = sectionsFor(map);
        const secs = all.map((s) => ({
          ...s,
          items: s.items.map((t, i) => ({ t, i, id: itemId(map.id, s.key, t) }))
            .filter((it) => (mapMatch || it.t.toLowerCase().includes(q) || (q && (tipFor(map.id, it.t) || "").toLowerCase().includes(q))) && !(hideDone && state.done[it.id]))
        })).filter((s) => s.items.length);
        const st = mapStats(map);
        const complete = st.total > 0 && st.done === st.total;
        if (hideDone && complete) continue;
        if (!secs.length && !mapMatch) continue;

        const open = openMaps.has(map.id) || (q && !mapMatch);
        const card = el("article", "map-card rounded-xl bg-cell mb-3 overflow-hidden");
        card.style.setProperty("--c", color);
        if (animate && !REDUCED && cardIndex < 14) {
          card.classList.add("enter");
          card.style.animationDelay = (cardIndex * 28) + "ms";
        }
        cardIndex++;

        const btn = el("button", "w-full text-left px-4 py-3 flex flex-col gap-2 active:bg-fill/60 transition-colors");
        btn.type = "button";
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        const line = el("div", "flex items-center gap-2");
        const title = el("h3", "text-[17px] font-semibold leading-snug");
        highlight(title, map.name, q);
        line.append(title);
        if (map.type === "survie") line.append(el("span", "rounded-full bg-fill text-label2 text-[12px] font-medium px-2 py-0.5", "Survie"));
        if (map.tag) line.append(el("span", "rounded-full bg-fill text-label2 text-[12px] font-medium px-2 py-0.5 whitespace-nowrap", map.tag));
        const badgeSlot = el("span", "contents");
        const badge = el("span", "rounded-full text-white text-[12px] font-semibold pl-1.5 pr-2 py-0.5 inline-flex items-center gap-1");
        badge.style.background = color;
        badge.append(svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', "size-3", "3.2"), "Terminé");
        if (complete) badgeSlot.append(badge);
        line.append(badgeSlot);
        const count = el("span", "text-[15px] text-label2 tabular-nums", st.done + "/" + st.total);
        const chev = svg('<path d="M9 5l7 7-7 7"/>', "chev size-4 text-label3 " + (open ? "rotate-90" : ""), "2.8");
        line.append(el("span", "flex-1"), count, chev);
        btn.append(line);
        const meta = [];
        if (map.quest && map.quest !== "Quête principale") meta.push("« " + map.quest + " »");
        if (map.diff) meta.push(map.diff.toLowerCase());
        if (map.time) meta.push(map.time);
        if (meta.length) {
          const m = meta.join(", ");
          btn.append(el("p", "-mt-1.5 text-[13px] text-label2", m.charAt(0).toUpperCase() + m.slice(1)));
        }
        const b = bar(pct(st), color);
        btn.append(b);
        card.append(btn);

        const refs = { card, count, fill: b.firstChild, badge, badgeSlot, secCounts: new Map() };
        cardRefs.set(map.id, refs);

        const box = collapsible(open);
        card.append(box.wrap);
        let built = false;
        const build = () => { if (!built) { box.inner.append(buildBody(map, color, secs, all, q, refs)); built = true; } };
        if (open) build();

        btn.addEventListener("click", () => {
          const now = !openMaps.has(map.id);
          if (now) { openMaps.add(map.id); build(); } else openMaps.delete(map.id);
          setOpen(box.wrap, now);
          chev.classList.toggle("rotate-90", now);
          btn.setAttribute("aria-expanded", now ? "true" : "false");
          save();
        });

        section.append(card);
        mapsShown++; shown++;
      }
      if (mapsShown) main.append(section);
    }

    if (!shown) {
      main.append(el("p", "py-16 text-center text-label2",
        q ? "Aucun résultat pour « " + q + " ». Essaie un nom de map ou d'arme."
          : "Tout est coché ici. Désactive « Masquer ce qui est fait » pour revoir la liste."));
    }
  }

  function render(animate) { renderGlobal(); renderNav(); renderMain(animate); }

  let t;
  $("#search").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => renderMain(false), 120); });
  $("#hideDone").addEventListener("change", () => renderMain(true));
  const tipsSwitch = $("#showTips");
  if (tipsSwitch) {
    tipsSwitch.checked = showTips;
    tipsSwitch.addEventListener("change", () => {
      showTips = tipsSwitch.checked; openTips.clear(); save();
      document.querySelectorAll(".tip-btn").forEach((b) => {
        const wrap = b.closest(".row-anim").querySelector(".fold");
        setOpen(wrap, showTips); b.classList.toggle("is-open", showTips);
        b.setAttribute("aria-expanded", showTips ? "true" : "false");
      });
    });
  }
  const tipCount = Object.values(TIPS).reduce((n, m) => n + Object.keys(m).length, 0);
  const tc = $("#tipCount"); if (tc) tc.textContent = tipCount ? tipCount + " indices" : "";

  $("#expandAll").addEventListener("click", () => {
    const games = currentGame === "all" ? window.ZOMBIES_DATA : window.ZOMBIES_DATA.filter((g) => g.id === currentGame);
    games.forEach((g) => g.maps.forEach((m) => openMaps.add(m.id))); save(); renderMain(false);
  });
  $("#collapseAll").addEventListener("click", () => {
    openMaps.clear(); save();
    document.querySelectorAll(".map-card > .fold[data-open]").forEach((w) => setOpen(w, false));
    document.querySelectorAll(".map-card .chev").forEach((c) => c.classList.remove("rotate-90"));
  });

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ done: state.done, custom: state.custom }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zombies-progression-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data.done !== "object") throw new Error("format");
      if (confirm("Remplacer ta progression actuelle par celle du fichier ?")) {
        state.done = data.done; state.custom = data.custom || {}; save(); render(true);
      }
    } catch (err) { alert("Ce fichier n'est pas une sauvegarde de la checklist. Utilise un fichier créé avec « Exporter »."); }
    e.target.value = "";
  });

  render(true);
})();
