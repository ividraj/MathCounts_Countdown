const STORAGE_KEY = "mathcounts-ladder-v1";
const MIN_COMPETITORS = 10;
const MAX_COMPETITORS = 16;
const DEFAULT_COMPETITORS = 16;
const STEADY_PREVIEW_MS = 2400;
const SPIN_DURATION_MS = 2600;
const FIRST_TWO_PAUSE_MS = 2600;
const ANIMAL_EMOJIS = ["🐼", "🦊", "🐯", "🐨", "🐰", "🦁", "🐸", "🦄", "🐶", "🐱", "🐻", "🐵", "🦉", "🐙", "🐢", "🐧"];

const setupPanel = document.getElementById("setupPanel");
const shufflePanel = document.getElementById("shufflePanel");
const matchPanel = document.getElementById("matchPanel");
const ladderPanel = document.getElementById("ladderPanel");
const resultsPanel = document.getElementById("resultsPanel");

const namesInput = document.getElementById("namesInput");
const setupError = document.getElementById("setupError");
const shuffleNames = document.getElementById("shuffleNames");
const winnerBanner = document.getElementById("winnerBanner");

const leftName = document.getElementById("leftName");
const rightName = document.getElementById("rightName");
const leftAvatar = document.getElementById("leftAvatar");
const rightAvatar = document.getElementById("rightAvatar");
const leftScore = document.getElementById("leftScore");
const rightScore = document.getElementById("rightScore");
const targetBadge = document.getElementById("targetBadge");
const progressText = document.getElementById("progressText");
const nextText = document.getElementById("nextText");
const winningList = document.getElementById("winningList");
const notCompetedList = document.getElementById("notCompetedList");
const finalRanking = document.getElementById("finalRanking");

const startBtn = document.getElementById("startBtn");
const fillSampleBtn = document.getElementById("fillSampleBtn");
const leftPointBtn = document.getElementById("leftPointBtn");
const rightPointBtn = document.getElementById("rightPointBtn");
const undoBtn = document.getElementById("undoBtn");
const resetMatchBtn = document.getElementById("resetMatchBtn");
const newTournamentBtn = document.getElementById("newTournamentBtn");
const restartBtn = document.getElementById("restartBtn");

const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");

const state = {
  phase: "setup",
  competitors: [],
  leftId: null,
  rightId: null,
  unrankedQueue: [],
  placements: {},
  backRank: DEFAULT_COMPETITORS,
  scores: { left: 0, right: 0 },
  regularTarget: 3,
  finalFourMargin: 3,
  winCounts: {},
  competitorEmojis: {},
  shufflePreviewIds: [],
  introFirstTwoIds: [],
  history: [],
  locked: false,
};

function defaultNames() {
  return Array.from({ length: DEFAULT_COMPETITORS }, (_, index) => `Competitor ${index + 1}`).join("\n");
}

function getNameById(id) {
  return state.competitors.find((competitor) => competitor.id === id)?.name ?? "Unknown";
}

function getEmojiById(id) {
  return state.competitorEmojis[id] ?? "🐾";
}

function getDisplayNameById(id) {
  return `${getEmojiById(id)} ${getNameById(id)}`;
}

function assignAnimalEmojis(ids) {
  const shuffledEmojis = shuffleArray(ANIMAL_EMOJIS);
  const emojiMap = {};
  ids.forEach((id, index) => {
    emojiMap[id] = shuffledEmojis[index % shuffledEmojis.length];
  });
  return emojiMap;
}

function activeCount() {
  const placedCount = Object.keys(state.placements).length;
  return state.competitors.length - placedCount;
}

function isFinalFourMode() {
  return activeCount() <= 4;
}

function hasMatchWinner(side) {
  if (isFinalFourMode()) {
    const scoreDiff = state.scores.left - state.scores.right;
    return side === "left" ? scoreDiff >= state.finalFourMargin : -scoreDiff >= state.finalFourMargin;
  }

  return state.scores[side] >= state.regularTarget;
}

function shuffleArray(items) {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      phase: state.phase,
      competitors: state.competitors,
      leftId: state.leftId,
      rightId: state.rightId,
      unrankedQueue: state.unrankedQueue,
      placements: state.placements,
      backRank: state.backRank,
      scores: state.scores,
      regularTarget: state.regularTarget,
      finalFourMargin: state.finalFourMargin,
      winCounts: state.winCounts,
      competitorEmojis: state.competitorEmojis,
      shufflePreviewIds: state.shufflePreviewIds,
      introFirstTwoIds: state.introFirstTwoIds,
      history: state.history,
      locked: state.locked,
    })
  );
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    namesInput.value = defaultNames();
    render();
    return;
  }

  try {
    const data = JSON.parse(raw);
    Object.assign(state, data);
    if (!Array.isArray(state.shufflePreviewIds)) {
      state.shufflePreviewIds = [];
    }
    if (!Array.isArray(state.introFirstTwoIds)) {
      state.introFirstTwoIds = [];
    }
    if (!state.winCounts || typeof state.winCounts !== "object") {
      state.winCounts = {};
    }
    if (typeof state.finalFourMargin !== "number" || state.finalFourMargin < 1) {
      state.finalFourMargin = typeof state.finalFourTarget === "number" ? state.finalFourTarget : 3;
    }
    if (!state.competitorEmojis || typeof state.competitorEmojis !== "object") {
      state.competitorEmojis = {};
    }

    if (state.phase === "shuffle") {
      state.phase = "setup";
      state.locked = false;
      state.shufflePreviewIds = [];
      state.introFirstTwoIds = [];
    }

    if (state.phase === "inMatch" && (!state.leftId || !state.rightId)) {
      state.phase = "setup";
      state.locked = false;
    }

    if (state.competitors.length > 0 && Object.keys(state.competitorEmojis).length === 0) {
      const ids = state.competitors.map((competitor) => competitor.id);
      state.competitorEmojis = assignAnimalEmojis(ids);
    }
    namesInput.value = state.competitors.map((competitor) => competitor.name).join("\n") || defaultNames();
  } catch {
    namesInput.value = defaultNames();
  }

  render();
}

function pushHistory() {
  state.history.push({
    phase: state.phase,
    leftId: state.leftId,
    rightId: state.rightId,
    unrankedQueue: [...state.unrankedQueue],
    placements: { ...state.placements },
    backRank: state.backRank,
    scores: { ...state.scores },
    winCounts: { ...state.winCounts },
  });

  if (state.history.length > 200) {
    state.history.shift();
  }
}

function showPanel(panel, visible) {
  panel.classList.toggle("hidden", !visible);
}

function renderCompetitorPanels() {
  winningList.innerHTML = "";
  notCompetedList.innerHTML = "";

  const activeWinnerIds = state.competitors
    .filter((competitor) => state.winCounts[competitor.id] > 0 && !Object.values(state.placements).includes(competitor.id))
    .map((competitor) => competitor.id)
    .sort((leftId, rightId) => state.winCounts[rightId] - state.winCounts[leftId]);

  activeWinnerIds.forEach((competitorId) => {
    const item = document.createElement("li");
    item.className = "status-item win";
    const wins = state.winCounts[competitorId];
    const seat = competitorId === state.leftId ? "Left Seat" : competitorId === state.rightId ? "Right Seat" : "";
    item.innerHTML = `<span>${getDisplayNameById(competitorId)}</span><span class="status-label">${wins} win${wins > 1 ? "s" : ""}${seat ? ` • ${seat}` : ""}</span>`;
    winningList.appendChild(item);
  });

  const placedEntries = Object.entries(state.placements)
    .map(([rank, competitorId]) => ({ rank: Number(rank), competitorId }))
    .sort((a, b) => a.rank - b.rank);

  placedEntries.forEach(({ rank, competitorId }) => {
    const item = document.createElement("li");
    item.className = "status-item";
    item.innerHTML = `<span>${getDisplayNameById(competitorId)}</span><span class="status-label">Placed #${rank}</span>`;
    winningList.appendChild(item);
  });

  if (activeWinnerIds.length === 0 && placedEntries.length === 0) {
    const item = document.createElement("li");
    item.className = "status-item";
    item.innerHTML = `<span>No winners yet</span><span class="status-label">First round in progress</span>`;
    winningList.appendChild(item);
  }

  const rightColumnIds = state.phase === "shuffle" && state.shufflePreviewIds.length > 0 ? state.shufflePreviewIds : state.unrankedQueue;

  rightColumnIds.forEach((competitorId, index) => {
    const item = document.createElement("li");
    item.className = "status-item";

    if (state.phase === "shuffle" && state.introFirstTwoIds.includes(competitorId)) {
      item.classList.add("starter");
    }

    if (state.phase === "inMatch" && index === 0) {
      item.classList.add("on-deck");
    }

    let label = "Waiting";
    if (state.phase === "shuffle" && state.introFirstTwoIds.includes(competitorId)) {
      label = "Up First";
    } else if (state.phase === "shuffle") {
      label = "Shuffling";
    } else if (state.phase === "inMatch" && index === 0) {
      label = "On Deck";
    }

    item.innerHTML = `<span>${getDisplayNameById(competitorId)}</span><span class="status-label">${label}</span>`;
    notCompetedList.appendChild(item);
  });

  if (rightColumnIds.length === 0) {
    const item = document.createElement("li");
    item.className = "status-item";
    item.innerHTML = `<span>No one waiting</span><span class="status-label">Final match state</span>`;
    notCompetedList.appendChild(item);
  }
}

function renderFinalResults() {
  finalRanking.innerHTML = "";
  for (let rank = 1; rank <= state.competitors.length; rank += 1) {
    const line = document.createElement("li");
    line.textContent = getDisplayNameById(state.placements[rank]);
    finalRanking.appendChild(line);
  }
}

function renderMatch() {
  leftAvatar.textContent = getEmojiById(state.leftId);
  rightAvatar.textContent = getEmojiById(state.rightId);
  leftName.textContent = getNameById(state.leftId);
  rightName.textContent = getNameById(state.rightId);
  leftScore.textContent = String(state.scores.left);
  rightScore.textContent = String(state.scores.right);

  const mode = isFinalFourMode() ? "Final 4" : "Main Round";
  targetBadge.textContent = isFinalFourMode()
    ? `${mode}: lead by ${state.finalFourMargin}`
    : `${mode}: first to ${state.regularTarget}`;
  progressText.textContent = `Eliminations complete: ${Object.keys(state.placements).length}/${state.competitors.length - 1}`;
  nextText.textContent = state.unrankedQueue.length > 0 ? `On deck next: ${getDisplayNameById(state.unrankedQueue[0])}` : "No waiting competitors left.";

  const disabled = state.locked || state.phase !== "inMatch";
  leftPointBtn.disabled = disabled;
  rightPointBtn.disabled = disabled;
  undoBtn.disabled = state.locked || state.history.length === 0;
  resetMatchBtn.disabled = state.locked;
}

function render() {
  showPanel(setupPanel, state.phase === "setup");
  showPanel(shufflePanel, state.phase === "shuffle");
  showPanel(matchPanel, state.phase === "inMatch");
  showPanel(resultsPanel, state.phase === "finished");
  showPanel(ladderPanel, state.phase === "shuffle" || state.phase === "inMatch" || state.phase === "finished");

  if (state.phase === "inMatch") {
    renderMatch();
  }

  renderCompetitorPanels();

  if (state.phase === "finished") {
    renderFinalResults();
  }

  saveState();
}

function parseNames(rawText) {
  return rawText
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
}

function beginTournamentFromOrder(shuffledIds) {
  state.leftId = shuffledIds[0];
  state.rightId = shuffledIds[1];
  state.unrankedQueue = shuffledIds.slice(2);
  state.placements = {};
  state.backRank = state.competitors.length;
  state.scores = { left: 0, right: 0 };
  state.winCounts = {};
  state.shufflePreviewIds = [];
  state.introFirstTwoIds = [];
  state.history = [];
  state.locked = false;
  state.phase = "inMatch";
  winnerBanner.classList.add("hidden");
  render();
}

function runShuffleAnimation(names) {
  state.competitors = names.map((name, index) => ({ id: index + 1, name }));
  const allIds = state.competitors.map((competitor) => competitor.id);
  state.competitorEmojis = assignAnimalEmojis(allIds);

  state.leftId = null;
  state.rightId = null;
  state.unrankedQueue = [...allIds];
  state.placements = {};
  state.backRank = state.competitors.length;
  state.scores = { left: 0, right: 0 };
  state.winCounts = {};
  state.history = [];
  state.locked = true;
  state.shufflePreviewIds = [...allIds];
  state.introFirstTwoIds = [];
  state.phase = "shuffle";
  shuffleNames.textContent = `🎲 Meet the ${state.competitors.length} competitors...`;
  render();

  setTimeout(() => {
    shuffleNames.textContent = "🎰 Spinning order...";
    const spinTimer = setInterval(() => {
      state.shufflePreviewIds = shuffleArray(state.shufflePreviewIds);
      render();
    }, 110);

    setTimeout(() => {
      clearInterval(spinTimer);
      const finalOrder = shuffleArray(allIds);
      state.shufflePreviewIds = [...finalOrder];
      state.introFirstTwoIds = [finalOrder[0], finalOrder[1]];
      shuffleNames.textContent = `🎤 Up first: ${getDisplayNameById(finalOrder[0])} vs ${getDisplayNameById(finalOrder[1])}`;
      render();

      setTimeout(() => {
        beginTournamentFromOrder(finalOrder);
      }, FIRST_TWO_PAUSE_MS);
    }, SPIN_DURATION_MS);
  }, STEADY_PREVIEW_MS);
}

function lockDuringCelebration() {
  state.locked = true;
  render();
}

function unlockAfterCelebration() {
  state.locked = false;
  winnerBanner.classList.add("hidden");
  render();
}

function closeTournament(finalChampionId) {
  state.placements[1] = finalChampionId;
  state.phase = "finished";
  state.locked = false;
  render();
}

function resolveMatch(winnerSide) {
  const winnerId = winnerSide === "left" ? state.leftId : state.rightId;
  const loserId = winnerSide === "left" ? state.rightId : state.leftId;

  state.placements[state.backRank] = loserId;
  state.backRank -= 1;
  state.winCounts[winnerId] = (state.winCounts[winnerId] ?? 0) + 1;

  winnerBanner.textContent = `🏆 ${getDisplayNameById(winnerId)} wins this round!`;
  winnerBanner.classList.remove("hidden");

  launchConfetti();
  lockDuringCelebration();

  setTimeout(() => {
    if (state.unrankedQueue.length === 0) {
      closeTournament(winnerId);
      return;
    }

    const nextCompetitorId = state.unrankedQueue.shift();
    if (winnerSide === "left") {
      state.leftId = winnerId;
      state.rightId = nextCompetitorId;
    } else {
      state.rightId = winnerId;
      state.leftId = nextCompetitorId;
    }

    state.scores.left = 0;
    state.scores.right = 0;
    unlockAfterCelebration();
  }, 1500);
}

function addPoint(side) {
  if (state.phase !== "inMatch" || state.locked) {
    return;
  }

  pushHistory();

  if (side === "left") {
    state.scores.left += 1;
  } else {
    state.scores.right += 1;
  }

  render();

  if (hasMatchWinner("left")) {
    resolveMatch("left");
  } else if (hasMatchWinner("right")) {
    resolveMatch("right");
  }
}

function undoLastPoint() {
  if (state.history.length === 0 || state.locked) {
    return;
  }

  const snapshot = state.history.pop();
  state.phase = snapshot.phase;
  state.leftId = snapshot.leftId;
  state.rightId = snapshot.rightId;
  state.unrankedQueue = snapshot.unrankedQueue;
  state.placements = snapshot.placements;
  state.backRank = snapshot.backRank;
  state.scores = snapshot.scores;
  state.winCounts = snapshot.winCounts;
  winnerBanner.classList.add("hidden");
  render();
}

function resetCurrentMatch() {
  if (state.phase !== "inMatch" || state.locked) {
    return;
  }

  pushHistory();
  state.scores = { left: 0, right: 0 };
  render();
}

function resetEverything() {
  localStorage.removeItem(STORAGE_KEY);
  state.phase = "setup";
  state.competitors = [];
  state.leftId = null;
  state.rightId = null;
  state.unrankedQueue = [];
  state.placements = {};
  state.backRank = DEFAULT_COMPETITORS;
  state.scores = { left: 0, right: 0 };
  state.winCounts = {};
  state.competitorEmojis = {};
  state.shufflePreviewIds = [];
  state.introFirstTwoIds = [];
  state.history = [];
  state.locked = false;
  namesInput.value = defaultNames();
  winnerBanner.classList.add("hidden");
  render();
}

function launchConfetti() {
  const particles = [];
  const width = window.innerWidth;
  const height = window.innerHeight;
  confettiCanvas.width = width;
  confettiCanvas.height = height;

  for (let i = 0; i < 120; i += 1) {
    particles.push({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.25,
      size: 4 + Math.random() * 6,
      speedY: 2 + Math.random() * 4,
      speedX: -2 + Math.random() * 4,
      color: ["#f43f5e", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"][Math.floor(Math.random() * 5)],
      tilt: Math.random() * Math.PI,
      spin: 0.1 + Math.random() * 0.2,
    });
  }

  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    confettiCtx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.tilt += particle.spin;

      confettiCtx.save();
      confettiCtx.translate(particle.x, particle.y);
      confettiCtx.rotate(particle.tilt);
      confettiCtx.fillStyle = particle.color;
      confettiCtx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      confettiCtx.restore();
    }

    if (elapsed < 1400) {
      requestAnimationFrame(frame);
    } else {
      confettiCtx.clearRect(0, 0, width, height);
    }
  }

  requestAnimationFrame(frame);
}

startBtn.addEventListener("click", () => {
  const names = parseNames(namesInput.value);
  if (names.length < MIN_COMPETITORS || names.length > MAX_COMPETITORS) {
    setupError.textContent = `Please enter between ${MIN_COMPETITORS} and ${MAX_COMPETITORS} names.`;
    return;
  }

  const unique = new Set(names.map((name) => name.toLowerCase()));
  if (unique.size !== names.length) {
    setupError.textContent = "Each name should be unique.";
    return;
  }

  setupError.textContent = "";
  runShuffleAnimation(names);
});

fillSampleBtn.addEventListener("click", () => {
  namesInput.value = defaultNames();
});

leftPointBtn.addEventListener("click", () => addPoint("left"));
rightPointBtn.addEventListener("click", () => addPoint("right"));
undoBtn.addEventListener("click", undoLastPoint);
resetMatchBtn.addEventListener("click", resetCurrentMatch);
newTournamentBtn.addEventListener("click", () => {
  if (window.confirm("Start over and erase this tournament?")) {
    resetEverything();
  }
});
restartBtn.addEventListener("click", resetEverything);

window.addEventListener("resize", () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

loadState();
