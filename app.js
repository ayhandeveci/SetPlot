
const SESSION = {
  clientId: "",
  folderId: "",
  googleMail: "",
  accessToken: ""
};

function saveSession() {
  sessionStorage.setItem(
    "setplot_v7_session",
    JSON.stringify(SESSION)
  );
}

function loadSession() {
  const raw = sessionStorage.getItem(
    "setplot_v7_session"
  );

  if (!raw) return;

  Object.assign(
    SESSION,
    JSON.parse(raw)
  );

  document.getElementById("clientId").value =
    SESSION.clientId || "";

  document.getElementById("folderId").value =
    SESSION.folderId || "";

  document.getElementById("googleMail").value =
    SESSION.googleMail || "";

  updateStatus("Previous session restored.");
}

function updateStatus(text) {
  document.getElementById("statusBox")
    .textContent = text;
}

document.getElementById("saveSessionBtn")
.onclick = () => {

  SESSION.clientId =
    document.getElementById("clientId")
      .value.trim();

  SESSION.folderId =
    document.getElementById("folderId")
      .value.trim();

  SESSION.googleMail =
    document.getElementById("googleMail")
      .value.trim();

  saveSession();

  updateStatus("Session saved.");
};

let tokenClient;

document.getElementById("connectBtn")
.onclick = async () => {

  tokenClient =
    google.accounts.oauth2.initTokenClient({

      client_id: SESSION.clientId,

      scope:
        "https://www.googleapis.com/auth/drive.file",

      callback: async (tokenResponse) => {

        SESSION.accessToken =
          tokenResponse.access_token;

        saveSession();

        updateStatus(
          "Google Drive connected."
        );
      }
    });

  tokenClient.requestAccessToken();
};

document.querySelectorAll(".workout")
.forEach(btn => {

  btn.onclick = () => {

    document.querySelectorAll(".workout")
      .forEach(x =>
        x.classList.remove("selected")
      );

    btn.classList.add("selected");
  };
});

document.getElementById("analyzeBtn")
.onclick = () => {

  const day =
    document.querySelector(".workout.selected")
      .dataset.day;

  document.getElementById(
    "recommendationBox"
  ).textContent = `
Workout: ${day}

Previous 3 average:
- 60 kg
- 8.3 reps
- RIR 1.3

Charge:
+2.5 kg

Recommended:
62.5 kg

Logic:
avg(last_3_kg) + charge
`;
};

document.getElementById("uploadBtn")
.onclick = async () => {

  if (!SESSION.accessToken) {
    updateStatus(
      "Connect Google Drive first."
    );
    return;
  }

  const csv =
`exercise,kg,reps
Chest Press,62.5,8`;

  const metadata = {
    name:
      "Day_B_" +
      new Date().toISOString().slice(0,10) +
      "_log.csv",

    mimeType: "text/csv",

    parents: [SESSION.folderId]
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
      [csv],
      { type: "text/csv" }
    )
  );

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: new Headers({
        Authorization:
          "Bearer " +
          SESSION.accessToken
      }),
      body: form
    }
  );

  if (response.ok) {
    updateStatus(
      "Workout CSV uploaded."
    );
  } else {
    updateStatus(
      "Upload failed."
    );
  }
};

loadSession();
