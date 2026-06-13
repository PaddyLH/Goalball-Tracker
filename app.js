const STORAGE_KEY = "live-shot-tracker-v4";
const APP_VERSION = "4.0.0";

const RESULT_OPTIONS = ["Blocked", "Out", "Goal", "Penalty"];
const PENALTY_TYPES = ["10s", "Highball", "Longball", "Other"];
const OUR_ROSTER_DEFAULT = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];
const OPP_ROSTER_DEFAULT = ["Opp 1", "Opp 2", "Opp 3", "Opp 4", "Opp 5", "Opp 6"];

const EXTRA_FIELDS = [
  { key: "phase", label: "Phase", type: "select", options: ["", "Open Play", "Fast Break", "Set Piece", "Penalty"] },
  { key: "defense", label: "Defense", type: "select", options: ["", "Man", "Zone", "Mixed"] },
  { key: "note", label: "Note", type: "text", placeholder: "Any context" },
];

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
  ui: {
    currentView: "capture",
    showSubs: false,
    showExtraFields: false,
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
    penaltyType: null,
    extras: {
      phase: "",
      defense: "",
      note: "",
    },
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

const els = {
  setupScreen: document.getElementById("setupScreen"),
  liveScreen: document.getElementById("liveScreen"),
  startForm: document.getElementById("startForm"),
  sport: document.getElementById("sport"),
  teamName: document.getElementById("teamName"),
  opponent: document.getElementById("opponent"),
  venue: document.getElementById("venue"),
  analyst: document.getElementById("analyst"),
    penaltyType: state.controls.result === "Penalty" ? state.controls.penaltyType : "",
  matchLabel: document.getElementById("matchLabel"),
  ourRosterInputs: document.getElementById("ourRosterInputs"),
  oppRosterInputs: document.getElementById("oppRosterInputs"),
  matchTitle: document.getElementById("matchTitle"),
  matchMeta: document.getElementById("matchMeta"),

  switchTeam: document.getElementById("switchTeam"),
  swapBack: document.getElementById("swapBack"),
  toggleSubs: document.getElementById("toggleSubs"),
  subsPanel: document.getElementById("subsPanel"),
  subTeam: document.getElementById("subTeam"),
  subOff: document.getElementById("subOff"),
  subOn: document.getElementById("subOn"),
  applySub: document.getElementById("applySub"),

  viewCapture: document.getElementById("viewCapture"),
  viewStats: document.getElementById("viewStats"),
  viewLog: document.getElementById("viewLog"),
  viewReport: document.getElementById("viewReport"),
  panelCapture: document.getElementById("panelCapture"),
  panelStats: document.getElementById("panelStats"),
  panelLog: document.getElementById("panelLog"),
  panelReport: document.getElementById("panelReport"),

  shooterRow: document.getElementById("shooterRow"),
  fromRow: document.getElementById("fromRow"),
  toRow: document.getElementById("toRow"),
  resultRow: document.getElementById("resultRow"),
  penaltyPanel: document.getElementById("penaltyPanel"),
  penaltyRow: document.getElementById("penaltyRow"),
  shotSideLabel: document.getElementById("shotSideLabel"),
  pathPreview: document.getElementById("pathPreview"),
  toggleExtraFields: document.getElementById("toggleExtraFields"),
  extraFieldsPanel: document.getElementById("extraFieldsPanel"),
  extraFieldsContainer: document.getElementById("extraFieldsContainer"),

  undoShot: document.getElementById("undoShot"),
  shotTableBody: document.getElementById("shotTableBody"),
  shotCount: document.getElementById("shotCount"),
  stats: document.getElementById("stats"),
  reportSummary: document.getElementById("reportSummary"),
  generatePdf: document.getElementById("generatePdf"),
  exportCsv: document.getElementById("exportCsv"),
  exportJson: document.getElementById("exportJson"),
  newGame: document.getElementById("newGame"),

  installBtn: document.getElementById("installBtn"),
  iosInstallHint: document.getElementById("iosInstallHint"),
  statCardTemplate: document.getElementById("statCardTemplate"),
};

buildRosterInputs();
buildInputRows();
buildExtraFields();
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

  els.viewCapture.addEventListener("click", () => setView("capture"));
  els.viewStats.addEventListener("click", () => setView("stats"));
  els.viewLog.addEventListener("click", () => setView("log"));
  els.viewReport.addEventListener("click", () => setView("report"));

  els.toggleExtraFields.addEventListener("click", onToggleExtraFields);

  els.undoShot.addEventListener("click", onUndoLastShot);
  els.generatePdf.addEventListener("click", generatePdfReport);
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

function buildRosterInputs() {
  buildRosterSideInputs(els.ourRosterInputs, "our");
  buildRosterSideInputs(els.oppRosterInputs, "opponent");
}

function buildRosterSideInputs(container, side) {
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 6; i += 1) {
    const label = document.createElement("label");
    label.textContent = `${i + 1}`;

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.side = side;
    input.dataset.idx = String(i);
    input.placeholder = `${side === "our" ? "Player" : "Opp"} ${i + 1}`;
    input.addEventListener("input", onRosterLabelInput);

    label.appendChild(input);
    fragment.appendChild(label);
  }

  container.appendChild(fragment);
}

function onRosterLabelInput(event) {
  const side = event.target.dataset.side;
  const idx = Number(event.target.dataset.idx);
  const value = event.target.value.trim();

  state.teams.roster[side][idx] = value || defaultRosterName(side, idx);
  markUpdated();
  saveState();
  renderShotRows();
  renderShots();
  renderStats();
  renderReportSummary();
}

function defaultRosterName(side, idx) {
  return side === "our" ? `Player ${idx + 1}` : `Opp ${idx + 1}`;
}

function buildInputRows() {
  buildShooterRow();
  buildFromRow();
  buildToRow();
  buildResultRow();
  buildPenaltyRow();
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

function buildPenaltyRow() {
  refreshRowButtons(els.penaltyRow, PENALTY_TYPES, "penaltyType", onSelectPenaltyType);
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

function buildExtraFields() {
  els.extraFieldsContainer.innerHTML = "";

  for (const field of EXTRA_FIELDS) {
    const label = document.createElement("label");
    label.textContent = field.label;

    if (field.type === "select") {
      const select = document.createElement("select");
      select.dataset.key = field.key;

      for (const optionValue of field.options) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue || "Select...";
        select.appendChild(option);
      }

      select.addEventListener("change", onExtraFieldInput);
      label.appendChild(select);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.key = field.key;
      input.placeholder = field.placeholder || "";
      input.addEventListener("input", onExtraFieldInput);
      label.appendChild(input);
    }

    els.extraFieldsContainer.appendChild(label);
  }
}

function onExtraFieldInput(event) {
  const key = event.target.dataset.key;
  state.controls.extras[key] = event.target.value;
  markUpdated();
  saveState();
  renderInputSelection();
  maybeAutoSubmitShot();
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
  if (value !== "Penalty") {
    state.controls.penaltyType = null;
  }
  onControlUpdate();
}

function onSelectPenaltyType(value) {
  state.controls.penaltyType = value;
  onControlUpdate();
}

function onControlUpdate() {
  markUpdated();
  saveState();
  renderShotRows();
  renderInputSelection();
  maybeAutoSubmitShot();
}

function maybeAutoSubmitShot() {
  const ready = Number.isInteger(state.controls.shooterIndex)
    && Number.isInteger(state.controls.shotFrom)
    && (Number.isInteger(state.controls.shotTo) || state.controls.shotTo === "Out")
    && Boolean(state.controls.result)
    && (state.controls.result !== "Penalty" || Boolean(state.controls.penaltyType));

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
    penaltyType: state.controls.result === "Penalty" ? state.controls.penaltyType : "",
    extras: { ...state.controls.extras },
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
  state.controls.penaltyType = null;
  state.controls.extras = buildEmptyExtras();
}

function buildEmptyExtras() {
  const extras = {};
  for (const field of EXTRA_FIELDS) extras[field.key] = "";
  return extras;
}

function onToggleExtraFields() {
  state.ui.showExtraFields = !state.ui.showExtraFields;
  markUpdated();
  saveState();
  renderExtraFieldsPanel();
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

  if (source === "manual" && state.teams.history.length > 12) {
    state.teams.history = state.teams.history.slice(-12);
  }
}

function onToggleSubs() {
  state.ui.showSubs = !state.ui.showSubs;
  markUpdated();
  saveState();
  renderSubsPanel();
}

function renderSubsPanel() {
  els.subsPanel.classList.toggle("hidden", !state.ui.showSubs);
  if (state.ui.showSubs) {
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
    .filter((idx) => !active.includes(idx))
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
  if (replaceAt < 0) return;

  active[replaceAt] = onIndex;
  if (team === state.teams.current) resetShotControls();

  state.ui.showSubs = false;
  markUpdated();
  saveState();
  renderAll();
}

function setView(viewName) {
  state.ui.currentView = viewName;
  markUpdated();
  saveState();
  renderWorkspacePanels();
}

function renderWorkspacePanels() {
  const view = state.ui.currentView;
  const panelMap = {
    capture: els.panelCapture,
    stats: els.panelStats,
    log: els.panelLog,
    report: els.panelReport,
  };

  const buttonMap = {
    capture: els.viewCapture,
    stats: els.viewStats,
    log: els.viewLog,
    report: els.viewReport,
  };

  Object.entries(panelMap).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== view);
  });

  Object.entries(buttonMap).forEach(([key, btn]) => {
    btn.classList.toggle("active", key === view);
  });
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

function onNewGame() {
  const ok = confirm("Start a new game? This clears current data.");
  if (!ok) return;

  const fresh = structuredClone(initialState);
  Object.assign(state, fresh);
  buildRosterInputs();
  buildInputRows();
  buildExtraFields();
  hydrateForms();
  saveState();
  renderAll();
}

function renderAll() {
  renderView();
  renderMatchHeader();
  renderTeamControls();
  renderSubsPanel();
  renderWorkspacePanels();
  renderShotRows();
  renderExtraFieldsPanel();
  renderInputSelection();
  renderShots();
  renderStats();
  renderReportSummary();
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
  highlightSelection(els.penaltyRow, state.controls.penaltyType, "value");
  els.penaltyPanel.classList.toggle("hidden", state.controls.result !== "Penalty");
}

function renderExtraFieldsPanel() {
  els.extraFieldsPanel.classList.toggle("hidden", !state.ui.showExtraFields);
  els.toggleExtraFields.textContent = state.ui.showExtraFields ? "Hide Extra Inputs" : "More Shot Inputs";

  for (const field of EXTRA_FIELDS) {
    const element = els.extraFieldsContainer.querySelector(`[data-key="${field.key}"]`);
    if (!element) continue;
    element.value = state.controls.extras[field.key] || "";
  }
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
  const penaltyType = state.controls.result === "Penalty" ? (state.controls.penaltyType || "-") : "-";

  const extraSummary = EXTRA_FIELDS
    .map((field) => state.controls.extras[field.key])
    .filter(Boolean)
    .join(" | ");

  els.pathPreview.textContent = extraSummary
    ? `Pending: ${shooter} | ${from}->${to} | ${result} | ${penaltyType} | ${extraSummary}`
    : `Pending: ${shooter} | ${from}->${to} | ${result} | ${penaltyType}`;
}

function renderShots() {
  const rows = state.shots.map((shot) => {
    const detailText = formatShotDetails(shot.extras || {});
    return `
      <tr>
        <td>${shot.index}</td>
        <td>${escapeHtml(teamLabel(shot.team))}</td>
        <td>${escapeHtml(shot.player || "-")}</td>
        <td>${escapeHtml(shot.path || "-")}</td>
        <td>${escapeHtml(shot.result || "-")}</td>
        <td>${escapeHtml(shot.penaltyType || "-")}</td>
        <td>${escapeHtml(detailText)}</td>
      </tr>
    `;
  }).join("");

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

function renderReportSummary() {
  const report = buildReportData();

  const lines = [];
  lines.push(`<p><strong>Total shots:</strong> ${report.totalShots}</p>`);
  lines.push(`<p><strong>Our team goals:</strong> ${report.goalsOur} | <strong>Opponent goals:</strong> ${report.goalsOpp}</p>`);

  lines.push("<h3>By Player</h3>");
  lines.push(buildSimpleTable(["Player", "Shots", "Goals", "Blocked", "Out"], report.byPlayerRows));

  lines.push("<h3>By From Zone</h3>");
  lines.push(buildSimpleTable(["From", "Shots"], report.byFromRows));

  lines.push("<h3>By Hit Zone</h3>");
  lines.push(buildSimpleTable(["Hit", "Shots"], report.byToRows));

  lines.push("<h3>By Result</h3>");
  lines.push(buildSimpleTable(["Result", "Count"], report.byResultRows));

  lines.push("<h3>By Penalty Type</h3>");
  lines.push(buildSimpleTable(["Penalty Type", "Count"], report.byPenaltyRows));

  lines.push("<h3>Shot List</h3>");
  lines.push(buildSimpleTable(["#", "Team", "Player", "Path", "Result", "Penalty"], report.shotRows));

  els.reportSummary.innerHTML = lines.join("\n");
}

function buildSimpleTable(headers, rows) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">No data</td></tr>`;

  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function buildReportData() {
  const shots = state.shots;
  const byPlayer = new Map();
  const byFrom = new Map();
  const byTo = new Map();
  const byResult = new Map();
  const byPenalty = new Map();

  let goalsOur = 0;
  let goalsOpp = 0;

  for (const shot of shots) {
    const player = shot.player || "Unknown";
    const result = shot.result || "-";
    const penaltyType = shot.penaltyType || "-";

    if (result === "Goal") {
      if (shot.team === "our") goalsOur += 1;
      else goalsOpp += 1;
    }

    const playerCurrent = byPlayer.get(player) || { shots: 0, goals: 0, blocked: 0, out: 0 };
    playerCurrent.shots += 1;
    if (result === "Goal") playerCurrent.goals += 1;
    if (result === "Blocked") playerCurrent.blocked += 1;
    if (result === "Out") playerCurrent.out += 1;
    byPlayer.set(player, playerCurrent);

    incrementCount(byFrom, String(shot.from ?? "-"));
    incrementCount(byTo, String(shot.to ?? "-"));
    incrementCount(byResult, result);
    if (result === "Penalty") incrementCount(byPenalty, penaltyType);
  }

  const byPlayerRows = Array.from(byPlayer.entries())
    .map(([player, v]) => [player, v.shots, v.goals, v.blocked, v.out])
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return {
    totalShots: shots.length,
    goalsOur,
    goalsOpp,
    byPlayerRows,
    byFromRows: mapToSortedRows(byFrom),
    byToRows: mapToSortedRows(byTo),
    byResultRows: mapToSortedRows(byResult),
    byPenaltyRows: mapToSortedRows(byPenalty),
    shotRows: shots.map((shot) => [
      shot.index,
      teamLabel(shot.team),
      shot.player || "-",
      shot.path || "-",
      shot.result || "-",
      shot.penaltyType || "-",
    ]),
  };
}

function incrementCount(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function mapToSortedRows(map) {
  return Array.from(map.entries())
    .map(([key, value]) => [key, value])
    .sort((a, b) => Number(b[1]) - Number(a[1]));
}

function generatePdfReport() {
  if (!state.shots.length) {
    alert("No shots to report yet.");
    return;
  }

  const jspdfNamespace = window.jspdf;
  if (!jspdfNamespace || !jspdfNamespace.jsPDF) {
    alert("PDF library not loaded yet. Try again in a moment.");
    return;
  }

  const report = buildReportData();
  const { jsPDF } = jspdfNamespace;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = 40;
  doc.setFontSize(16);
  doc.text("Live Shot Tracker Report", 40, y);
  y += 20;

  doc.setFontSize(11);
  doc.text(`${state.game.teamName || "Our Team"} vs ${state.game.opponent || "Opponent"}`, 40, y);
  y += 16;
  doc.text(`${state.game.sport} | ${state.game.matchLabel || "Match"} | ${new Date().toLocaleString()}`, 40, y);
  y += 16;
  doc.text(`Total shots: ${report.totalShots} | Score: ${report.goalsOur} - ${report.goalsOpp}`, 40, y);
  y += 18;

  doc.autoTable({
    startY: y,
    head: [["Player", "Shots", "Goals", "Blocked", "Out"]],
    body: report.byPlayerRows,
    theme: "grid",
    headStyles: { fillColor: [24, 74, 69] },
    styles: { fontSize: 9 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 14,
    head: [["From", "Shots"]],
    body: report.byFromRows,
    theme: "grid",
    headStyles: { fillColor: [24, 74, 69] },
    styles: { fontSize: 9 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 14,
    head: [["Hit", "Shots"]],
    body: report.byToRows,
    theme: "grid",
    headStyles: { fillColor: [24, 74, 69] },
    styles: { fontSize: 9 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 14,
    head: [["Result", "Count"]],
    body: report.byResultRows,
    theme: "grid",
    headStyles: { fillColor: [24, 74, 69] },
    styles: { fontSize: 9 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 14,
    head: [["Penalty Type", "Count"]],
    body: report.byPenaltyRows,
    theme: "grid",
    headStyles: { fillColor: [24, 74, 69] },
    styles: { fontSize: 9 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 14,
    head: [["#", "Team", "Player", "Path", "Result", "Penalty"]],
    body: report.shotRows,
    theme: "grid",
    headStyles: { fillColor: [24, 74, 69] },
    styles: { fontSize: 8 },
  });

  const fileName = buildFileName("pdf");
  doc.save(fileName);
}

function formatShotDetails(extras) {
  const bits = [];
  for (const field of EXTRA_FIELDS) {
    const value = extras[field.key];
    if (value) bits.push(`${field.label}: ${value}`);
  }
  return bits.join(" | ") || "-";
}

function exportCsv() {
  if (!state.shots.length) {
    alert("No shots to export yet.");
    return;
  }

  const rows = [
    ["index", "team", "player", "from", "to", "path", "result", "penaltyType", ...EXTRA_FIELDS.map((f) => f.key), "createdAt"],
    ...state.shots.map((shot) => [
      shot.index,
      shot.team,
      shot.player,
      shot.from ?? "",
      shot.to ?? "",
      shot.path,
      shot.result,
      shot.penaltyType || "",
      ...EXTRA_FIELDS.map((f) => (shot.extras && shot.extras[f.key]) || ""),
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
    shots: state.shots,
    schema: {
      required: ["team", "player", "from", "to", "result", "penaltyType"],
      optional: EXTRA_FIELDS.map((f) => f.key),
    },
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

function toPct(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function teamLabel(team) {
  return team === "our" ? (state.game.teamName || "Our Team") : (state.game.opponent || "Opponent");
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

  hydrateRosterInputs();
  els.subTeam.value = state.teams.current;
  renderSubOptions();
}

function hydrateRosterInputs() {
  hydrateRosterSideInputs(els.ourRosterInputs, "our");
  hydrateRosterSideInputs(els.oppRosterInputs, "opponent");
}

function hydrateRosterSideInputs(container, side) {
  const inputs = container.querySelectorAll("input[data-side]");
  inputs.forEach((input) => {
    const idx = Number(input.dataset.idx);
    input.value = state.teams.roster[side][idx] || defaultRosterName(side, idx);
  });
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
      ui: {
        ...initialState.ui,
        ...(parsed.ui || {}),
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
        extras: {
          ...initialState.controls.extras,
          ...((parsed.controls && parsed.controls.extras) || {}),
        },
      },
      shots: normalizeShots(parsed.shots),
      meta: {
        ...initialState.meta,
        ...(parsed.meta || {}),
      },
    };

    merged.teams.history = Array.isArray(merged.teams.history) ? merged.teams.history : [];
    merged.teams.current = merged.teams.current === "opponent" ? "opponent" : "our";
    merged.ui.currentView = ["capture", "stats", "log", "report"].includes(merged.ui.currentView)
      ? merged.ui.currentView
      : "capture";

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
    penaltyType: shot.penaltyType || "",
    extras: normalizeExtras(shot.extras),
    createdAt: shot.createdAt || new Date().toISOString(),
  }));
}

function normalizeExtras(extras) {
  const merged = buildEmptyExtras();
  if (!extras || typeof extras !== "object") return merged;

  for (const field of EXTRA_FIELDS) {
    merged[field.key] = String(extras[field.key] || "");
  }

  return merged;
}

function setupPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js", { updateViaCache: "none" })
        .then((registration) => {
          registration.update().catch(() => {
          });

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (window.__shotTrackerReloaded) return;
            window.__shotTrackerReloaded = true;
            window.location.reload();
          });
        })
        .catch(() => {
        });
    });
  }
}

function setInstallHints() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (ios && !standalone) els.iosInstallHint.classList.remove("hidden");
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
