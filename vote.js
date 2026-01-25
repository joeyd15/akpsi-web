import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  increment
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

/* =========================
   Firebase Config
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAQGY6rTnONnmBUUnrWpHM5qvyMz9BpfN8",
  authDomain: "akpsi-web.firebaseapp.com",
  projectId: "akpsi-web",
  storageBucket: "akpsi-web.appspot.com",
  messagingSenderId: "268414380859",
  appId: "1:268414380859:web:52cdd93b22d7801f60251e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* =========================
   DOM
========================= */
const authButton = document.getElementById("authButton");
const userGreeting = document.getElementById("userGreeting");

const pnmPhoto = document.getElementById("pnmPhoto");
const pnmName = document.getElementById("pnmName");
const slideNote = document.getElementById("slideNote");
const voteStatus = document.getElementById("voteStatus");

const voteYes = document.getElementById("voteYes");
const voteNo = document.getElementById("voteNo");
const voteAbstain = document.getElementById("voteAbstain");
const revoteBtn = document.getElementById("revoteBtn");

// Application panel
const appMajor = document.getElementById("appMajor");
const appGpa = document.getElementById("appGpa");
const appGrad = document.getElementById("appGrad");
const appAbout = document.getElementById("appAbout");
const appWhy = document.getElementById("appWhy");
const appAccomplishments = document.getElementById("appAccomplishments");

// ✅ Admin-only chart/totals
const chartWrap = document.querySelector(".summary-chart");
let totalsLine = document.createElement("div");
totalsLine.id = "adminTotalsLine";
totalsLine.className = "text-center text-muted small mt-2";
totalsLine.textContent = "";
if (chartWrap) chartWrap.appendChild(totalsLine);

/* =========================
   Voting session references
========================= */
const sessionId = "current";
const sessionRef = doc(db, "voting-sessions", sessionId);

let currentUser = null;
let currentUserRole = null;

let activePNMId = null;
let votingOpen = false;

// chart
let chart = null;

/* =========================
   Helpers
========================= */
function setButtonsEnabled(enabled) {
  voteYes.disabled = !enabled;
  voteNo.disabled = !enabled;
  voteAbstain.disabled = !enabled;
}

function setStatus(msg) {
  voteStatus.textContent = msg || "";
}

function safeText(el, label, value) {
  el.textContent = value ? `${label}: ${value}` : "";
}

function resetApplicationPanel() {
  appMajor.textContent = "";
  appGpa.textContent = "";
  appGrad.textContent = "";
  appAbout.textContent = "";
  appWhy.textContent = "";
  appAccomplishments.textContent = "";
}

function resetPNMPanel() {
  pnmPhoto.src = "";
  pnmName.textContent = "";
  slideNote.textContent = "";
}

function initChart() {
  const ctx = document.getElementById("voteChart");
  if (!ctx) return;

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Yes", "No", "Abstain"],
      datasets: [
        {
          data: [0, 0, 0]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

function updateChartData(yes, no, abstain) {
  const y = yes || 0;
  const n = no || 0;
  const a = abstain || 0;

  const total = y + n + a;

  const pct = (val) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  const yPct = pct(y);
  const nPct = pct(n);
  const aPct = pct(a);

  // Admin-only totals line with percentages
  totalsLine.textContent = 
    `Yes: ${y} (${yPct}%) | No: ${n} (${nPct}%) | Abstain: ${a} (${aPct}%)`;

  // Only update chart if it exists (admins only)
  if (!chart) return;

  chart.data.datasets[0].data = [y, n, a];
  chart.update();
}


/* =========================
   Core logic
========================= */

// Find a valid current PNM (first one) — used as fallback if session has stale id
async function getFirstCurrentPNMId() {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "pnm")));
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// If session.activePNM is stale/missing, try to auto-heal by picking first current PNM.
async function healSessionIfNeeded(sessionData) {
  const candidate = sessionData && sessionData.activePNM ? String(sessionData.activePNM) : "";
  if (!candidate) {
    const first = await getFirstCurrentPNMId();
    if (!first) return null;

    try {
      await setDoc(sessionRef, { activePNM: first, votingOpen: false }, { merge: true });
    } catch (e) {
      // ignore
    }
    return first;
  }

  // verify candidate exists as a current PNM user doc
  const pnmDoc = await getDoc(doc(db, "users", candidate));
  if (pnmDoc.exists() && pnmDoc.data() && pnmDoc.data().role === "pnm") {
    return candidate;
  }

  // stale candidate -> fallback
  const first = await getFirstCurrentPNMId();
  if (!first) return null;

  try {
    await setDoc(sessionRef, { activePNM: first, votingOpen: false }, { merge: true });
  } catch (e) {
    // ignore
  }
  return first;
}

// Load the PNM display + application panel (application doc id = pnm uid)
async function loadPNMAndApplication(pnmId) {
  resetPNMPanel();
  resetApplicationPanel();

  if (!pnmId) {
    setStatus("No active PNM. Waiting for admin to select one.");
    setButtonsEnabled(false);
    revoteBtn.style.display = "none";
    updateChartData(0, 0, 0);
    return;
  }

  // Load PNM user doc
  const pnmUserRef = doc(db, "users", pnmId);
  const pnmUserSnap = await getDoc(pnmUserRef);

  if (!pnmUserSnap.exists()) {
    setStatus("Active PNM is invalid/stale. Ask admin to refresh the voting session.");
    setButtonsEnabled(false);
    revoteBtn.style.display = "none";
    updateChartData(0, 0, 0);
    return;
  }

  const pnmUser = pnmUserSnap.data();
  const fullName = `${pnmUser.firstName || ""} ${pnmUser.lastName || ""}`.trim() || "PNM";
  pnmName.textContent = fullName;

  // Photo: support either photoUrl field OR blank
  const photoUrl = pnmUser.photoUrl || pnmUser.photo || "";
  if (photoUrl) {
    pnmPhoto.src = photoUrl;
  } else {
    pnmPhoto.removeAttribute("src");
  }

  slideNote.textContent = votingOpen ? "Voting is OPEN" : "Voting is CLOSED";

  // Load application doc (keyed by uid)
  const appSnap = await getDoc(doc(db, "applications", pnmId));
  if (appSnap.exists()) {
    const a = appSnap.data();
    safeText(appMajor, "Major", a.major || "");
    safeText(appGpa, "GPA", (typeof a.gpa === "number") ? a.gpa.toFixed(2) : (a.gpa || ""));
    safeText(appGrad, "Expected Graduation", a.gradDate || "");
    appAbout.textContent = a.about || "";
    appWhy.textContent = a.whyAkpsi || "";
    appAccomplishments.textContent = a.accomplishments || "";
  } else {
    appAbout.textContent = "";
    appWhy.textContent = "";
    appAccomplishments.textContent = "";
  }

  // hook votes chart live
  const totalsRef = doc(db, `voting-sessions/${sessionId}/votes`, pnmId);
  onSnapshot(totalsRef, (snap) => {
    if (!snap.exists()) {
      updateChartData(0, 0, 0);
      return;
    }
    const t = snap.data();
    updateChartData(t.yes || 0, t.no || 0, t.abstain || 0);
  });

  // check if this user already voted
  await refreshUserVoteState();
}

// Doc id format in your admin resetVotes(): `${pnmId}_<uid>`
function userVoteDocId(pnmId, uid) {
  return `${pnmId}_${uid}`;
}

async function refreshUserVoteState() {
  if (!currentUser || !activePNMId) return;

  const uvRef = doc(db, `voting-sessions/${sessionId}/userVotes`, userVoteDocId(activePNMId, currentUser.uid));
  const uvSnap = await getDoc(uvRef);

  if (!votingOpen) {
    setButtonsEnabled(false);
    revoteBtn.style.display = "none";
    setStatus("Voting is closed.");
    return;
  }

  if (uvSnap.exists()) {
    const myVote = uvSnap.data().vote || "vote";
    setButtonsEnabled(false);
    revoteBtn.style.display = "inline-block";
    setStatus(`You voted: ${String(myVote).toUpperCase()}`);
  } else {
    setButtonsEnabled(true);
    revoteBtn.style.display = "none";
    setStatus("Cast your vote.");
  }
}

// Record vote (and update totals)
async function castVote(voteValue) {
  if (!currentUser) return;
  if (!activePNMId) return;
  if (!votingOpen) return;

  const totalsRef = doc(db, `voting-sessions/${sessionId}/votes`, activePNMId);
  const uvRef = doc(db, `voting-sessions/${sessionId}/userVotes`, userVoteDocId(activePNMId, currentUser.uid));

  // prevent double-vote
  const uvSnap = await getDoc(uvRef);
  if (uvSnap.exists()) {
    setStatus("You already voted. Click Revote if you need to change it.");
    return;
  }

  // Ensure totals doc exists
  const totalsSnap = await getDoc(totalsRef);
  if (!totalsSnap.exists()) {
    await setDoc(totalsRef, { yes: 0, no: 0, abstain: 0 });
  }

  // Write user vote then increment totals
  await setDoc(uvRef, {
    uid: currentUser.uid,
    vote: voteValue,
    timestamp: new Date().toISOString()
  });

  const inc = {};
  if (voteValue === "yes") inc.yes = increment(1);
  else if (voteValue === "no") inc.no = increment(1);
  else inc.abstain = increment(1);

  await updateDoc(totalsRef, inc);

  await refreshUserVoteState();
}

// Revote = remove old vote + decrement old total + allow revote
async function revote() {
  if (!currentUser || !activePNMId) return;
  if (!votingOpen) return;

  const totalsRef = doc(db, `voting-sessions/${sessionId}/votes`, activePNMId);
  const uvRef = doc(db, `voting-sessions/${sessionId}/userVotes`, userVoteDocId(activePNMId, currentUser.uid));

  const uvSnap = await getDoc(uvRef);
  if (!uvSnap.exists()) {
    await refreshUserVoteState();
    return;
  }

  const oldVote = uvSnap.data().vote;

  // delete user vote
  const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
  await deleteDoc(uvRef);

  // decrement totals
  const dec = {};
  if (oldVote === "yes") dec.yes = increment(-1);
  else if (oldVote === "no") dec.no = increment(-1);
  else dec.abstain = increment(-1);

  try {
    await updateDoc(totalsRef, dec);
  } catch (e) {
    // ignore
  }

  await refreshUserVoteState();
}

/* =========================
   Event listeners
========================= */
voteYes.addEventListener("click", () => castVote("yes"));
voteNo.addEventListener("click", () => castVote("no"));
voteAbstain.addEventListener("click", () => castVote("abstain"));
revoteBtn.addEventListener("click", () => revote());

authButton.addEventListener("click", async () => {
  if (!currentUser) {
    window.location.href = "signin.html";
    return;
  }
  await signOut(auth);
  window.location.href = "signin.html";
});

/* =========================
   Startup
========================= */
setButtonsEnabled(false);
setStatus("Loading...");

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (!currentUser) {
    authButton.textContent = "Sign In";
    userGreeting.textContent = "";
    setButtonsEnabled(false);
    setStatus("Please sign in to vote.");
    return;
  }

  authButton.textContent = "Sign Out";

  // Load user role (brother/admin check)
  const meSnap = await getDoc(doc(db, "users", currentUser.uid));
  if (meSnap.exists()) {
    const me = meSnap.data();
    currentUserRole = me.role || null;
    const name = `${me.firstName || ""}`.trim();
    userGreeting.textContent = name ? `Hi, ${name}!` : "";
  }

  // ✅ Admin-only visibility for chart + totals
  const isAdmin = (currentUserRole === "admin");

  if (chartWrap) {
    chartWrap.style.display = isAdmin ? "block" : "none";
  }
  if (totalsLine) {
    totalsLine.style.display = isAdmin ? "block" : "none";
  }

  // Only initialize Chart.js for admins
  if (isAdmin) {
    initChart();
    updateChartData(0, 0, 0);
  }

  // Listen to session changes
  onSnapshot(sessionRef, async (snap) => {
    if (!snap.exists()) {
      activePNMId = null;
      votingOpen = false;
      resetPNMPanel();
      resetApplicationPanel();
      setButtonsEnabled(false);
      setStatus("No voting session found.");
      updateChartData(0, 0, 0);
      return;
    }

    const s = snap.data();
    votingOpen = !!s.votingOpen;

    // heal if missing/stale
    const healedId = await healSessionIfNeeded(s);

    activePNMId = healedId || (s.activePNM ? String(s.activePNM) : null);

    await loadPNMAndApplication(activePNMId);
  });
});
