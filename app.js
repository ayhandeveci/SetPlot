const workouts = {
  Day_A: [
    { exercise: "Chest Press Machine", sets: 3, reps: 8 },
    { exercise: "Shoulder Press DB", sets: 3, reps: 8 },
    { exercise: "Triceps Pushdown", sets: 2, reps: 10 }
  ],
  Day_B: [
    { exercise: "Seated Row Machine", sets: 3, reps: 8 },
    { exercise: "Lat Pulldown", sets: 3, reps: 8 },
    { exercise: "RDL", sets: 2, reps: 8 },
    { exercise: "Biceps Curl DB", sets: 2, reps: 10 }
  ],
  Day_C: [
    { exercise: "Leg Press", sets: 3, reps: 8 },
    { exercise: "Leg Curl", sets: 3, reps: 10 },
    { exercise: "Calf Raise", sets: 2, reps: 12 }
  ]
};

const STORAGE_KEY = "setplot_current_workout_v_final";

const state = {
  selectedDay: "Day_B",
  flatSets: [],
  currentIndex: 0,
  logs: [],
  startedAt: null,
  timerInterval: null
};

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(`screen${name}`).classList.add("active");
}

function selectWorkout(day) {
  state.selectedDay = day;
  document.querySelectorAll(".workout-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.day === day);
  });
}

document.querySelectorAll(".workout-option").forEach(btn => {
  btn.addEventListener("click", () => selectWorkout(btn.dataset.day));
});

function buildWorkout(day) {
  const flat = [];

  workouts[day].forEach(item => {
    for (let i = 1; i <= item.sets; i++) {
      flat.push({
        workout_day: day,
        exercise: item.exercise,
        set_no: i,
        total_sets_for_exercise: item.sets,
        target_reps: item.reps
      });
    }
  });

  return flat;
}

function startWorkout(resume = false) {
  if (!resume) {
    state.flatSets = buildWorkout(state.selectedDay);
    state.logs = [];
    state.currentIndex = 0;
    state.startedAt = new Date().toISOString();
  }

  startTimer();
  loadCurrentSet();
  saveLocal();
  showScreen("Active");
}

$("startWorkoutBtn").addEventListener("click", () => startWorkout(false));

function startTimer() {
  if (state.timerInterval) return;

  const start = state.startedAt ? new Date(state.startedAt) : new Date();
  state.startedAt = start.toISOString();

  state.timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - start) / 1000);
    const min = String(Math.floor(diff / 60)).padStart(2, "0");
    const sec = String(diff % 60).padStart(2, "0");
    $("timer").textContent = `${min}:${sec}`;
  }, 1000);
}

function loadCurrentSet() {
  const item = state.flatSets[state.currentIndex];

  if (!item) {
    finishWorkout();
    return;
  }

  const existing = state.logs.find(l => l.flat_index === state.currentIndex);

  $("activeDay").textContent = state.selectedDay.replace("_", " ");
  $("activeProgress").textContent = `Set ${state.currentIndex + 1} / ${state.flatSets.length}`;
  $("currentExercise").textContent = item.exercise;
  $("targetSet").textContent = `${item.set_no}/${item.total_sets_for_exercise}`;
  $("targetReps").textContent = item.target_reps;
  $("loggedCount").textContent = state.logs.length;

  $("actualKg").value = existing ? existing.actual_kg : "";
  $("actualReps").value = existing ? existing.actual_reps : item.target_reps;
  $("actualRir").value = existing ? existing.rir : "";
  $("actualNote").value = existing ? existing.note : "";
}

function saveCurrentSet(event) {
  event.preventDefault();

  const item = state.flatSets[state.currentIndex];

  const log = {
    flat_index: state.currentIndex,
    workout_id: workoutId(),
    workout_day: state.selectedDay,
    date: today(),
    exercise: item.exercise,
    set_no: item.set_no,
    target_reps: item.target_reps,
    actual_kg: Number($("actualKg").value),
    actual_reps: Number($("actualReps").value),
    rir: $("actualRir").value === "" ? "" : Number($("actualRir").value),
    note: $("actualNote").value.trim(),
    created_at: new Date().toISOString()
  };

  const oldIndex = state.logs.findIndex(l => l.flat_index === state.currentIndex);

  if (oldIndex >= 0) state.logs[oldIndex] = log;
  else state.logs.push(log);

  state.currentIndex += 1;
  saveLocal();

  if (state.currentIndex >= state.flatSets.length) {
    finishWorkout();
  } else {
    loadCurrentSet();
  }
}

$("activeSetForm").addEventListener("submit", saveCurrentSet);

function previousSet() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    saveLocal();
    loadCurrentSet();
  }
}

$("prevSetBtn").addEventListener("click", previousSet);

function addCustomExercise() {
  const name = $("customExerciseInput").value.trim();
  if (!name) return;

  state.flatSets.splice(state.currentIndex + 1, 0, {
    workout_day: state.selectedDay,
    exercise: name,
    set_no: 1,
    total_sets_for_exercise: 1,
    target_reps: ""
  });

  $("customExerciseInput").value = "";
  saveLocal();
  loadCurrentSet();
}

$("addCustomExerciseBtn").addEventListener("click", addCustomExercise);

function openEditSheet() {
  renderEditList();
  $("editSheet").classList.remove("hidden");
}

function closeEditSheet() {
  $("editSheet").classList.add("hidden");
}

$("openEditBtn").addEventListener("click", openEditSheet);
$("closeEditBtn").addEventListener("click", closeEditSheet);

function renderEditList() {
  const editList = $("editList");
  editList.innerHTML = "";

  if (state.logs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "edit-row";
    empty.innerHTML = `<strong>No logged sets yet</strong><div class="meta">Set kaydı girince burada görünecek.</div>`;
    editList.appendChild(empty);
    return;
  }

  state.logs
    .slice()
    .sort((a, b) => a.flat_index - b.flat_index)
    .forEach((log) => {
      const div = document.createElement("button");
      div.className = "edit-row";
      div.innerHTML = `
        <strong>${log.flat_index + 1}. ${log.exercise} · Set ${log.set_no}</strong>
        <div class="meta">${log.actual_kg} kg x ${log.actual_reps} · RIR ${log.rir || "-"}<br>${log.note || "Not yok"}</div>
      `;
      div.addEventListener("click", () => openEditModal(log.flat_index));
      editList.appendChild(div);
    });
}

function openEditModal(idx) {
  const log = state.logs.find(l => l.flat_index === idx);
  if (!log) return;

  $("editIndex").value = idx;
  $("editExercise").value = log.exercise;
  $("editKg").value = log.actual_kg;
  $("editReps").value = log.actual_reps;
  $("editRir").value = log.rir;
  $("editNote").value = log.note;
  $("editModal").classList.remove("hidden");
}

function closeEditModal() {
  $("editModal").classList.add("hidden");
}

$("cancelEditModalBtn").addEventListener("click", closeEditModal);

$("editForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const idx = Number($("editIndex").value);
  const logIndex = state.logs.findIndex(l => l.flat_index === idx);

  if (logIndex < 0) return;

  state.logs[logIndex] = {
    ...state.logs[logIndex],
    exercise: $("editExercise").value.trim(),
    actual_kg: Number($("editKg").value),
    actual_reps: Number($("editReps").value),
    rir: $("editRir").value === "" ? "" : Number($("editRir").value),
    note: $("editNote").value.trim(),
    updated_at: new Date().toISOString()
  };

  saveLocal();
  closeEditModal();
  renderEditList();
  loadCurrentSet();
});

$("deleteSetBtn").addEventListener("click", () => {
  const idx = Number($("editIndex").value);
  state.logs = state.logs.filter(l => l.flat_index !== idx);
  saveLocal();
  closeEditModal();
  renderEditList();
  loadCurrentSet();
});

function finishWorkout() {
  renderSummary();
  showScreen("Summary");
  exportCsv();
  localStorage.removeItem(STORAGE_KEY);
}

$("finishBtn").addEventListener("click", finishWorkout);

function renderSummary() {
  const rows = state.logs.slice().sort((a, b) => a.flat_index - b.flat_index);
  const volume = rows.reduce((sum, r) => sum + r.actual_kg * r.actual_reps, 0);
  const exerciseCount = new Set(rows.map(r => r.exercise)).size;
  const notes = rows.filter(r => r.note).length;

  $("summaryTitle").textContent = `${state.selectedDay.replace("_", " ")} Summary`;
  $("summaryFileName").textContent = workoutFileName();
  $("summarySets").textContent = rows.length;
  $("summaryVolume").textContent = `${volume.toLocaleString("tr-TR")} kg`;
  $("summaryExercises").textContent = exerciseCount;
  $("summaryNotes").textContent = notes;
  $("csvPreview").textContent = toCsv(rows);
}

function toCsv(rows) {
  const headers = [
    "workout_id",
    "workout_day",
    "date",
    "exercise",
    "set_no",
    "target_reps",
    "actual_kg",
    "actual_reps",
    "rir",
    "note",
    "created_at",
    "updated_at"
  ];

  const escape = (value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(","))
  ].join("\n");
}

function exportCsv() {
  const rows = state.logs.slice().sort((a, b) => a.flat_index - b.flat_index);
  if (!rows.length) return;

  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = workoutFileName();
  a.click();

  URL.revokeObjectURL(url);
}

$("downloadBtn").addEventListener("click", exportCsv);

function newWorkout() {
  state.flatSets = [];
  state.logs = [];
  state.currentIndex = 0;
  state.startedAt = null;

  clearInterval(state.timerInterval);
  state.timerInterval = null;
  $("timer").textContent = "00:00";

  localStorage.removeItem(STORAGE_KEY);
  showResumeIfAny();
  showScreen("Setup");
}

$("newWorkoutBtn").addEventListener("click", newWorkout);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function workoutId() {
  return `${state.selectedDay}_${today()}`;
}

function workoutFileName() {
  return `${state.selectedDay}_${today()}_log.csv`;
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selectedDay: state.selectedDay,
    flatSets: state.flatSets,
    currentIndex: state.currentIndex,
    logs: state.logs,
    startedAt: state.startedAt
  }));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    state.selectedDay = data.selectedDay || "Day_B";
    state.flatSets = data.flatSets || [];
    state.currentIndex = data.currentIndex || 0;
    state.logs = data.logs || [];
    state.startedAt = data.startedAt || null;
    selectWorkout(state.selectedDay);
    return state.flatSets.length > 0;
  } catch {
    return false;
  }
}

function showResumeIfAny() {
  $("resumeBtn").classList.toggle("hidden", !loadLocal());
}

$("resumeBtn").addEventListener("click", () => {
  loadLocal();
  startWorkout(true);
});

showResumeIfAny();
