const workouts = {
  Day_A: [
    { exercise: "Chest Press Machine", sets: 3, reps: 8, kg: 75, reason: "Son kayıtta 75 kg x 9 RIR 1; aynı kg ile net 8 tekrar." },
    { exercise: "Shoulder Press DB", sets: 3, reps: 8, kg: 16, reason: "Son sette zorlanma vardı; 16 kg ile kalite korunmalı." },
    { exercise: "Triceps Pushdown", sets: 2, reps: 10, kg: 35, reason: "Accessory hareket; kontrollü artış yok." }
  ],
  Day_B: [
    { exercise: "Seated Row Machine", sets: 3, reps: 8, kg: 60, reason: "60 kg x 8 RIR 2; form bozulmadan aynı kg." },
    { exercise: "Lat Pulldown", sets: 3, reps: 8, kg: 55, reason: "Benzer çekiş hacmine göre güvenli başlangıç." },
    { exercise: "RDL", sets: 2, reps: 8, kg: 20, reason: "Bel/hamstring kontrolü için düşük ve temiz yük." },
    { exercise: "Biceps Curl DB", sets: 2, reps: 10, kg: 12.5, reason: "Accessory; form öncelikli." }
  ],
  Day_C: [
    { exercise: "Leg Press", sets: 3, reps: 8, kg: 100, reason: "Diz hassasiyeti nedeniyle agresif artış yok." },
    { exercise: "Leg Curl", sets: 3, reps: 10, kg: 45, reason: "Arka bacak için kontrollü yük." },
    { exercise: "Calf Raise", sets: 2, reps: 12, kg: 50, reason: "Yüksek tekrar daha güvenli." }
  ]
};

const state = {
  selectedDay: "Day_B",
  plan: [],
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

function prepareWorkout() {
  state.plan = workouts[state.selectedDay];
  state.flatSets = [];
  state.logs = [];
  state.currentIndex = 0;

  state.plan.forEach(item => {
    for (let i = 1; i <= item.sets; i++) {
      state.flatSets.push({
        workout_day: state.selectedDay,
        exercise: item.exercise,
        set_no: i,
        total_sets_for_exercise: item.sets,
        target_reps: item.reps,
        recommended_kg: item.kg,
        reason: item.reason
      });
    }
  });

  $("prepareDayPill").textContent = state.selectedDay.replace("_", " ");
  $("totalSetsPill").textContent = `${state.flatSets.length} set`;
  renderRecommendations();
  showScreen("Prepare");
}

function renderRecommendations() {
  const list = $("recommendationList");
  list.innerHTML = "";

  state.plan.forEach(item => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <strong>${item.exercise}</strong>
      <div class="meta">${item.sets} set x ${item.reps} tekrar · Öneri: ${item.kg} kg<br>${item.reason}</div>
    `;
    list.appendChild(div);
  });
}

function startWorkout() {
  startTimer();
  loadCurrentSet();
  showScreen("Active");
}

function startTimer() {
  if (state.timerInterval) return;
  state.startedAt = new Date();
  state.timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - state.startedAt) / 1000);
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
  $("targetKg").textContent = `${item.recommended_kg} kg`;
  $("targetReps").textContent = item.target_reps;
  $("targetSet").textContent = `${item.set_no}/${item.total_sets_for_exercise}`;
  $("recommendationReason").textContent = item.reason;

  $("actualKg").value = existing ? existing.actual_kg : item.recommended_kg;
  $("actualReps").value = existing ? existing.actual_reps : item.target_reps;
  $("actualRir").value = existing ? existing.rir : "";
  $("actualNote").value = existing ? existing.note : "";
}

function saveCurrentSet(e) {
  e.preventDefault();
  const item = state.flatSets[state.currentIndex];

  const log = {
    flat_index: state.currentIndex,
    workout_day: state.selectedDay,
    date: today(),
    exercise: item.exercise,
    set_no: item.set_no,
    target_reps: item.target_reps,
    recommended_kg: item.recommended_kg,
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

  if (state.currentIndex >= state.flatSets.length) {
    finishWorkout();
  } else {
    loadCurrentSet();
  }
}

function previousSet() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    loadCurrentSet();
  }
}

function openEditSheet() {
  renderEditList();
  $("editSheet").classList.remove("hidden");
}

function closeEditSheet() {
  $("editSheet").classList.add("hidden");
}

function renderEditList() {
  const editList = $("editList");
  editList.innerHTML = "";

  state.flatSets.forEach((item, idx) => {
    const log = state.logs.find(l => l.flat_index === idx);
    const div = document.createElement("button");
    div.className = "edit-row";
    div.innerHTML = `
      <strong>${idx + 1}. ${item.exercise} · Set ${item.set_no}</strong>
      <div class="meta">${log ? `${log.actual_kg} kg x ${log.actual_reps} · RIR ${log.rir || "-"}` : "Henüz girilmedi"} </div>
    `;
    div.addEventListener("click", () => openEditModal(idx));
    editList.appendChild(div);
  });
}

function openEditModal(idx) {
  const item = state.flatSets[idx];
  const log = state.logs.find(l => l.flat_index === idx);

  $("editIndex").value = idx;
  $("editKg").value = log ? log.actual_kg : item.recommended_kg;
  $("editReps").value = log ? log.actual_reps : item.target_reps;
  $("editRir").value = log ? log.rir : "";
  $("editNote").value = log ? log.note : "";
  $("editModal").classList.remove("hidden");
}

function closeEditModal() {
  $("editModal").classList.add("hidden");
}

function saveEditedSet(e) {
  e.preventDefault();
  const idx = Number($("editIndex").value);
  const item = state.flatSets[idx];

  const log = {
    flat_index: idx,
    workout_day: state.selectedDay,
    date: today(),
    exercise: item.exercise,
    set_no: item.set_no,
    target_reps: item.target_reps,
    recommended_kg: item.recommended_kg,
    actual_kg: Number($("editKg").value),
    actual_reps: Number($("editReps").value),
    rir: $("editRir").value === "" ? "" : Number($("editRir").value),
    note: $("editNote").value.trim(),
    created_at: new Date().toISOString()
  };

  const oldIndex = state.logs.findIndex(l => l.flat_index === idx);
  if (oldIndex >= 0) state.logs[oldIndex] = log;
  else state.logs.push(log);

  closeEditModal();
  renderEditList();
  loadCurrentSet();
}

function finishWorkout() {
  renderSummary();
  showScreen("Summary");
}

function renderSummary() {
  const rows = state.logs.slice().sort((a,b) => a.flat_index - b.flat_index);
  const volume = rows.reduce((sum, r) => sum + r.actual_kg * r.actual_reps, 0);
  const missed = rows.filter(r => r.actual_reps < r.target_reps).length;
  const notes = rows.filter(r => r.note).length;

  $("summaryTitle").textContent = `${state.selectedDay.replace("_", " ")} Summary`;
  $("summaryFileName").textContent = fileName();
  $("summarySets").textContent = rows.length;
  $("summaryVolume").textContent = `${volume.toLocaleString("tr-TR")} kg`;
  $("summaryMissed").textContent = missed;
  $("summaryNotes").textContent = notes;
  $("csvPreview").textContent = toCsv(rows);
}

function toCsv(rows) {
  const headers = ["workout_day","date","exercise","set_no","target_reps","recommended_kg","actual_kg","actual_reps","rir","note","created_at"];
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

function downloadCsv() {
  const rows = state.logs.slice().sort((a,b) => a.flat_index - b.flat_index);
  if (!rows.length) return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName();
  a.click();
  URL.revokeObjectURL(url);
}

function newWorkout() {
  state.currentIndex = 0;
  state.logs = [];
  showScreen("Setup");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fileName() {
  return `${state.selectedDay}_${today()}_log.csv`;
}

document.querySelectorAll(".workout-option").forEach(btn => {
  btn.addEventListener("click", () => selectWorkout(btn.dataset.day));
});

document.querySelectorAll("[data-go='setup']").forEach(btn => {
  btn.addEventListener("click", () => showScreen("Setup"));
});

$("prepareBtn").addEventListener("click", prepareWorkout);
$("startWorkoutBtn").addEventListener("click", startWorkout);
$("activeSetForm").addEventListener("submit", saveCurrentSet);
$("prevSetBtn").addEventListener("click", previousSet);
$("openEditBtn").addEventListener("click", openEditSheet);
$("closeEditBtn").addEventListener("click", closeEditSheet);
$("finishBtn").addEventListener("click", finishWorkout);
$("editForm").addEventListener("submit", saveEditedSet);
$("cancelEditModalBtn").addEventListener("click", closeEditModal);
$("downloadBtn").addEventListener("click", downloadCsv);
$("newWorkoutBtn").addEventListener("click", newWorkout);
