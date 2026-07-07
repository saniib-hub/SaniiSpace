const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

const MODE_COLORS = {
  focus: "#7c9bff",
  short: "#5ce0b8",
  long: "#ffb15c",
};

const MODE_LABELS = {
  focus: "Focus",
  short: "Short Break",
  long: "Long Break",
};

const els = {
  modes: document.getElementById("modes"),
  timeLeft: document.getElementById("timeLeft"),
  modeName: document.getElementById("modeName"),
  ring: document.getElementById("ringProgress"),
  startPause: document.getElementById("startPause"),
  reset: document.getElementById("reset"),
  skip: document.getElementById("skip"),
  streakCount: document.getElementById("streakCount"),
  celebration: document.getElementById("celebration"),
  focusLen: document.getElementById("focusLen"),
  shortLen: document.getElementById("shortLen"),
  longLen: document.getElementById("longLen"),
  cycleLen: document.getElementById("cycleLen"),
  soundToggle: document.getElementById("soundToggle"),
  app: document.querySelector(".app"),
};

els.ring.style.strokeDasharray = RING_CIRCUMFERENCE;

const state = {
  mode: "focus",
  running: false,
  secondsLeft: 0,
  totalSeconds: 0,
  intervalId: null,
  completedFocusSessions: 0,
};

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("focusForgeSettings") || "{}");
  if (saved.focusLen) els.focusLen.value = saved.focusLen;
  if (saved.shortLen) els.shortLen.value = saved.shortLen;
  if (saved.longLen) els.longLen.value = saved.longLen;
  if (saved.cycleLen) els.cycleLen.value = saved.cycleLen;
  if (typeof saved.sound === "boolean") els.soundToggle.checked = saved.sound;
}

function saveSettings() {
  localStorage.setItem(
    "focusForgeSettings",
    JSON.stringify({
      focusLen: els.focusLen.value,
      shortLen: els.shortLen.value,
      longLen: els.longLen.value,
      cycleLen: els.cycleLen.value,
      sound: els.soundToggle.checked,
    })
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak() {
  const data = JSON.parse(localStorage.getItem("focusForgeStreak") || "{}");
  if (data.date === todayKey()) {
    state.completedFocusSessions = data.count || 0;
  } else {
    state.completedFocusSessions = 0;
  }
  els.streakCount.textContent = state.completedFocusSessions;
}

function saveStreak() {
  localStorage.setItem(
    "focusForgeStreak",
    JSON.stringify({ date: todayKey(), count: state.completedFocusSessions })
  );
}

function clampMinutes(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function modeMinutes(mode) {
  if (mode === "focus") return clampMinutes(els.focusLen.value, 25);
  if (mode === "short") return clampMinutes(els.shortLen.value, 5);
  return clampMinutes(els.longLen.value, 15);
}

function setMode(mode, resetTimer = true) {
  state.mode = mode;
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  els.modeName.textContent = MODE_LABELS[mode];
  document.documentElement.style.setProperty("--accent", MODE_COLORS[mode]);

  if (resetTimer) {
    pause();
    state.totalSeconds = modeMinutes(mode) * 60;
    state.secondsLeft = state.totalSeconds;
    updateDisplay();
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateDisplay() {
  els.timeLeft.textContent = formatTime(state.secondsLeft);
  const progress = 1 - state.secondsLeft / state.totalSeconds;
  els.ring.style.strokeDashoffset = RING_CIRCUMFERENCE * progress;
}

function tick() {
  state.secondsLeft--;
  if (state.secondsLeft <= 0) {
    completeSession();
    return;
  }
  updateDisplay();
}

function start() {
  if (state.running) return;
  state.running = true;
  els.startPause.textContent = "Pause";
  state.intervalId = setInterval(tick, 1000);
}

function pause() {
  state.running = false;
  els.startPause.textContent = "Start";
  clearInterval(state.intervalId);
}

function toggleStartPause() {
  if (state.running) pause();
  else start();
}

function resetTimer() {
  pause();
  state.totalSeconds = modeMinutes(state.mode) * 60;
  state.secondsLeft = state.totalSeconds;
  updateDisplay();
}

function nextMode() {
  if (state.mode === "focus") {
    const cycle = Number(els.cycleLen.value) || 4;
    const isLongBreak = state.completedFocusSessions % cycle === 0 && state.completedFocusSessions > 0;
    return isLongBreak ? "long" : "short";
  }
  return "focus";
}

function completeSession(skipped = false) {
  pause();
  if (!skipped && state.mode === "focus") {
    state.completedFocusSessions++;
    saveStreak();
    els.streakCount.textContent = state.completedFocusSessions;
    celebrate();
    if (els.soundToggle.checked) playChime();
  }
  const next = nextMode();
  setMode(next);
  pulse();
}

function skipSession() {
  completeSession(true);
}

function pulse() {
  els.app.classList.remove("pulse");
  void els.app.offsetWidth;
  els.app.classList.add("pulse");
}

function celebrate() {
  const colors = ["#7c9bff", "#5ce0b8", "#ffb15c", "#ff6c8f", "#f2f3f7"];
  for (let i = 0; i < 24; i++) {
    const c = document.createElement("div");
    c.className = "confetto";
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = `${Math.random() * 0.3}s`;
    els.celebration.appendChild(c);
    setTimeout(() => c.remove(), 2200);
  }
}

let audioCtx;
function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = [660, 880, 1100];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const startTime = audioCtx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {
    /* audio not available */
  }
}

els.modes.addEventListener("click", (e) => {
  const btn = e.target.closest(".mode-btn");
  if (!btn) return;
  setMode(btn.dataset.mode);
});

els.startPause.addEventListener("click", toggleStartPause);
els.reset.addEventListener("click", resetTimer);
els.skip.addEventListener("click", skipSession);

[els.focusLen, els.shortLen, els.longLen, els.cycleLen, els.soundToggle].forEach((input) => {
  input.addEventListener("change", () => {
    saveSettings();
    if (!state.running) {
      state.totalSeconds = modeMinutes(state.mode) * 60;
      state.secondsLeft = state.totalSeconds;
      updateDisplay();
    }
  });
});

loadSettings();
loadStreak();
setMode("focus");
