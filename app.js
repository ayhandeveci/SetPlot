const state = {
  startedAt: null,
  timerInterval: null,
  sets: [],
  mockPreviousWorkouts: []
};

const $ = (id) => document.getElementById(id);

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

function loadMockPreviousWorkouts() {
  state.mockPreviousWorkouts = [
    { exercise: "Chest Press Machine", weight_kg: 75, reps: 9, rir: 1 },
    { exercise: "Seated Row Machine", weight_kg: 60, reps: 8, rir: 2 },
    { exercise: "RDL", weight_kg: 20, reps: 8, rir: 1 },
    { exercise: "Shoulder Press DB", weight_kg: 16, reps: 8, rir: 1 }
  ];

  renderPlan();
}

function suggestFromHistory(row) {
  let suggestionWeight = row.weight_kg;
  let suggestionReps = row.reps;
  let reason = "Aynı seviyeyi kontrollü tekrar et.";

  if (row.rir >= 3) {
    suggestionWeight = row.weight_kg + 2.5;
    reason = "RIR yüksek; küçük ağırlık artışı denenebilir.";
  } else if (row.rir >= 1 && row.rir <= 2) {
    suggestionReps = row.reps + 1;
    reason = "RIR ideal; aynı kg ile +1 tekrar hedefle.";
  } else if (row.rir === 0) {
    reason = "Limitte bitmiş; aynı kg ile formu koru.";
  }

  return {
    exercise: row.exercise,
    suggestionWeight,
    suggestionReps,
    targetRir: 1,
    reason
  };
}

function renderPlan() {
  const planList = $("planList");
  planList.innerHTML = "";

  const suggestions = state.mockPreviousWorkouts.map(suggestFromHistory);

  suggestions.forEach((item) => {
    const div = document.createElement("div");
    div.className = "plan-item";
    div.innerHTML = `
      <strong>${item.exercise}</strong>
      <div class="plan-meta">
        Öneri: ${item.suggestionWeight} kg x ${item.suggestionReps} tekrar · RIR ${item.targetRir}<br />
        ${item.reason}
      </div>
    `;
    div.addEventListener("click", () => {
      $("exerciseInput").value = item.exercise;
      $("weightInput").value = item.suggestionWeight;
      $("repsInput").value = item.suggestionReps;
      $("rirInput").value = item.targetRir;
    });
    planList.appendChild(div);
  });

  $("planStatus").textContent = `${suggestions.length} öneri`;
}

function addSet(event) {
  event.preventDefault();

  const set = {
    workout_id: getWorkoutId(),
    date: new Date().toISOString(),
    exercise: $("exerciseInput").value.trim(),
    set_no: getNextSetNo($("exerciseInput").value.trim()),
    weight_kg: Number($("weightInput").value),
    reps: Number($("repsInput").value),
    rir: $("rirInput").value === "" ? "" : Number($("rirInput").value),
    note: $("noteInput").value.trim()
  };

  state.sets.push(set);
  renderTimeline();
  updateSummary();

  $("repsInput").value = "";
  $("rirInput").value = "";
  $("noteInput").value = "";
  $("repsInput").focus();
}

function getWorkoutId() {
  const d = new Date();
  return `workout_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

function getNextSetNo(exercise) {
  return state.sets.filter(s => s.exercise === exercise).length + 1;
}

function renderTimeline() {
  const timeline = $("timeline");
  timeline.innerHTML = "";

  state.sets.slice().reverse().forEach((set) => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `
      <strong>${set.exercise} · Set ${set.set_no}</strong>
      <div class="timeline-meta">
        ${set.weight_kg} kg x ${set.reps} tekrar · RIR ${set.rir || "-"}<br />
        ${set.note || "Not yok"}
      </div>
    `;
    timeline.appendChild(div);
  });

  $("setCount").textContent = `${state.sets.length} set`;
}

function updateSummary() {
  $("totalSets").textContent = state.sets.length;
  const volume = state.sets.reduce((sum, s) => sum + (s.weight_kg * s.reps), 0);
  $("totalVolume").textContent = `${volume.toLocaleString("tr-TR")} kg`;
}

function toCsv(rows) {
  const headers = [
    "workout_id",
    "date",
    "exercise",
    "set_no",
    "weight_kg",
    "reps",
    "rir",
    "note"
  ];

  const escape = (value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(","))
  ];

  return lines.join("\n");
}

function downloadCsv() {
  if (state.sets.length === 0) return;

  const csv = toCsv(state.sets);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${getWorkoutId()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

$("startWorkoutBtn").addEventListener("click", startTimer);
$("loadMockBtn").addEventListener("click", loadMockPreviousWorkouts);
$("setForm").addEventListener("submit", addSet);
$("downloadCsvBtn").addEventListener("click", downloadCsv);
