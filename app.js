const STORAGE_KEY = "live-shot-tracker-v2";
const APP_VERSION = "2.1.0";

const initialState = {
  game: {
    sport: "Goalball",
    teamName: "",
    opponent: "",
    venue: "",
    analyst: "",
    matchLabel: "",
    started: false,
  },
  timer: {
    elapsedMs: 0,
    running: false,
    startAt: null,
  },
  controls: {
    shotTeam: "our",
    result: "Goal",
    player: "",
    shotFrom: null,
    shotTo: null,
  },
  shots: [],
  meta: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: APP_VERSION,
  },
};

const state = loadState();
let installPromptEvent = null;
let timerInterval = null;

const els = {
  setupScreen: document.getElementById("setupScreen"),
  liveScreen: document.getElementById("liveScreen"),
  startForm: document.getElementById("startForm"),
  sport: document.getElementById("sport"),
  teamName: document.getElementById("teamName"),
  opponent: document.getElementById("opponent"),
  venue: document.getElementById("venue"),
  analyst: document.getElementById("analyst"),
  matchLabel: document.getElementById("matchLabel"),
  startGame: document.getElementById("startGame"),
  matchTitle: document.getElementById("matchTitle"),
  matchMeta: document.getElementById("matchMeta"),
  timer: document.getElementById("timer"),
  startTimer: document.getElementById("startTimer"),
  pauseTimer: document.getElementById("pauseTimer"),
  resetTimer: document.getElementById("resetTimer"),
  shotTeam: document.getElementById("shotTeam"),
  result: document.getElementById("result"),
  player: document.getElementById("player"),
  fromRow: document.getElementById("fromRow"),
  toRow: document.getElementById("toRow"),
  pathPreview: document.getElementById("pathPreview"),
  addShot: document.getElementById("addShot"),
  undoShot: document.getElementById("undoShot"),
  shotTableBody: document.getElementById("shotTableBody"),
  shotCount: document.getElementById("shotCount"),
  stats: document.getElementById("stats"),
  exportCsv: document.getElementById("exportCsv"),
  exportJson: document.getElementById("exportJson"),
  newGame: document.getElementById("newGame"),
  installBtn: document.getElementById("installBtn"),
  iosInstallHint: document.getElementById("iosInstallHint"),
  statCardTemplate: document.getElementById("statCardTemplate"),
};

buildPathSelectors();
hydrateForms();
renderAll();
bindEvents();
setupPWA();
setInstallHints();

function bindEvents() {
  els.startForm.addEventListener("submit", onStartGame);
  els.startForm.addEventListener("input", onStartFormInput);

  els.shotTeam.addEventListener("change", onControlChange);
  els.result.addEventListener("change", onControlChange);
  els.player.addEventListener("input", onControlChange);
  els.addShot.addEventListener("click", onAddShotClick);

  els.startTimer.addEventListener("click", startTimer);
  els.pauseTimer.addEventListener("click", pauseTimer);
  els.resetTimer.addEventListener("click", onResetTimer);
  els.undoShot.addEventListener("click", onUndoLastShot);
  els.exportCsv.addEventListener("click", exportCsv);
  els.exportJson.addEventListener("click", exportJson);
  els.newGame.addEventListener("click", onNewGame);
  els.installBtn.addEventListener("click", onInstallClick);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    els.installBtn.classList.remove("hidden");
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    els.installBtn.classList.add("hidden");
  });

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });
}

function buildPathSelectors() {
  buildPathRow(els.fromRow, "from");
  buildPathRow(els.toRow, "to");
}

function buildPathRow(target, type) {
  const fragment = document.createDocumentFragment();

  for (let value = 1; value <= 7; value += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "path-select-btn";
    btn.dataset.value = String(value);
    btn.dataset.type = type;
    btn.textContent = String(value);
    btn.setAttribute("aria-label", `${type === "from" ? "From" : "To"} ${value}`);
    btn.addEventListener("click", () => onPathSelect(type, value));
    fragment.appendChild(btn);
  }

  target.appendChild(fragment);
}

function onStartFormInput() {
  syncStartFormToState();
  saveState();
}

function onControlChange() {
  state.controls.shotTeam = els.shotTeam.value;
  state.controls.result = els.result.value;
  state.controls.player = els.player.value.trim();
  markUpdated();
  saveState();
}

function onPathSelect(type, value) {
  if (type === "from") {
    state.controls.shotFrom = value;
  } else {
    state.controls.shotTo = value;
  }

  markUpdated();
  saveState();
  renderPathSelectors();
}

function onAddShotClick() {
  const from = state.controls.shotFrom;
  const to = state.controls.shotTo;

  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    alert("Select both From and To before adding a shot.");
    return;
  }

  addShotFromPath(from, to);
}

function onStartGame(event) {
  event.preventDefault();
  syncStartFormToState();

  if (!state.game.teamName || !state.game.opponent) {
    alert("Please enter both Team Name and Opponent.");
    return;
  }

  state.game.started = true;
  markUpdated();
  saveState();
  renderView();
}

function syncStartFormToState() {
  state.game.sport = els.sport.value.trim() || "Goalball";
  state.game.teamName = els.teamName.value.trim();
  state.game.opponent = els.opponent.value.trim();
  state.game.venue = els.venue.value.trim();
  state.game.analyst = els.analyst.value.trim();
  state.game.matchLabel = els.matchLabel.value.trim();
  markUpdated();
}

function addShotFromPath(from, to) {
  if (!state.game.started) return;

  const shot = {
    id: crypto.randomUUID(),
    index: state.shots.length + 1,
    from,
    to,
    path: `${from}->${to}`,
    team: state.controls.shotTeam,
    player: state.controls.player,
    result: state.controls.result,
    elapsedMs: getElapsedMs(),
    createdAt: new Date().toISOString(),
  };

  state.shots.push(shot);
  markUpdated();
  saveState();
  renderAll();
}

function onUndoLastShot() {
  if (!state.shots.length) return;

  state.shots.pop();
  state.shots.forEach((shot, i) => {
    shot.index = i + 1;
  });

  markUpdated();
  saveState();
  renderAll();
}

function onResetTimer() {
  if (!confirm("Reset game clock to 00:00?")) return;

  state.timer.elapsedMs = 0;
  state.timer.running = false;
  state.timer.startAt = null;
  stopTicking();
  markUpdated();
  saveState();
  renderTimer();
  renderStats();
}

function onNewGame() {
  const keep = confirm("Start a new game? This clears current data after export.");
  if (!keep) return;

  const fresh = structuredClone(initialState);
  Object.assign(state, fresh);
  stopTicking();
  hydrateForms();
  saveState();
  renderAll();
}

function startTimer() {
  if (state.timer.running) return;

  state.timer.running = true;
  state.timer.startAt = Date.now();
  markUpdated();
  saveState();
  startTicking();
}

function pauseTimer() {
  if (!state.timer.running) return;

  state.timer.elapsedMs = getElapsedMs();
  state.timer.running = false;
  state.timer.startAt = null;
  stopTicking();
  markUpdated();
  saveState();
  renderTimer();
  renderStats();
}

function getElapsedMs() {
  if (!state.timer.running || !state.timer.startAt) return state.timer.elapsedMs;
  return state.timer.elapsedMs + (Date.now() - state.timer.startAt);
}

function startTicking() {
  stopTicking();
  timerInterval = setInterval(() => {
    renderTimer();
    renderStats();
  }, 300);
}

function stopTicking() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function renderAll() {
  renderView();
  renderMatchHeader();
  renderTimer();
  renderPathSelectors();
  renderShots();
  renderStats();

  if (state.timer.running) {
    startTicking();
  } else {
    stopTicking();
  }
}

function renderPathSelectors() {
  renderPathRowButtons(els.fromRow, state.controls.shotFrom);
  renderPathRowButtons(els.toRow, state.controls.shotTo);

  const from = state.controls.shotFrom;
  const to = state.controls.shotTo;
  const hasBoth = Number.isInteger(from) && Number.isInteger(to);
  els.pathPreview.textContent = hasBoth ? `Selected: ${from}->${to}` : "Selected: -";
}

function renderPathRowButtons(row, selectedValue) {
  const buttons = row.querySelectorAll("button.path-select-btn");
  buttons.forEach((btn) => {
    const value = Number(btn.dataset.value);
    const selected = value === selectedValue;
    btn.classList.toggle("selected", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function renderView() {
  const inLiveMode = state.game.started;
  els.setupScreen.classList.toggle("hidden", inLiveMode);
  els.liveScreen.classList.toggle("hidden", !inLiveMode);
}

function renderMatchHeader() {
  const team = state.game.teamName || "Our Team";
  const opp = state.game.opponent || "Opponent";
  els.matchTitle.textContent = `${team} vs ${opp}`;

  const bits = [state.game.sport];
  if (state.game.venue) bits.push(state.game.venue);
  if (state.game.matchLabel) bits.push(state.game.matchLabel);
  if (state.game.analyst) bits.push(`Analyst: ${state.game.analyst}`);
  els.matchMeta.textContent = bits.join(" | ");
}

function renderTimer() {
  els.timer.textContent = formatDuration(getElapsedMs());
}

function renderShots() {
  const rows = state.shots
    .map((shot) => {
      const teamLabel = shot.team === "our" ? (state.game.teamName || "Our Team") : (state.game.opponent || "Opponent");
      return `
      <tr>
        <td>${shot.index}</td>
        <td>${formatDuration(shot.elapsedMs)}</td>
        <td>${escapeHtml(teamLabel)}</td>
        <td>${escapeHtml(shot.player || "-")}</td>
        <td>${escapeHtml(shot.path || toLegacyPath(shot))}</td>
        <td>${escapeHtml(shot.result || "-")}</td>
      </tr>
      `;
    })
    .join("");

  els.shotTableBody.innerHTML = rows || `<tr><td colspan="6">No shots recorded yet.</td></tr>`;
  els.shotCount.textContent = `${state.shots.length} shot${state.shots.length === 1 ? "" : "s"}`;
}

function renderStats() {
  const all = state.shots;
  const ourShots = all.filter((s) => s.team === "our");
  const oppShots = all.filter((s) => s.team === "opponent");

  const ourGoals = ourShots.filter((s) => s.result === "Goal").length;
  const oppGoals = oppShots.filter((s) => s.result === "Goal").length;

  const cards = [
    {
      title: `${state.game.teamName || "Our Team"} Shots`,
      value: `${ourShots.length}`,
      meta: `${ourGoals} goals (${toPct(ourGoals, ourShots.length)} conversion)`,
    },
    {
      title: `${state.game.opponent || "Opponent"} Shots`,
      value: `${oppShots.length}`,
      meta: `${oppGoals} goals (${toPct(oppGoals, oppShots.length)} conversion)`,
    },
    {
      title: "Score",
      value: `${ourGoals} - ${oppGoals}`,
      meta: `${state.game.teamName || "Our Team"} vs ${state.game.opponent || "Opponent"}`,
    },
    {
      title: "Game Clock",
      value: formatDuration(getElapsedMs()),
      meta: state.timer.running ? "Running" : "Paused",
    },
  ];

  els.stats.innerHTML = "";
  for (const card of cards) {
    const node = els.statCardTemplate.content.cloneNode(true);
    node.querySelector("h3").textContent = card.title;
    node.querySelector(".big").textContent = card.value;
    node.querySelector(".small").textContent = card.meta;
    els.stats.appendChild(node);
  }
}

function exportCsv() {
  if (!state.shots.length) {
    alert("No shots to export yet.");
    return;
  }

  const rows = [
    ["index", "gameTime", "team", "player", "from", "to", "path", "result", "createdAt"],
    ...state.shots.map((shot) => [
      shot.index,
      formatDuration(shot.elapsedMs),
      shot.team,
      shot.player,
      shot.from ?? "",
      shot.to ?? "",
      shot.path || toLegacyPath(shot),
      shot.result,
      shot.createdAt,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = buildFileName("csv");
  downloadBlob(csv, "text/csv;charset=utf-8", fileName);
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    game: state.game,
    controls: state.controls,
    elapsedMs: getElapsedMs(),
    shots: state.shots,
  };

  const text = JSON.stringify(payload, null, 2);
  const fileName = buildFileName("json");
  downloadBlob(text, "application/json;charset=utf-8", fileName);
}

function buildFileName(extension) {
  const date = new Date().toISOString().slice(0, 10);
  const sport = (state.game.sport || "sport").replace(/\s+/g, "-").toLowerCase();
  const opponent = (state.game.opponent || "opponent").replace(/\s+/g, "-").toLowerCase();
  return `${sport}-vs-${opponent}-${date}.${extension}`;
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadBlob(content, type, fileName) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function toPct(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function markUpdated() {
  state.meta.updatedAt = new Date().toISOString();
}

function hydrateForms() {
  els.sport.value = state.game.sport;
  els.teamName.value = state.game.teamName;
  els.opponent.value = state.game.opponent;
  els.venue.value = state.game.venue;
  els.analyst.value = state.game.analyst || "";
  els.matchLabel.value = state.game.matchLabel || "";

  els.shotTeam.value = state.controls.shotTeam || "our";
  els.result.value = state.controls.result || "Goal";
  els.player.value = state.controls.player || "";
  els.pathPreview.textContent = "Selected: -";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialState);
    const parsed = JSON.parse(raw);

    return {
      game: {
        ...initialState.game,
        ...(parsed.game || {}),
      },
      timer: {
        ...initialState.timer,
        ...(parsed.timer || {}),
      },
      controls: {
        ...initialState.controls,
        ...(parsed.controls || {}),
      },
      shots: normalizeShots(parsed.shots),
      meta: {
        ...initialState.meta,
        ...(parsed.meta || {}),
      },
    };
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeShots(shots) {
  if (!Array.isArray(shots)) return [];

  return shots.map((shot, i) => ({
    id: shot.id || crypto.randomUUID(),
    index: i + 1,
    from: shot.from,
    to: shot.to,
    path: shot.path || toLegacyPath(shot),
    team: shot.team || "our",
    player: shot.player || "",
    result: shot.result || "Saved",
    elapsedMs: Number(shot.elapsedMs || 0),
    createdAt: shot.createdAt || new Date().toISOString(),
  }));
}

function toLegacyPath(shot) {
  if (typeof shot.from !== "undefined" && typeof shot.to !== "undefined") {
    return `${shot.from}->${shot.to}`;
  }
  if (shot.zone) return shot.zone;
  return "-";
}

function setupPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
      });
    });
  }
}

function setInstallHints() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (ios && !standalone) {
    els.iosInstallHint.classList.remove("hidden");
  }
}

function onInstallClick() {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  installPromptEvent.userChoice.finally(() => {
    installPromptEvent = null;
    els.installBtn.classList.add("hidden");
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
