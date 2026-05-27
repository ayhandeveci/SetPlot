
const SESSION = {
  openaiKey: "",
  googleClientId: "",
  driveFolderId: "",
  googleEmail: "",
  accessToken: ""
};

function saveSession() {
  sessionStorage.setItem(
    "setplot_session",
    JSON.stringify(SESSION)
  );
}

function loadSession() {
  const raw = sessionStorage.getItem("setplot_session");

  if (!raw) return;

  const data = JSON.parse(raw);

  Object.assign(SESSION, data);

  document.getElementById("openaiKey").value =
    SESSION.openaiKey || "";

  document.getElementById("googleClientId").value =
    SESSION.googleClientId || "";

  document.getElementById("driveFolderId").value =
    SESSION.driveFolderId || "";

  document.getElementById("googleEmail").value =
    SESSION.googleEmail || "";

  updateStatus("Previous session restored.");
}

function updateStatus(message) {
  document.getElementById("status").textContent = message;
}

document.getElementById("unlockBtn").onclick = () => {

  SESSION.openaiKey =
    document.getElementById("openaiKey").value.trim();

  SESSION.googleClientId =
    document.getElementById("googleClientId").value.trim();

  SESSION.driveFolderId =
    document.getElementById("driveFolderId").value.trim();

  SESSION.googleEmail =
    document.getElementById("googleEmail").value.trim();

  saveSession();

  updateStatus("Session unlocked.");
};

let tokenClient;

document.getElementById("connectBtn").onclick = async () => {

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: SESSION.googleClientId,

    scope:
      "https://www.googleapis.com/auth/drive.file",

    callback: async (tokenResponse) => {

      SESSION.accessToken =
        tokenResponse.access_token;

      saveSession();

      updateStatus(
        "Google Drive connected successfully."
      );
    }
  });

  tokenClient.requestAccessToken();
};

document.querySelectorAll(".workout-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".workout-btn")
      .forEach(x => x.classList.remove("selected"));

    btn.classList.add("selected");
  };
});

document.getElementById("loadLogsBtn").onclick = async () => {

  const workout =
    document.querySelector(".workout-btn.selected")
      .dataset.day;

  document.getElementById("recommendationBox")
    .textContent = `
Workout: ${workout}

Last 3 average:
- 60 kg
- 8.3 reps
- RIR 1.3

Charge:
+2.5 kg

Recommended:
62.5 kg
`;
};

document.getElementById("uploadTestBtn").onclick = async () => {

  if (!SESSION.accessToken) {
    updateStatus("Drive connection required.");
    return;
  }

  const csvContent =
`exercise,kg,reps
Chest Press,62.5,8`;

  const metadata = {
    name: "SetPlot_Test_Log.csv",
    mimeType: "text/csv",
    parents: [SESSION.driveFolderId]
  };

  const form = new FormData();

  form.append(
    "metadata",
    new Blob(
      [JSON.stringify(metadata)],
      { type: "application/json" }
    )
  );

  form.append(
    "file",
    new Blob(
      [csvContent],
      { type: "text/csv" }
    )
  );

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: new Headers({
        Authorization: "Bearer " + SESSION.accessToken
      }),
      body: form
    }
  );

  if (response.ok) {
    updateStatus("CSV uploaded successfully.");
  } else {
    updateStatus("CSV upload failed.");
  }
};

loadSession();
