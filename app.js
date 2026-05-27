const DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";

const SESSION_KEY = "setplot_v10_session";

const session = {
  clientId: "",
  folderId: "",
  mail: "",
  accessToken: ""
};

const chargeRules = {
  default: {
    charge_kg: 0,
    round_to_kg: 2.5,
    min_avg_reps_for_charge_buffer: 1,
    min_avg_rir_for_charge: 1,
    pain_blocks_charge: true,
    failed_target_blocks_charge: true
  },
  exercise_rules: {
    "Chest Press Machine": { charge_kg: 2.5, round_to_kg: 2.5 },
    "Seated Row Machine": { charge_kg: 2.5, round_to_kg: 2.5 },
    "Lat Pulldown": { charge_kg: 2.5, round_to_kg: 2.5 },
    "RDL": { charge_kg: 0, round_to_kg: 2.5 },
    "Leg Press": { charge_kg: 0, round_to_kg: 5 },
    "Leg Curl": { charge_kg: 2.5, round_to_kg: 2.5 },
    "Shoulder Press DB": { charge_kg: 1, round_to_kg: 1 },
    "Biceps Curl DB": { charge_kg: 1, round_to_kg: 1 }
  }
};

const basePrograms = {
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

const state = {
  selectedDay: "Day_B",
  plan: [],
  flatSets: [],
  currentIndex: 0,
  logs: [],
  historicalRows: [],
  startedAt: null,
  timerInterval: null,
  currentDriveFileId: null
};

const $ = (id) => document.getElementById(id);

function setSessionStatus(text, type = "muted") {
  $("sessionStatus").className = `status-box ${type}`;
  $("sessionStatus").textContent = text;
}

function setDriveStatus(text, type = "muted") {
  $("driveStatus").className = type;
  $("driveStatus").textContent = text;
}

function setAutosaveStatus(text, type = "muted") {
  $("autosaveStatus").className = `status-box ${type}`;
  $("autosaveStatus").textContent = text;
}

function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSessionInputs() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    Object.assign(session, JSON.parse(raw));
    $("clientIdInput").value = session.clientId || "";
    $("folderIdInput").value = session.folderId || "";
    $("mailInput").value = session.mail || "";
  } catch {}
}

function openApp() {
  $("sessionGate").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("driveFolderLabel").textContent = `Folder: ${session.folderId.slice(0, 8)}...`;
  loadDriveLogs();
}

async function connectDrive() {
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: session.clientId,
      scope: DRIVE_SCOPE,
      hint: session.mail,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error));
          return;
        }

        session.accessToken = tokenResponse.access_token;
        saveSession();
        resolve();
      }
    });

    tokenClient.requestAccessToken();
  });
}

$("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  session.clientId = $("clientIdInput").value.trim();
  session.folderId = $("folderIdInput").value.trim();
  session.mail = $("mailInput").value.trim();

  saveSession();
  setSessionStatus("Connecting Google Drive...", "muted");

  try {
    await connectDrive();
    setSessionStatus("Drive connected. Opening app...", "success");
    openApp();
  } catch (err) {
    setSessionStatus(`Drive connection failed: ${err.message}`, "error");
  }
});

async function driveFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  return response;
}

async function listCsvFiles() {
  const q = `'${session.folderId}' in parents and mimeType='text/csv' and trashed=false`;
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    `?q=${encodeURIComponent(q)}` +
    "&fields=files(id,name,modifiedTime)";

  const res = await driveFetch(url);
  const data = await res.json();

  return (data.files || []).sort((a, b) => a.name.localeCompare(b.name));
}

async function downloadFileText(fileId) {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  return await res.text();
}

async function loadDriveLogs() {
  if (!session.accessToken) return;

  setDriveStatus("Reading CSV logs from Drive...", "muted");

  try {
    const files = await listCsvFiles();
    const rows = [];

    for (const file of files) {
      const text = await downloadFileText(file.id);
      rows.push(...parseCsv(text));
    }

    state.historicalRows = rows;

    setDriveStatus(`${files.length} CSV file loaded · ${rows.length} rows`, "success");
  } catch (err) {
    setDriveStatus("Drive log read failed. Check scope/folder access.", "error");
  }
}

$("reloadLogsBtn").addEventListener("click", loadDriveLogs);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).filter(Boolean).map(line => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });

    row.set_no = Number(row.set_no);
    row.target_reps = Number(row.target_reps);
    row.recommended_kg = Number(row.recommended_kg);
    row.actual_kg = Number(row.actual_kg);
    row.actual_reps = Number(row.actual_reps);
    row.rir = row.rir === "" ? "" : Number(row.rir);

    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

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

$("backToSetupBtn").addEventListener("click", () => showScreen("Setup"));

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function getExerciseRule(exercise) {
  return {
    ...chargeRules.default,
    ...(chargeRules.exercise_rules[exercise] || {})
  };
}

function getHistoryRows(day, exercise, setNo, limit = 4) {
  const rows = state.historicalRows
    .filter(r =>
      r.workout_day === day &&
      r.exercise === exercise &&
      Number(r.set_no) === Number(setNo)
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const seen = new Set();
  const unique = [];

  for (const row of rows) {
    if (!seen.has(row.date)) {
      unique.push(row);
      seen.add(row.date);
    }
  }

  return unique.slice(0, limit);
}

function calculateRecommendation(day, exercise, setNo, targetReps) {
  const history4 = getHistoryRows(day, exercise, setNo, 4);
  const last3 = history4.slice(0, 3);
  const rule = getExerciseRule(exercise);

  if (last3.length === 0) {
    return {
      recommended_kg: 0,
      reason: "Geçmiş veri yok; manuel kg gir.",
      history4
    };
  }

  const avgKg = last3.reduce((s, r) => s + Number(r.actual_kg), 0) / last3.length;
  const avgReps = last3.reduce((s, r) => s + Number(r.actual_reps), 0) / last3.length;
  const rirRows = last3.filter(r => r.rir !== "" && !Number.isNaN(Number(r.rir)));
  const avgRir = rirRows.length ? rirRows.reduce((s, r) => s + Number(r.rir), 0) / rirRows.length : null;
  const hasPain = last3.some(r => String(r.note || "").trim().length > 0);
  const failedTarget = avgReps < targetReps;

  let charge = 0;
  let decision = "charge yok; ortalama kg korunur.";

  const canCharge =
    (!rule.pain_blocks_charge || !hasPain) &&
    (!rule.failed_target_blocks_charge || !failedTarget) &&
    avgReps >= targetReps + rule.min_avg_reps_for_charge_buffer &&
    (avgRir === null || avgRir >= rule.min_avg_rir_for_charge);

  if (setNo === 1 && canCharge) {
    charge = Number(rule.charge_kg || 0);
    decision = `ilk set: son 3 ortalama + ${charge} kg charge.`;
  } else if (hasPain) {
    decision = "not/ağrı bulundu; charge bloke edildi.";
  } else if (failedTarget) {
    decision = "hedef tekrar ortalaması yakalanmamış; charge bloke edildi.";
  } else if (setNo !== 1) {
    decision = "ilk set değil; charge uygulanmadı.";
  }

  const recommended = roundTo(avgKg + charge, Number(rule.round_to_kg || 2.5));

  return {
    recommended_kg: recommended,
    reason: `Son 3 avg: ${avgKg.toFixed(1)} kg, ${avgReps.toFixed(1)} reps${avgRir === null ? "" : `, RIR ${avgRir.toFixed(1)}`}. ${decision}`,
    history4
  };
}

function prepareWorkout() {
  state.plan = basePrograms[state.selectedDay].map(item => {
    const firstSetRec = calculateRecommendation(state.selectedDay, item.exercise, 1, item.reps);

    return {
      ...item,
      kg: firstSetRec.recommended_kg,
      reason: firstSetRec.reason,
      history4: firstSetRec.history4
    };
  });

  state.flatSets = [];
  state.logs = [];
  state.currentIndex = 0;
  state.currentDriveFileId = null;

  state.plan.forEach(item => {
    for (let i = 1; i <= item.sets; i++) {
      const rec = calculateRecommendation(state.selectedDay, item.exercise, i, item.reps);

      state.flatSets.push({
        workout_day: state.selectedDay,
        exercise: item.exercise,
        set_no: i,
        total_sets_for_exercise: item.sets,
        target_reps: item.reps,
        recommended_kg: rec.recommended_kg || item.kg,
        reason: rec.reason,
        history4: rec.history4
      });
    }
  });

  $("prepareDayPill").textContent = state.selectedDay.replace("_", " ");
  $("totalSetsPill").textContent = `${state.flatSets.length} set`;
  renderRecommendations();
  showScreen("Prepare");
}

$("prepareBtn").addEventListener("click", prepareWorkout);

function renderRecommendations() {
  const list = $("recommendationList");
  list.innerHTML = "";

  state.plan.forEach(item => {
    const h = item.history4 || [];
    const histText = h.length
      ? h.map(r => `${r.date}: ${r.actual_kg}kg x ${r.actual_reps}`).join(" · ")
      : "Geçmiş veri yok";

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <strong>${item.exercise}</strong>
      <div class="meta">${item.sets} set x ${item.reps} tekrar · Öneri: ${item.kg} kg<br>${item.reason}<br><br>Son 4: ${histText}</div>
    `;
    list.appendChild(div);
  });
}

function startWorkout() {
  startTimer();
  loadCurrentSet();
  showScreen("Active");
}

$("startWorkoutBtn").addEventListener("click", startWorkout);

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

async function saveCurrentSet(event) {
  event.preventDefault();

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

  await autosaveWorkout();

  state.currentIndex += 1;

  if (state.currentIndex >= state.flatSets.length) {
    finishWorkout();
  } else {
    loadCurrentSet();
  }
}

$("activeSetForm").addEventListener("submit", saveCurrentSet);

async function autosaveWorkout() {
  const rows = state.logs.slice().sort((a, b) => a.flat_index - b.flat_index);
  const csv = toCsv(rows);
  const fileName = workoutFileName();

  setAutosaveStatus("Saving to Drive...", "muted");

  try {
    const existing = state.currentDriveFileId
      ? { id: state.currentDriveFileId }
      : await findExistingWorkoutFile(fileName);

    if (!existing) {
      const created = await createDriveCsv(fileName, csv);
      state.currentDriveFileId = created.id;
    } else {
      state.currentDriveFileId = existing.id;
      await updateDriveCsv(existing.id, csv);
    }

    setAutosaveStatus(`Autosaved: ${fileName}`, "success");
  } catch (err) {
    setAutosaveStatus("Autosave failed. Use Download CSV Backup.", "error");
  }
}

async function findExistingWorkoutFile(fileName) {
  const q = `name='${fileName.replaceAll("'", "\\'")}' and '${session.folderId}' in parents and trashed=false`;
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    `?q=${encodeURIComponent(q)}` +
    "&fields=files(id,name)";

  const res = await driveFetch(url);
  const data = await res.json();

  return data.files && data.files.length ? data.files[0] : null;
}

async function createDriveCsv(fileName, csvContent) {
  const metadata = {
    name: fileName,
    mimeType: "text/csv",
    parents: [session.folderId]
  };

  const form = new FormData();

  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([csvContent], { type: "text/csv" }));

  const res = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {
      method: "POST",
      body: form
    }
  );

  return await res.json();
}

async function updateDriveCsv(fileId, csvContent) {
  await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "text/csv"
      },
      body: csvContent
    }
  );
}

function previousSet() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    loadCurrentSet();
  }
}

$("prevSetBtn").addEventListener("click", previousSet);

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

  state.flatSets.forEach((item, idx) => {
    const log = state.logs.find(l => l.flat_index === idx);
    const div = document.createElement("button");
    div.className = "edit-row";
    div.innerHTML = `
      <strong>${idx + 1}. ${item.exercise} · Set ${item.set_no}</strong>
      <div class="meta">${log ? `${log.actual_kg} kg x ${log.actual_reps} · RIR ${log.rir || "-"}` : "Henüz girilmedi"}</div>
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

$("cancelEditModalBtn").addEventListener("click", closeEditModal);

$("editForm").addEventListener("submit", async (e) => {
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
  closeEditSheet();
  loadCurrentSet();
  await autosaveWorkout();
});

function finishWorkout() {
  renderSummary();
  showScreen("Summary");
}

$("finishBtn").addEventListener("click", finishWorkout);

function renderSummary() {
  const rows = state.logs.slice().sort((a, b) => a.flat_index - b.flat_index);
  const volume = rows.reduce((sum, r) => sum + r.actual_kg * r.actual_reps, 0);
  const missed = rows.filter(r => r.actual_reps < r.target_reps).length;
  const notes = rows.filter(r => r.note).length;

  $("summaryTitle").textContent = `${state.selectedDay.replace("_", " ")} Summary`;
  $("summaryFileName").textContent = workoutFileName();
  $("summarySets").textContent = rows.length;
  $("summaryVolume").textContent = `${volume.toLocaleString("tr-TR")} kg`;
  $("summaryMissed").textContent = missed;
  $("summaryNotes").textContent = notes;
  $("csvPreview").textContent = toCsv(rows);
}

function toCsv(rows) {
  const headers = [
    "workout_day",
    "date",
    "exercise",
    "set_no",
    "target_reps",
    "recommended_kg",
    "actual_kg",
    "actual_reps",
    "rir",
    "note",
    "created_at"
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

function downloadCsv() {
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

$("downloadBtn").addEventListener("click", downloadCsv);

function newWorkout() {
  state.currentIndex = 0;
  state.logs = [];
  state.currentDriveFileId = null;
  showScreen("Setup");
}

$("newWorkoutBtn").addEventListener("click", newWorkout);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function workoutFileName() {
  return `${state.selectedDay}_${today()}_log.csv`;
}

loadSessionInputs();
