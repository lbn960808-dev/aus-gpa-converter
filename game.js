/* ============================================================
   打地鼠 WHACK-A-MOLE — 遊戲邏輯
   ============================================================ */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ── 設定（波次制：一批地鼠同時出現 → 停留 → 消失 → 下一批） ── */
  const DIFFS = {
    easy:   { label: "簡單", duration: 30, maxMoles: 1, up: [1500, 2200], gap: 380, gold: 0.08 },
    normal: { label: "一般", duration: 45, maxMoles: 2, up: [1300, 1900], gap: 340, gold: 0.12 },
    hard:   { label: "困難", duration: 60, maxMoles: 3, up: [1100, 1700], gap: 300, gold: 0.16 },
  };
  const BASE_NORMAL = 10;
  const BASE_GOLD = 50;
  const STORAGE = {
    best: (d) => `wam-best-${d}`,
    sound: "wam-sound",
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* localStorage 安全存取（file:// 部分瀏覽器會拋錯） */
  const store = {
    _ok: (() => { try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return true; } catch { return false; } })(),
    get(key, fallback = null) {
      try { return this._ok ? localStorage.getItem(key) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { if (this._ok) localStorage.setItem(key, value); } catch { /* ignore */ }
    },
  };

  /* ── 像素地鼠精靈（16×16 點陣，左半鏡像確保對稱） ── */
  const PX_COLORS = {
    normal: { K: "#2b1a12", B: "#c2884f", M: "#f2d9b3", E: "#1a1a1a", W: "#ffffff", N: "#6b3f23", T: "#ffffff" },
    gold:   { K: "#7a5a08", B: "#ffce3a", M: "#fff3c9", E: "#1a1a1a", W: "#ffffff", N: "#8a6109", T: "#ffffff" },
  };
  // 左半邊（8 欄），右半由鏡像產生；. = 透明
  const PX_ART = {
    normal: [
      "........",
      "...KKK..",
      "..KKKKK.",
      ".KBBBBBK",
      ".BBBBBBB",
      "KBBBBBBB",
      "KBBBBBBB",
      "KBBEEBBB",
      "KBBEWBBB",
      "KBBEWBBB",
      "KBBBBBBB",
      "KBBBMMMM",
      "KBBMMNMM",
      "KBBMMTMM",
      "KBBMMMMM",
      "KKKKKKKK",
    ],
    gold: [
      "........",
      "...KKK..",
      "..KKWWK.",
      ".KBBBBBK",
      ".BBBBBBB",
      "KBBBBBBB",
      "KBBBBBBB",
      "KBBEEBBB",
      "KBBEWBBB",
      "KBBEWBBB",
      "KBBBBBBB",
      "KBBBMMMM",
      "KBBMMNMM",
      "KBBMMTMM",
      "KBBMMMMM",
      "KKKKKKKK",
    ],
  };

  function makeSprite(art, colors) {
    const cells = [];
    art.forEach((row, y) => {
      const full = row + [...row].reverse().join("");
      [...full].forEach((ch, x) => {
        const fill = colors[ch];
        if (fill) cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
      });
    });
    return cells.join("");
  }
  const MOLE_SVG = {
    normal: makeSprite(PX_ART.normal, PX_COLORS.normal),
    gold: makeSprite(PX_ART.gold, PX_COLORS.gold),
  };

  /* ── DOM 元素 ── */
  const cabinet = $("cabinet");
  const board = $("board");
  const hud = {
    score: $("hud-score"),
    combo: $("hud-combo"),
    comboWrap: $("hud-combo-wrap"),
    time: $("hud-time"),
  };
  const timebar = $("timebar");
  const btnSound = $("btn-sound");
  const btnPause = $("btn-pause");

  /* ── 狀態 ── */
  let state = {
    playing: false,
    paused: false,
    score: 0,
    combo: 0,
    timeLeft: 30,
    duration: 30,
  };
  let diffName = "normal";
  let active = new Map(); // idx -> { el, wrap, timer, remain, upAt, gold }
  let holeCooldown = new Set(); // 被擊中後的洞暫時不可重生
  let waveHoles = new Set(); // 本波次已使用的洞（同一波不重複）
  let spawnTimer = null; // 下一波的排程
  let allHideTimer = null; // 本波收尾（把所有未打中的地鼠藏起來）
  let ticker = null;
  let gameEndAt = 0;
  let pausedAt = 0;

  /* ── 音效（Web Audio） ── */
  const snd = {
    ctx: null,
    enabled: store.get(STORAGE.sound) !== "off",
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, dur, type = "square", vol = 0.14, when = 0, slideTo = null) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(1, freq), t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    hit(gold) {
      this.ensure();
      if (gold) {
        [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 0.1, "square", 0.11, i * 0.05));
      } else {
        this.tone(740, 0.06, "square", 0.15, 0, 320);
        this.tone(980, 0.05, "triangle", 0.1, 0.01);
      }
    },
    miss() { this.ensure(); this.tone(180, 0.13, "sawtooth", 0.13, 0, 80); },
    pop() { this.ensure(); this.tone(300, 0.04, "triangle", 0.05); },
    thud() { this.ensure(); this.tone(120, 0.11, "sine", 0.16, 0, 55); this.tone(60, 0.08, "sine", 0.1, 0.01); },
    tap() { this.ensure(); this.tone(240, 0.05, "square", 0.07, 0, 150); },
    start() { this.ensure(); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, "triangle", 0.12, i * 0.07)); },
    over() { this.ensure(); [880, 659, 523, 262].forEach((f, i) => this.tone(f, 0.14, "sawtooth", 0.1, i * 0.13)); },
    ui() { this.ensure(); this.tone(620, 0.04, "triangle", 0.06); },
  };
  snd.tone(1, 0.001); // warm up (AudioContext may be blocked until gesture; ensure called on interactions)

  /* ── 建構 9 個洞 ── */
  const holes = [];
  for (let i = 0; i < 9; i++) {
    const h = document.createElement("div");
    h.className = "hole";
    h.dataset.idx = i;
    h.innerHTML = `
      <div class="hole-inner"></div>
      <div class="hill"></div>
      <div class="mole-wrap">
        <svg class="mole" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${MOLE_SVG.normal}</svg>
      </div>`;
    board.appendChild(h);
    holes.push(h);
  }

  /* ── 工具 ── */
  function getBest() {
    return parseInt(store.get(STORAGE.best(diffName), "0") || "0", 10);
  }
  function setBest(v) {
    store.set(STORAGE.best(diffName), String(v));
  }

  function mult() {
    return Math.min(5, 1 + Math.floor(state.combo / 3));
  }

  function showScreen(name) {
    ["screen-start", "screen-over", "screen-help", "screen-pause"].forEach((id) => {
      $(id).classList.toggle("hidden", id !== name);
    });
    if (name === "screen-start") {
      $("best-start").textContent = getBest();
      if (ticker) { clearInterval(ticker); ticker = null; }
      if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
      if (allHideTimer) { clearTimeout(allHideTimer); allHideTimer = null; }
      active.forEach((a, i) => {
        clearTimeout(a.timer);
        a.wrap.classList.remove("up");
        a.wrap.dataset.active = "0";
        holes[i].classList.remove("whacked");
      });
      active.clear();
      holeCooldown.clear();
      waveHoles.clear();
    }
  }

  function updateHud() {
    hud.score.textContent = String(state.score);
    hud.combo.textContent = String(state.combo);
    hud.time.textContent = String(Math.max(0, state.timeLeft));
    if (state.timeLeft <= 10) hud.time.classList.add("warn");
    else hud.time.classList.remove("warn");
    timebar.style.width = `${(state.timeLeft / state.duration) * 100}%`;
    timebar.classList.toggle("low", state.timeLeft / state.duration <= 0.25);
  }

  function addFloat(hole, text) {
    const f = document.createElement("div");
    f.className = "float";
    f.textContent = text;
    hole.appendChild(f);
    setTimeout(() => f.remove(), 800);
  }

  function dust(hole) {
    for (let i = 0; i < 6; i++) {
      const d = document.createElement("div");
      d.className = "dust";
      d.style.setProperty("--dx", `${(Math.random() - 0.5) * 36}px`);
      d.style.setProperty("--dy", `${-(8 + Math.random() * 22)}px`);
      d.style.transform = "translate(-50%,-50%)";
      hole.appendChild(d);
      setTimeout(() => d.remove(), 440);
    }
  }

  function slam(hole) {
    hole.classList.remove("slam");
    void hole.offsetWidth;
    hole.classList.add("slam");
  }

  function shakeCabinet() {
    cabinet.classList.remove("shake");
    void cabinet.offsetWidth;
    cabinet.classList.add("shake");
    setTimeout(() => cabinet.classList.remove("shake"), 320);
  }

  function burst(hole, gold) {
    const colors = gold
      ? ["#ffce3a", "#fff3c9", "#ffe566"]
      : ["#ff4fd8", "#32f1e8", "#ffe566"];
    for (let i = 0; i < (gold ? 10 : 8); i++) {
      const b = document.createElement("div");
      b.className = "burst";
      const deg = (Math.PI * 2 * i) / 8 + Math.random() * 0.6;
      const dist = 28 + Math.random() * 34;
      b.style.setProperty("--dx", `${Math.cos(deg) * dist}px`);
      b.style.setProperty("--dy", `${Math.sin(deg) * dist}px`);
      b.style.background = pick(colors);
      b.style.transform = "translate(-50%,-50%)";
      hole.appendChild(b);
      setTimeout(() => b.remove(), 480);
    }
  }

  /* ── 地鼠生命週期（波次制） ── */
  function pickDistinct(pool, n) {
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  function showMole(idx, up, gold) {
    const hole = holes[idx];
    const wrap = hole.querySelector(".mole-wrap");
    const svg = wrap.querySelector("svg");
    svg.innerHTML = gold ? MOLE_SVG.gold : MOLE_SVG.normal;
    wrap.classList.toggle("gold", gold);
    hole.classList.remove("whacked");
    wrap.dataset.active = "1";
    wrap.classList.add("up");
    const timer = setTimeout(() => hideMole(idx), up);
    active.set(idx, { el: hole, wrap, timer, upAt: now(), remain: up, gold });
    snd.pop();
  }

  function hideMole(idx) {
    if (!active.has(idx)) return;
    const a = active.get(idx);
    active.delete(idx);
    clearTimeout(a.timer);
    a.wrap.dataset.active = "0";
    a.wrap.classList.remove("up");
  }

  // 新一波：從未使用過的洞挑 n 隻，幾乎同時「突然冒出」
  function spawnWave() {
    if (!state.playing || state.paused) return;
    const cfg = DIFFS[diffName];
    const pool = holes.map((h, i) => i).filter((i) => !waveHoles.has(i) && !holeCooldown.has(i));
    if (!pool.length) { scheduleWave(); return; }

    const n = Math.min(cfg.maxMoles, pool.length);
    const picks = pickDistinct(pool, n);
    const up = rand(cfg.up[0], cfg.up[1]);

    picks.forEach((idx) => {
      waveHoles.add(idx);
      const gold = Math.random() < cfg.gold;
      showMole(idx, up, gold);
    });

    // 這波結束：把所有沒被打中的地鼠一起藏起來
    allHideTimer = setTimeout(() => hideWave(), up + 60);
  }

  function hideWave() {
    if (allHideTimer) { clearTimeout(allHideTimer); allHideTimer = null; }
    active.forEach((a, idx) => hideMole(idx));
    waveHoles.clear();
    holeCooldown.clear();
    if (state.playing && !state.paused) scheduleWave();
  }

  function scheduleWave() {
    if (!state.playing || state.paused) return;
    const cfg = DIFFS[diffName];
    spawnTimer = setTimeout(() => spawnWave(), cfg.gap);
  }

  function killMole(idx) {
    const a = active.get(idx);
    if (!a) return false;
    active.delete(idx);
    clearTimeout(a.timer);
    a.wrap.dataset.active = "0";
    a.wrap.classList.remove("up");
    a.el.classList.add("whacked");
    setTimeout(() => a.el.classList.remove("whacked"), 260);
    holeCooldown.add(idx);
    setTimeout(() => holeCooldown.delete(idx), 320);
    return a.gold;
  }

  /* ── 打分數 ── */
  function addPoints(base, hole, gold) {
    const m = mult();
    const pts = base * m;
    state.score += pts;
    addFloat(hole, gold ? `+${pts} ✦` : (m > 1 ? `+${pts} x${m}` : `+${pts}`));
    snd.hit(gold);
    burst(hole, gold);
    updateHud();
  }

  function bumpCombo() {
    state.combo += 1;
    hud.comboWrap.classList.remove("hot");
    void hud.comboWrap.offsetWidth; // reflow to retrigger anim
    hud.comboWrap.classList.add("hot");
    updateHud();
  }

  function resetCombo(updateHudFlag = true) {
    state.combo = 0;
    if (updateHudFlag) updateHud();
  }

  /* ── 打擊（每次都有明確回饋，不再靜默吞掉點擊） ── */
  function whack(idx) {
    const hole = holes[idx];
    if (!state.playing || state.paused) return;

    hole.classList.add("is-tapping");
    setTimeout(() => hole.classList.remove("is-tapping"), 90);

    if (active.has(idx)) {
      const gold = killMole(idx);
      slam(hole);
      bumpCombo();
      addPoints(gold ? BASE_GOLD : BASE_NORMAL, hole, gold);
      if (gold) shakeCabinet();
      // 本波全清 → 提早出下一波（不需要等 timeout）
      if (active.size === 0) hideWave();
      return;
    }

    // 空洞：多點短時間內的誤按只給輕回饋，不重罰；刻意打空才重置連擊
    const last = parseInt(hole.dataset.recent || "0", 10);
    hole.dataset.recent = String(Date.now());
    const withinGrace = Date.now() - last < 150;

    if (withinGrace) {
      snd.tap();
      slam(hole);
      return;
    }
    resetCombo();
    snd.thud();
    slam(hole);
    dust(hole);
  }

  board.addEventListener("pointerdown", (e) => {
    const hole = e.target.closest(".hole");
    if (!hole) return;
    e.preventDefault();
    whack(parseInt(hole.dataset.idx, 10));
  });

  /* ── 計時 ── */
  function startTicker() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(() => {
      if (state.paused || !state.playing) return;
      const remain = Math.max(0, Math.ceil((gameEndAt - Date.now()) / 1000));
      state.timeLeft = remain;
      updateHud();
      if (remain <= 0) endGame();
    }, 200);
  }

  /* ── 開始 / 結束 ── */
  function startGame() {
    const cfg = DIFFS[diffName];
    state = {
      playing: true,
      paused: false,
      score: 0,
      combo: 0,
      timeLeft: cfg.duration,
      duration: cfg.duration,
    };
    active.clear();
    holeCooldown.clear();
    waveHoles.clear();
    holes.forEach((h) => h.classList.remove("whacked"));
    gameEndAt = Date.now() + cfg.duration * 1000;
    updateHud();
    showScreen(null);
    snd.start();
    startTicker();
    scheduleWave();
  }

  function endGame() {
    state.playing = false;
    clearInterval(ticker);
    ticker = null;
    if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
    if (allHideTimer) { clearTimeout(allHideTimer); allHideTimer = null; }
    active.forEach((a, idx) => {
      clearTimeout(a.timer);
      a.wrap.dataset.active = "0";
      a.wrap.classList.remove("up");
      holes[idx].classList.remove("whacked");
    });
    active.clear();
    holeCooldown.clear();
    waveHoles.clear();
    snd.over();

    const prev = getBest();
    const isNew = state.score > prev;
    if (isNew) setBest(state.score);
    $("final-score").textContent = String(state.score);
    $("final-combo").textContent = String(state.combo);
    $("final-best").textContent = String(isNew ? state.score : prev);
    $("final-new").classList.toggle("hidden", !isNew);
    showScreen("screen-over");
  }

  /* ── 暫停 / 繼續 ── */
  function pauseGame() {
    if (!state.playing || state.paused) return;
    state.paused = true;
    pausedAt = Date.now();
    if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
    if (allHideTimer) { clearTimeout(allHideTimer); allHideTimer = null; }
    active.forEach((a) => {
      clearTimeout(a.timer);
      a.remain = Math.max(0, a.up - (Date.now() - a.upAt));
    });
    snd.ui();
    showScreen("screen-pause");
  }

  function resumeGame() {
    if (!state.paused) return;
    const pauseMs = Date.now() - pausedAt;
    gameEndAt += pauseMs;
    let maxRemain = 0;
    active.forEach((a, idx) => {
      a.upAt = Date.now();
      a.timer = setTimeout(() => hideMole(idx), a.remain);
      maxRemain = Math.max(maxRemain, a.remain);
    });
    state.paused = false;
    if (active.size > 0) {
      // 還有殘活的地鼠 → 補上這波的收尾計時
      allHideTimer = setTimeout(() => hideWave(), maxRemain + 60);
    } else {
      scheduleWave();
    }
    showScreen(null);
    snd.ui();
  }

  function now() { return Date.now(); }

  /* ── 事件綁定 ── */
  $("diff-grid").addEventListener("click", (e) => {
    const b = e.target.closest(".diff");
    if (!b) return;
    diffName = b.dataset.diff;
    document.querySelectorAll(".diff").forEach((d) => d.classList.toggle("selected", d === b));
    $("best-start").textContent = getBest();
    snd.ui();
    $("btn-start").focus();
  });

  $("btn-start").addEventListener("click", () => startGame());
  $("btn-again").addEventListener("click", () => startGame());
  $("btn-menu").addEventListener("click", () => showScreen("screen-start"));
  $("btn-pause-menu").addEventListener("click", () => showScreen("screen-start"));
  $("btn-pause").addEventListener("click", () => pauseGame());
  $("btn-resume").addEventListener("click", () => resumeGame());

  $("btn-help").addEventListener("click", () => {
    snd.ui();
    showScreen("screen-help");
  });
  $("btn-help-close").addEventListener("click", () => {
    snd.ui();
    showScreen("screen-start");
  });

  btnSound.addEventListener("click", () => {
    snd.enabled = !snd.enabled;
    store.set(STORAGE.sound, snd.enabled ? "on" : "off");
    btnSound.textContent = `${snd.enabled ? "🔊" : "🔇"} 音效`;
    snd.ui();
  });

  /* ── 初始化 ── */
  document.querySelector(".diff[data-diff='normal']").classList.add("selected");
  $("best-start").textContent = getBest();
  btnSound.textContent = `${snd.enabled ? "🔊" : "🔇"} 音效`;
  showScreen("screen-start");
})();
