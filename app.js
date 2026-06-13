const STORAGE_KEY = "live-shot-tracker-v3";
const APP_VERSION = "3.1.0";

const RESULT_OPTIONS = ["Goal", "Blocked", "Out"];
const OUTCOME_OPTIONS = ["Highball", "Longball"];
const OUR_ROSTER_DEFAULT = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];
const OPP_ROSTER_DEFAULT = ["Opp 1", "Opp 2", "Opp 3", "Opp 4", "Opp 5", "Opp 6"];

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
  teams: {
    current: "our",
    history: [],
    roster: {
      our: OUR_ROSTER_DEFAULT,
      opponent: OPP_ROSTER_DEFAULT,
    },
    active: {
      our: [0, 1, 2],
      opponent: [0, 1, 2],
    },
  },
  controls: {
    shooterIndex: null,
    shotFrom: null,
    shotTo: null,
    result: null,
    outcome: null,
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
  matchTitle: document.getElementById("matchTitle"),
  matchMeta: document.getElementById("matchMeta"),
  timer: document.getElementById("timer"),
  startTimer: document.getElementById("startTimer"),
  pauseTimer: document.getElementById("pauseTimer"),
  resetTimer: document.getElementById("resetTimer"),
  switchTeam: document.getElementById("switchTeam"),
  swapBack: document.getElementById("swapBack"),
  toggleSubs: document.getElementById("toggleSubs"),
  subsPanel: document.getElementById("subsPanel"),
  subTeam: document.getElementById("subTeam"),
  subOff: document.getElementById("subOff"),
  subOn: document.getElementById("subOn"),
  applySub: document.getElementById("applySub"),
  shooterRow: document.getElementById("shooterRow"),
  fromRow: document.getElementById("fromRow"),
  toRow: document.getElementById("toRow"),
  resultRow: document.getElementById("resultRow"),
  outcomeRow: document.getElementById("outcomeRow"),
  shotSideLabel: document.getElementById("shotSideLabel"),
  pathPreview: document.getElementById("pathPreview"),
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

buildInputRows();
hydrateForms();
renderAll();
bindEvents();
setupPWA();
setInstallHints();

function bindEvents() {
  els.startForm.addEventListener("submit", onStartGame);
  els.startForm.addEventListener("input", onStartFormInput);

  els.switchTeam.addEventListener("click", onSwitchTeam);
  els.swapBack.addEventListener("click", onSwapBack);
  els.toggleSubs.addEventListener("click", onToggleSubs);
  els.subTeam.addEventListener("change", renderSubOptions);
  els.subOff.addEventListener("change", renderSubOptions);
  els.applySub.addEventListener("click", onApplySubstitution);

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

function buildInputRows() {
  buildShooterRow();
  buildFromRow();
  buildToRow();
  buildResultRow();
  buildOutcomeRow();
}

function buildShooterRow() {
  refreshRowButtons(els.shooterRow, getActivePlayerNames(), "shooter", onSelectShooter);
}

function buildFromRow() {
  refreshRowButtons(els.fromRow, ["1", "2", "3", "4", "5", "6", "7", ""], "from", onSelectFrom);
}

function buildToRow() {
  refreshRowButtons(els.toRow, ["1", "2", "3", "4", "5", "6", "7", "Out"], "to", onSelectTo);
}

function buildResultRow() {
  refreshRowButtons(els.resultRow, RESULT_OPTIONS, "result", onSelectResult);
}

function buildOutcomeRow() {
  refreshRowButtons(els.outcomeRow, OUTCOME_OPTIONS, "outcome", onSelectOutcome);
}

function refreshRowButtons(target, values, type, onSelect) {
  target.innerHTML = "";
  const fragment = document.createDocumentFragment();

  values.forEach((value, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.dataset.type = type;
    btn.dataset.value = String(value);
    btn.dataset.index = String(index);
    btn.textContent = String(value);
    if (!String(value).trim()) {
      btn.classList.add("blank-slot");
      btn.disabled = true;
      btn.setAttribute("aria-hidden", "true");
    } else {
      btn.addEventListener("click", () => onSelect(value, index));
    }
    fragment.appendChild(btn);
  });

  target.appendChild(fragment);
}

function getActivePlayerNames() {
  const team = state.teams.current;
  const roster = state.teams.roster[team];
  const activeIndexes = state.teams.active[team];
  return activeIndexes.map((idx) => roster[idx]);
}

function onSelectShooter(_value, index) {
  state.controls.shooterIndex = index;
  onControlUpdate();
}

function onSelectFrom(value) {
  state.controls.shotFrom = Number(value);
  onControlUpdate();
}

function onSelectTo(value) {
  state.controls.shotTo = value === "Out" ? "Out" : Number(value);
  onControlUpdate();
}

function onSelectResult(value) {
  state.controls.result = value;
  onControlUpdate();
}

function onSelectOutcome(value) {
  state.controls.outcome = value;
  onControlUpdate();
}

function onControlUpdate() {
  markUpdated();
  saveState();
  renderShotRows();
  renderTeamControls();
  renderInputSelection();
  maybeAutoSubmitShot();
}

function maybeAutoSubmitShot() {
  const ready = Number.isInteger(state.controls.shooterIndex)
    && Number.isInteger(state.controls.shotFrom)
    && (Number.isInteger(state.controls.shotTo) || state.controls.shotTo === "Out")
    && Boolean(state.controls.result)
    && Boolean(state.controls.outcome);

  if (!ready || !state.game.started) return;

  submitShot();
}

function submitShot() {
  const team = state.teams.current;
  const activePlayerIndexes = state.teams.active[team];
  const roster = state.teams.roster[team];
  const rosterIndex = activePlayerIndexes[state.controls.shooterIndex];
  const shooterName = roster[rosterIndex] || "Unknown";

  const shot = {
    id: crypto.randomUUID(),
    index: state.shots.length + 1,
    team,
    player: shooterName,
    from: state.controls.shotFrom,
    to: state.controls.shotTo,
    path: `${state.controls.shotFrom}->${state.controls.shotTo}`,
    result: state.controls.result,
    outcome: state.controls.outcome,
    elapsedMs: getElapsedMs(),
    createdAt: new Date().toISOString(),
  };

  state.shots.push(shot);
  resetShotControls();
  swapTeam("auto");
  markUpdated();
  saveState();
  renderAll();
}

function resetShotControls() {
  state.controls.shooterIndex = null;
  state.controls.shotFrom = null;
  state.controls.shotTo = null;
  state.controls.result = null;
  state.controls.outcome = null;
}

function onStartFormInput() {
  syncStartFormToState();
  saveState();
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
  renderAll();
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

function onSwitchTeam() {
  swapTeam("manual");
  markUpdated();
  saveState();
  renderAll();
}

function onSwapBack() {
  const previous = state.teams.history.pop();
  if (!previous) return;

  state.teams.current = previous;
  resetShotControls();
  markUpdated();
  saveState();
  renderAll();
}

function swapTeam(source) {
  const current = state.teams.current;
  state.teams.history.push(current);

  state.teams.current = current === "our" ? "opponent" : "our";
  resetShotControls();

  if (source === "manual") {
    const maxHistory = 12;
    if (state.teams.history.length > maxHistory) {
      state.teams.history = state.teams.history.slice(-maxHistory);
    }
  }
}

function onToggleSubs() {
  els.subsPanel.classList.toggle("hidden");
  if (!els.subsPanel.classList.contains("hidden")) {
    els.subTeam.value = state.teams.current;
    renderSubOptions();
  }
}

function renderSubOptions() {
  const team = els.subTeam.value;
  const roster = state.teams.roster[team];
  const active = state.teams.active[team];

  const offOptions = active.map((idx) => ({ value: String(idx), label: roster[idx] }));
  fillSelect(els.subOff, offOptions);

  const selectedOff = Number(els.subOff.value || offOptions[0]?.value);
  const benchIndexes = roster
    .map((_name, idx) => idx)
    .filter((idx) => !active.includes(idx) || idx === selectedOff)
    .filter((idx) => idx !== selectedOff);

  const onOptions = benchIndexes.map((idx) => ({ value: String(idx), label: roster[idx] }));
  fillSelect(els.subOn, onOptions);
}

function fillSelect(selectEl, options) {
  selectEl.innerHTML = "";
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    selectEl.appendChild(option);
  });
}

function onApplySubstitution() {
  const team = els.subTeam.value;
  const offIndex = Number(els.subOff.value);
  const onIndex = Number(els.subOn.value);

  if (!Number.isInteger(offIndex) || !Number.isInteger(onIndex)) {
    alert("No valid substitution available.");
    return;
  }

  const active = state.teams.active[team];
  const replaceAt = active.indexOf(offIndex);
  if (replaceAt < 0) {
    alert("Selected player off is not currently on court.");
    return;
  }

  active[replaceAt] = onIndex;

  if (team === state.teams.current) {
    resetShotControls();
  }

  markUpdated();
  saveState();
  renderAll();
  renderSubOptions();
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
  renderAll();
}

function onNewGame() {
  const ok = confirm("Start a new game? This clears current data.");
  if (!ok) return;

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
  renderAll();
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
  renderTeamControls();
  renderShotRows();
  renderInputSelection();
  renderShots();
  renderStats();

  if (state.timer.running) {
    startTicking();
  } else {
    stopTicking();
  }
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

function renderTeamControls() {
  const currentLabel = teamLabel(state.teams.current);
  els.switchTeam.textContent = `Tracking: ${currentLabel}`;
  els.shotSideLabel.textContent = `Tracking side: ${currentLabel}`;
  els.swapBack.disabled = state.teams.history.length === 0;
}

function renderShotRows() {
  buildShooterRow();
  highlightSelection(els.shooterRow, state.controls.shooterIndex, "index");
  highlightSelection(els.fromRow, state.controls.shotFrom, "value");
  highlightSelection(els.toRow, state.controls.shotTo, "value");
  highlightSelection(els.resultRow, state.controls.result, "value");
  highlightSelection(els.outcomeRow, state.controls.outcome, "value");
}

function highlightSelection(row, selected, by) {
  const buttons = row.querySelectorAll("button.choice-btn");
  buttons.forEach((btn) => {
    let active = false;
    if (by === "index") {
      active = Number(btn.dataset.index) === selected;
    } else {
      active = normalizeSelection(btn.dataset.value) === normalizeSelection(selected);
    }

    btn.classList.toggle("selected", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function normalizeSelection(value) {
  if (value === null || typeof value === "undefined") return "";
  return String(value).toLowerCase();
}

function renderInputSelection() {
  const shooter = Number.isInteger(state.controls.shooterIndex)
    ? getActivePlayerNames()[state.controls.shooterIndex]
    : "-";
  const from = Number.isInteger(state.controls.shotFrom) ? state.controls.shotFrom : "-";
  const to = (Number.isInteger(state.controls.shotTo) || state.controls.shotTo === "Out") ? state.controls.shotTo : "-";
  const result = state.controls.result || "-";
  const outcome = state.controls.outcome || "-";

  els.pathPreview.textContent = `Pending: ${shooter} | ${from}->${to} | ${result} | ${outcome}`;
}

function renderShots() {
  const rows = state.shots
    .map((shot) => {
      return `
      <tr>
        <td>${shot.index}</td>
        <td>${formatDuration(shot.elapsedMs)}</td>
        <td>${escapeHtml(teamLabel(shot.team))}</td>
        <td>${escapeHtml(shot.player || "-")}</td>
        <td>${escapeHtml(shot.path || "-")}</td>
        <td>${escapeHtml(shot.result || "-")}</td>
        <td>${escapeHtml(shot.outcome || "-")}</td>
      </tr>
      `;
    })
    .join("");

  els.shotTableBody.innerHTML = rows || `<tr><td colspan="7">No shots recorded yet.</td></tr>`;
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
    ["index", "gameTime", "team", "player", "from", "to", "path", "result", "outcome", "createdAt"],
    ...state.shots.map((shot) => [
      shot.index,
      formatDuration(shot.elapsedMs),
      shot.team,
      shot.player,
      shot.from ?? "",
      shot.to ?? "",
      shot.path,
      shot.result,
      shot.outcome || "",
      shot.createdAt,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadBlob(csv, "text/csv;charset=utf-8", buildFileName("csv"));
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    game: state.game,
    teams: state.teams,
    elapsedMs: getElapsedMs(),
    shots: state.shots,
  };

  const text = JSON.stringify(payload, null, 2);
  downloadBlob(text, "application/json;charset=utf-8", buildFileName("json"));
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

function teamLabel(team) {
  return team === "our"
    ? (state.game.teamName || "Our Team")
    : (state.game.opponent || "Opponent");
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

  els.subTeam.value = state.teams.current;
  renderSubOptions();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialState);
    const parsed = JSON.parse(raw);

    const merged = {
      game: {
        ...initialState.game,
        ...(parsed.game || {}),
      },
      timer: {
        ...initialState.timer,
        ...(parsed.timer || {}),
      },
      teams: {
        ...initialState.teams,
        ...(parsed.teams || {}),
        roster: {
          ...initialState.teams.roster,
          ...((parsed.teams && parsed.teams.roster) || {}),
        },
        active: {
          ...initialState.teams.active,
          ...((parsed.teams && parsed.teams.active) || {}),
        },
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

    merged.teams.history = Array.isArray(merged.teams.history) ? merged.teams.history : [];
    merged.teams.current = merged.teams.current === "opponent" ? "opponent" : "our";

    return merged;
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeShots(shots) {
  if (!Array.isArray(shots)) return [];

  return shots.map((shot, i) => ({
    id: shot.id || crypto.randomUUID(),
    index: i + 1,
    team: shot.team === "opponent" ? "opponent" : "our",
    player: shot.player || "Unknown",
    from: typeof shot.from === "number" ? shot.from : Number(shot.from) || null,
    to: typeof shot.to === "number" ? shot.to : (String(shot.to || "") === "Out" ? "Out" : Number(shot.to) || null),
    path: shot.path || `${shot.from ?? "-"}->${shot.to ?? "-"}`,
    result: RESULT_OPTIONS.includes(shot.result) ? shot.result : "Blocked",
    outcome: OUTCOME_OPTIONS.includes(shot.outcome) ? shot.outcome : "",
    elapsedMs: Number(shot.elapsedMs || 0),
    createdAt: shot.createdAt || new Date().toISOString(),
  }));
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
