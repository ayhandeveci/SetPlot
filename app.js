// ─── WORKOUT DEFINITIONS ───────────────────────────────────────────────────
const workouts = {
  Day_A_Salon: {
    label: "Day A — Salon",
    subtitle: "Horizontal Push + Pull + Legs",
    exercises: [
      { exercise: "Chest Press Machine",   sets: 3, reps: 8  },
      { exercise: "Seated Row Machine",    sets: 3, reps: 8  },
      { exercise: "Leg Press",             sets: 3, reps: 10 },
      { exercise: "Goblet Squat",          sets: 2, reps: 8  },
      { exercise: "Triceps Pushdown",      sets: 3, reps: 10 }
    ]
  },
  Day_A_Ev: {
    label: "Day A — Ev",
    subtitle: "Horizontal Push + Pull + Legs",
    exercises: [
      { exercise: "Push-up",               sets: 3, reps: 10 },
      { exercise: "Inverted Row",          sets: 3, reps: 8  },
      { exercise: "Bulgarian Split Squat", sets: 3, reps: 8  },
      { exercise: "Box Squat",             sets: 2, reps: 8  },
      { exercise: "Diamond Push-up",       sets: 3, reps: 10 }
    ]
  },
  Day_B_Salon: {
    label: "Day B — Salon",
    subtitle: "Vertical Push + Pull + Hinge",
    exercises: [
      { exercise: "Shoulder Press Machine", sets: 3, reps: 8  },
      { exercise: "Lat Pulldown Machine",   sets: 3, reps: 8  },
      { exercise: "RDL",                    sets: 3, reps: 8  },
      { exercise: "Incline Curl DB",        sets: 3, reps: 10 }
    ]
  },
  Day_B_Ev: {
    label: "Day B — Ev",
    subtitle: "Vertical Push + Pull + Hinge",
    exercises: [
      { exercise: "Pike Push-up",           sets: 3, reps: 8  },
      { exercise: "Door Frame Row",         sets: 3, reps: 8  },
      { exercise: "Good Morning",           sets: 3, reps: 10 },
      { exercise: "Hammer Curl DB",         sets: 3, reps: 10 }
    ]
  },
  Day_C_Salon: {
    label: "Day C — Salon",
    subtitle: "Core & Stabilite",
    exercises: [
      { exercise: "Plank",                  sets: 3, reps: 40 },
      { exercise: "Dead Bug",               sets: 3, reps: 10 },
      { exercise: "Bird Dog",               sets: 3, reps: 10 },
      { exercise: "Hollow Body Hold",       sets: 3, reps: 30 },
      { exercise: "Hip Abduction Machine",  sets: 3, reps: 15 },
      { exercise: "Leg Curl Machine",       sets: 3, reps: 12 },
      { exercise: "Leg Extension Machine",  sets: 3, reps: 12 }
    ]
  },
  Day_C_Ev: {
    label: "Day C — Ev",
    subtitle: "Core & Stabilite",
    exercises: [
      { exercise: "Plank",                  sets: 3, reps: 40 },
      { exercise: "Dead Bug",               sets: 3, reps: 10 },
      { exercise: "Bird Dog",               sets: 3, reps: 10 },
      { exercise: "Hollow Body Hold",       sets: 3, reps: 30 },
      { exercise: "Glute Bridge",           sets: 3, reps: 15 },
      { exercise: "Pallof Press (Band)",    sets: 3, reps: 12 }
    ]
  }
};

// Sıra: A → B → C → A → B → C ...
const DAY_ORDER = ["Day_A", "Day_B", "Day_C"];

// ─── STORAGE KEYS ──────────────────────────────────────────────────────────
const STORAGE_KEY   = "setplot_current_workout_v2";
const HISTORY_KEY   = "setplot_history_v2";
const LAST_DAY_KEY  = "setplot_last_completed_day";

// ─── STATE ─────────────────────────────────────────────────────────────────
const state = {
  selectedDay:   "Day_A_Salon",
  flatSets:      [],
  currentIndex:  0,
  logs:          [],
  startedAt:     null,
  timerInterval: null
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function dayType(dayKey) {
  // "Day_A_Salon" → "Day_A"
  return dayKey.split("_").slice(0, 2).join("_");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function workoutId() {
  return `${state.selectedDay}_${today()}`;
}

function workoutFileName() {
  return `${state.selectedDay}_${today()}_log.csv`;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(`screen${name}`).classList.add("active");
}

// ─── NEXT DAY LOGIC ────────────────────────────────────────────────────────
// Reads last completed day from localStorage and returns the next day key.
// e.g. last = "Day_A" → next = "Day_B"
// If nothing recorded yet, returns "Day_A".
function getNextDayType() {
  const last = localStorage.getItem(LAST_DAY_KEY); // "Day_A" / "Day_B" / "Day_C"
  if (!last) return "Day_A";
  const idx = DAY_ORDER.indexOf(last);
  return DAY_ORDER[(idx + 1) % DAY_ORDER.length];
}

function saveLastCompletedDay(dayKey) {
  localStorage.setItem(LAST_DAY_KEY, dayType(dayKey));
}

// ─── HISTORY ───────────────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveToHistory(logs) {
  const history = loadHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...history, ...logs]));
}

function getLastPerformance(exercise, dt) {
  // dt = "Day_A" / "Day_B" / "Day_C"
  const history = loadHistory();
  const relevant = history
    .filter(l => l.exercise === exercise && l.workout_day && l.workout_day.startsWith(dt))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return relevant[0] || null;
}

// ─── PROGRESSIVE OVERLOAD ──────────────────────────────────────────────────
function calcSuggestion(last) {
  if (!last) return null;

  const minimum = { kg: last.actual_kg, reps: last.actual_reps };

  if (last.rir === "" || last.rir === null || last.rir === undefined) {
    return { minimum, suggestion: null };
  }

  let sKg = last.actual_kg, sReps = last.actual_reps;

  if (last.rir <= 1)      { sKg = last.actual_kg + 2.5; }
  else if (last.rir === 2){ sReps = last.actual_reps + 1; }
  // rir >= 3 → same (still has room)

  return { minimum, suggestion: { kg: sKg, reps: sReps } };
}

// ─── WORKOUT SELECTION UI ──────────────────────────────────────────────────
function selectWorkout(day) {
  state.selectedDay = day;
  document.querySelectorAll(".workout-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.day === day);
  });
}

document.querySelectorAll(".workout-option").forEach(btn => {
  btn.addEventListener("click", () => selectWorkout(btn.dataset.day));
});

// ─── NEXT DAY BANNER ───────────────────────────────────────────────────────
// Shows a small banner on setup screen: "Sıradaki: Gün B"
// and auto-selects the Salon version of that day.
function applyNextDaySuggestion() {
  const next = getNextDayType(); // "Day_A" / "Day_B" / "Day_C"
  const defaultVariant = next + "_Salon";

  // Auto-select in UI
  if (workouts[defaultVariant]) {
    selectWorkout(defaultVariant);
  }

  // Show banner
  const banner = $("nextDayBanner");
  const last = localStorage.getItem(LAST_DAY_KEY);
  if (last) {
    const labels = { Day_A: "Gün A", Day_B: "Gün B", Day_C: "Gün C" };
    banner.textContent = `Sıradaki: ${labels[next]} · Son tamamlanan: ${labels[last]}`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

// ─── BUILD FLAT SET LIST ───────────────────────────────────────────────────
function buildWorkout(day) {
  const flat = [];
  workouts[day].exercises.forEach(item => {
    for (let i = 1; i <= item.sets; i++) {
      flat.push({
        workout_day:             day,
        exercise:                item.exercise,
        set_no:                  i,
        total_sets_for_exercise: item.sets,
        target_reps:             item.reps
      });
    }
  });
  return flat;
}

// ─── START / RESUME ────────────────────────────────────────────────────────
function startWorkout(resume = false) {
  if (!resume) {
    state.flatSets     = buildWorkout(state.selectedDay);
    state.logs         = [];
    state.currentIndex = 0;
    state.startedAt    = new Date().toISOString();
  }
  startTimer();
  loadCurrentSet();
  saveLocal();
  showScreen("Active");
}

$("startWorkoutBtn").addEventListener("click", () => startWorkout(false));

// ─── TIMER ─────────────────────────────────────────────────────────────────
function startTimer() {
  if (state.timerInterval) return;
  const start = state.startedAt ? new Date(state.startedAt) : new Date();
  state.startedAt = start.toISOString();
  state.timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - start) / 1000);
    const min  = String(Math.floor(diff / 60)).padStart(2, "0");
    const sec  = String(diff % 60).padStart(2, "0");
    $("timer").textContent = `${min}:${sec}`;
  }, 1000);
}

// ─── LOAD CURRENT SET ──────────────────────────────────────────────────────
function loadCurrentSet() {
  const item = state.flatSets[state.currentIndex];
  if (!item) { finishWorkout(); return; }

  const existing = state.logs.find(l => l.flat_index === state.currentIndex);
  const dt       = dayType(state.selectedDay);
  const last     = getLastPerformance(item.exercise, dt);
  const calc     = calcSuggestion(last);

  $("activeDay").textContent      = workouts[state.selectedDay].label;
  $("activeProgress").textContent = `Set ${state.currentIndex + 1} / ${state.flatSets.length}`;
  $("currentExercise").textContent = item.exercise;
  $("targetSet").textContent      = `${item.set_no}/${item.total_sets_for_exercise}`;
  $("targetReps").textContent     = item.target_reps;
  $("loggedCount").textContent    = state.logs.length;

  // Suggestion box
  if (calc) {
    $("suggestionBox").classList.remove("hidden");
    $("suggMin").textContent = `${calc.minimum.kg} kg × ${calc.minimum.reps} reps`;
    if (calc.suggestion) {
      $("suggOverload").textContent = `${calc.suggestion.kg} kg × ${calc.suggestion.reps} reps`;
      $("suggOverloadRow").classList.remove("hidden");
    } else {
      $("suggOverloadRow").classList.add("hidden");
    }
  } else {
    $("suggestionBox").classList.add("hidden");
  }

  $("actualKg").value   = existing ? existing.actual_kg   : "";
  $("actualReps").value = existing ? existing.actual_reps  : item.target_reps;
  $("actualRir").value  = existing ? existing.rir          : "";
  $("actualNote").value = existing ? existing.note         : "";
}

// ─── SAVE SET ──────────────────────────────────────────────────────────────
function saveCurrentSet(event) {
  event.preventDefault();
  const item = state.flatSets[state.currentIndex];

  const log = {
    flat_index:  state.currentIndex,
    workout_id:  workoutId(),
    workout_day: state.selectedDay,
    date:        today(),
    exercise:    item.exercise,
    set_no:      item.set_no,
    target_reps: item.target_reps,
    actual_kg:   Number($("actualKg").value),
    actual_reps: Number($("actualReps").value),
    rir:         $("actualRir").value === "" ? "" : Number($("actualRir").value),
    note:        $("actualNote").value.trim(),
    created_at:  new Date().toISOString()
  };

  const oldIndex = state.logs.findIndex(l => l.flat_index === state.currentIndex);
  if (oldIndex >= 0) state.logs[oldIndex] = log;
  else state.logs.push(log);

  state.currentIndex += 1;
  saveLocal();

  if (state.currentIndex >= state.flatSets.length) finishWorkout();
  else loadCurrentSet();
}

$("activeSetForm").addEventListener("submit", saveCurrentSet);

// ─── PREVIOUS SET ──────────────────────────────────────────────────────────
function previousSet() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    saveLocal();
    loadCurrentSet();
  }
}
$("prevSetBtn").addEventListener("click", previousSet);

// ─── CUSTOM EXERCISE ───────────────────────────────────────────────────────
function addCustomExercise() {
  const name = $("customExerciseInput").value.trim();
  if (!name) return;
  state.flatSets.splice(state.currentIndex + 1, 0, {
    workout_day:             state.selectedDay,
    exercise:                name,
    set_no:                  1,
    total_sets_for_exercise: 1,
    target_reps:             ""
  });
  $("customExerciseInput").value = "";
  saveLocal();
  loadCurrentSet();
}
$("addCustomExerciseBtn").addEventListener("click", addCustomExercise);

// ─── EDIT SHEET ────────────────────────────────────────────────────────────
function openEditSheet()  { renderEditList(); $("editSheet").classList.remove("hidden"); }
function closeEditSheet() { $("editSheet").classList.add("hidden"); }
$("openEditBtn").addEventListener("click", openEditSheet);
$("closeEditBtn").addEventListener("click", closeEditSheet);

function renderEditList() {
  const editList = $("editList");
  editList.innerHTML = "";
  if (state.logs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "edit-row";
    empty.innerHTML = `<strong>Henüz kayıt yok</strong><div class="meta">Set kaydı girince burada görünecek.</div>`;
    editList.appendChild(empty);
    return;
  }
  state.logs.slice().sort((a, b) => a.flat_index - b.flat_index).forEach(log => {
    const div = document.createElement("button");
    div.className = "edit-row";
    div.innerHTML = `
      <strong>${log.flat_index + 1}. ${log.exercise} · Set ${log.set_no}</strong>
      <div class="meta">${log.actual_kg} kg × ${log.actual_reps} · RIR ${log.rir !== "" ? log.rir : "-"}<br>${log.note || "Not yok"}</div>
    `;
    div.addEventListener("click", () => openEditModal(log.flat_index));
    editList.appendChild(div);
  });
}

// ─── EDIT MODAL ────────────────────────────────────────────────────────────
function openEditModal(idx) {
  const log = state.logs.find(l => l.flat_index === idx);
  if (!log) return;
  $("editIndex").value    = idx;
  $("editExercise").value = log.exercise;
  $("editKg").value       = log.actual_kg;
  $("editReps").value     = log.actual_reps;
  $("editRir").value      = log.rir;
  $("editNote").value     = log.note;
  $("editModal").classList.remove("hidden");
}
function closeEditModal() { $("editModal").classList.add("hidden"); }
$("cancelEditModalBtn").addEventListener("click", closeEditModal);

$("editForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const idx      = Number($("editIndex").value);
  const logIndex = state.logs.findIndex(l => l.flat_index === idx);
  if (logIndex < 0) return;
  state.logs[logIndex] = {
    ...state.logs[logIndex],
    exercise:    $("editExercise").value.trim(),
    actual_kg:   Number($("editKg").value),
    actual_reps: Number($("editReps").value),
    rir:         $("editRir").value === "" ? "" : Number($("editRir").value),
    note:        $("editNote").value.trim(),
    updated_at:  new Date().toISOString()
  };
  saveLocal(); closeEditModal(); renderEditList(); loadCurrentSet();
});

$("deleteSetBtn").addEventListener("click", () => {
  const idx = Number($("editIndex").value);
  state.logs = state.logs.filter(l => l.flat_index !== idx);
  saveLocal(); closeEditModal(); renderEditList(); loadCurrentSet();
});

// ─── FINISH ────────────────────────────────────────────────────────────────
function finishWorkout() {
  saveToHistory(state.logs);
  saveLastCompletedDay(state.selectedDay);   // ← sıradaki gün için kayıt
  renderSummary();
  showScreen("Summary");
  exportCsv();
  localStorage.removeItem(STORAGE_KEY);
}
$("finishBtn").addEventListener("click", finishWorkout);

// ─── SUMMARY ───────────────────────────────────────────────────────────────
function renderSummary() {
  const rows         = state.logs.slice().sort((a, b) => a.flat_index - b.flat_index);
  const volume       = rows.reduce((sum, r) => sum + r.actual_kg * r.actual_reps, 0);
  const exerciseCount = new Set(rows.map(r => r.exercise)).size;
  const notes        = rows.filter(r => r.note).length;

  $("summaryTitle").textContent     = workouts[state.selectedDay].label + " Tamamlandı";
  $("summaryFileName").textContent  = workoutFileName();
  $("summarySets").textContent      = rows.length;
  $("summaryVolume").textContent    = `${volume.toLocaleString("tr-TR")} kg`;
  $("summaryExercises").textContent = exerciseCount;
  $("summaryNotes").textContent     = notes;
  $("csvPreview").textContent       = toCsv(rows);

  // Show next day hint on summary screen
  const next   = getNextDayType();
  const labels = { Day_A: "Gün A", Day_B: "Gün B", Day_C: "Gün C" };
  $("summaryNextDay").textContent = `Sıradaki antrenman: ${labels[next]}`;
}

// ─── CSV ───────────────────────────────────────────────────────────────────
function toCsv(rows) {
  const headers = ["workout_id","workout_day","date","exercise","set_no","target_reps","actual_kg","actual_reps","rir","note","created_at","updated_at"];
  const escape  = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map(row => headers.map(h => escape(row[h])).join(","))].join("\n");
}

function exportCsv() {
  const rows = state.logs.slice().sort((a, b) => a.flat_index - b.flat_index);
  if (!rows.length) return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = workoutFileName(); a.click();
  URL.revokeObjectURL(url);
}
$("downloadBtn").addEventListener("click", exportCsv);

// ─── NEW WORKOUT ───────────────────────────────────────────────────────────
function newWorkout() {
  state.flatSets = []; state.logs = []; state.currentIndex = 0; state.startedAt = null;
  clearInterval(state.timerInterval); state.timerInterval = null;
  $("timer").textContent = "00:00";
  localStorage.removeItem(STORAGE_KEY);
  applyNextDaySuggestion();
  showResumeIfAny();
  showScreen("Setup");
}
$("newWorkoutBtn").addEventListener("click", newWorkout);

// ─── LOCAL PERSIST ─────────────────────────────────────────────────────────
function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selectedDay:  state.selectedDay,
    flatSets:     state.flatSets,
    currentIndex: state.currentIndex,
    logs:         state.logs,
    startedAt:    state.startedAt
  }));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data         = JSON.parse(raw);
    state.selectedDay  = data.selectedDay  || "Day_A_Salon";
    state.flatSets     = data.flatSets     || [];
    state.currentIndex = data.currentIndex || 0;
    state.logs         = data.logs         || [];
    state.startedAt    = data.startedAt    || null;
    selectWorkout(state.selectedDay);
    return state.flatSets.length > 0;
  } catch { return false; }
}

function showResumeIfAny() {
  $("resumeBtn").classList.toggle("hidden", !loadLocal());
}

$("resumeBtn").addEventListener("click", () => { loadLocal(); startWorkout(true); });

// ─── INIT ──────────────────────────────────────────────────────────────────
applyNextDaySuggestion();
showResumeIfAny();
