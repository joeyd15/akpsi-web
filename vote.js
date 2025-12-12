import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, onSnapshot, updateDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

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

// UI elements
let userRole = "pnm";
let userId = null;
let sessionId = "current";

const voteYesBtn = document.getElementById("voteYes");
const voteNoBtn = document.getElementById("voteNo");
const voteAbstainBtn = document.getElementById("voteAbstain");
const revoteBtn = document.getElementById("revoteBtn");

const pnmName = document.getElementById("pnmName");
const pnmPhoto = document.getElementById("pnmPhoto");
const slideNote = document.getElementById("slideNote");
const voteStatus = document.getElementById("voteStatus");

const userGreeting = document.getElementById("userGreeting");
const authButton = document.getElementById("authButton");

const voteButtons = document.getElementById("voteButtons");

// === APPLICATION PANEL ELEMENTS (ADD ONLY) ===
const appMajor = document.getElementById("appMajor");
const appGpa = document.getElementById("appGpa");
const appGrad = document.getElementById("appGrad");
const appAbout = document.getElementById("appAbout");
const appWhy = document.getElementById("appWhy");
const appAccomplishments = document.getElementById("appAccomplishments");


// ADMIN chart setup
let resultSummary = document.getElementById('resultSummary');
if (!resultSummary) {
  resultSummary = document.createElement('div');
  resultSummary.id = 'resultSummary';
  resultSummary.className = 'mt-2 fw-semibold';
  document.querySelector('.summary-chart').appendChild(resultSummary);
}

let chart = null;
function updateChart({yes=0, no=0, abstain=0}, showChart=true) {
  if (!showChart) {
    document.querySelector('.summary-chart').style.display = 'none';
    return;
  }
  document.querySelector('.summary-chart').style.display = '';

  if (!chart) {
    const ctx = document.getElementById('voteChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Yes', 'No', 'Abstain'],
        datasets: [{
          data: [yes, no, abstain],
          backgroundColor: ["#198754", "#dc3545", "#adb5bd"]
        }]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });
  } else {
    chart.data.datasets[0].data = [yes, no, abstain];
    chart.update();
  }

  const total = yes + no + abstain;

  if (total === 0) {
    resultSummary.textContent = "No votes cast yet.";
  } else {
    resultSummary.innerHTML = `
      <span style="color:#198754">Yes:</span> ${yes} (${((yes/total)*100).toFixed(1)}%)&nbsp;&nbsp;
      <span style="color:#dc3545">No:</span> ${no} (${((no/total)*100).toFixed(1)}%)&nbsp;&nbsp;
      <span style="color:#adb5bd">Abstain:</span> ${abstain} (${((abstain/total)*100).toFixed(1)}%)
      <br><small>Total votes: ${total}</small>
    `;
  }
}

function disableVoting(msg) {
  voteYesBtn.disabled = true;
  voteNoBtn.disabled = true;
  voteAbstainBtn.disabled = true;
  voteButtons.classList.add('disabled');
  revoteBtn.style.display = "none";
  voteStatus.textContent = msg;
}

function enableVoting() {
  voteYesBtn.disabled = false;
  voteNoBtn.disabled = false;
  voteAbstainBtn.disabled = false;
  voteButtons.classList.remove('disabled');
  voteStatus.textContent = "";
  revoteBtn.style.display = "none";
}

let currentPNM = null;
let votingOpen = false;
let userVote = null;

// AUTH
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signin.html";
    return;
  }

  userId = user.uid;
  const userDoc = await getDoc(doc(db, "users", userId));
  userRole = userDoc.exists() ? (userDoc.data().role || "pnm") : "pnm";

  userGreeting.textContent = `Signed in as: ${user.email}`;
  authButton.textContent = "Log Out";
  authButton.onclick = async () => {
    await signOut(auth);
    window.location.href = "signin.html";
  };

  if (userRole === "pnm") {
    disableVoting("Access denied. Only Brothers & Admins may vote.");
    updateChart({}, false);
    return;
  }

  // Listen for session
  onSnapshot(doc(db, "voting-sessions", sessionId), async (snap) => {
    if (!snap.exists()) {
      disableVoting("No active voting session.");
      return;
    }

    const { activePNM, votingOpen: vo } = snap.data();
    votingOpen = vo;

    if (!activePNM) {
      disableVoting("No PNM selected.");
      return;
    }

    currentPNM = activePNM;

    // load PNM
    const pnmSnap = await getDoc(doc(db, "users", activePNM));
    const d = pnmSnap.data();
    pnmName.textContent = `${d.firstName || ""} ${d.lastName || ""}`;
    pnmPhoto.src = d.photoURL || "https://placehold.co/130x130";
    slideNote.textContent = d.year ? `Year: ${d.year}` : "";

    // === LOAD PNM APPLICATION (READ-ONLY, ADD ONLY) ===
const appSnap = await getDoc(doc(db, "applications", activePNM));

if (appSnap.exists()) {
  const a = appSnap.data();
  appMajor.textContent = `Major: ${a.major || "—"}`;
  appGpa.textContent = `GPA: ${a.gpa ?? "—"}`;
  appGrad.textContent = `Graduation: ${a.gradDate || "—"}`;
  appAbout.textContent = a.about || "";
  appWhy.textContent = a.whyAkpsi || "";
  appAccomplishments.textContent = a.accomplishments || "";
} else {
  appMajor.textContent = "No application submitted.";
  appGpa.textContent = "";
  appGrad.textContent = "";
  appAbout.textContent = "";
  appWhy.textContent = "";
  appAccomplishments.textContent = "";
}



    // load vote totals
    onSnapshot(doc(db, `voting-sessions/${sessionId}/votes`, activePNM), (voteSnap) => {
      const data = voteSnap.exists() ? voteSnap.data() : { yes:0, no:0, abstain:0 };
      updateChart(data, userRole === "admin");
      resultSummary.style.display = userRole === "admin" ? "" : "none";
    });

    // load user vote
    const userVoteSnap = await getDoc(doc(db, `voting-sessions/${sessionId}/userVotes`, `${currentPNM}_${userId}`));
    userVote = userVoteSnap.exists() ? userVoteSnap.data().vote : null;

    if (!votingOpen) {
      disableVoting("Voting not opened by admin.");
      return;
    }

    if (userVote) {
      voteYesBtn.disabled = true;
      voteNoBtn.disabled = true;
      voteAbstainBtn.disabled = true;
      revoteBtn.style.display = "inline-block";
      voteStatus.textContent = `Vote submitted: ${userVote.toUpperCase()}`;
    } else {
      enableVoting();
      voteStatus.textContent = "Voting open — please vote.";
    }
  });
});

// SUBMIT VOTE
async function submitVote(newVote) {
  if (!votingOpen || !currentPNM) return;

  const voteId = `${currentPNM}_${userId}`;
  const userVoteRef = doc(db, `voting-sessions/${sessionId}/userVotes`, voteId);
  const votesRef = doc(db, `voting-sessions/${sessionId}/votes`, currentPNM);

  const userVoteSnap = await getDoc(userVoteRef);
  const votesSnap = await getDoc(votesRef);

  let votesData = votesSnap.exists()
    ? votesSnap.data()
    : { yes:0, no:0, abstain:0 };

  // If user tries same vote, block
  if (userVoteSnap.exists() && userVoteSnap.data().vote === newVote) {
    voteStatus.textContent = "You already voted this. Use REVOTE to change.";
    return;
  }

  // If user had previous vote, subtract it
  if (userVoteSnap.exists()) {
    const oldVote = userVoteSnap.data().vote;
    votesData[oldVote] = Math.max(0, votesData[oldVote] - 1);
  }

  // Add new vote
  votesData[newVote] = (votesData[newVote] || 0) + 1;

  await setDoc(votesRef, votesData, { merge: true });
  await setDoc(userVoteRef, { vote: newVote }, { merge: true });

  voteStatus.textContent = `Vote submitted: ${newVote.toUpperCase()}`;

  voteYesBtn.disabled = true;
  voteNoBtn.disabled = true;
  voteAbstainBtn.disabled = true;
  revoteBtn.style.display = "inline-block";
}

// REVOTE
revoteBtn.onclick = async () => {
  const voteId = `${currentPNM}_${userId}`;
  const userVoteRef = doc(db, `voting-sessions/${sessionId}/userVotes`, voteId);
  const votesRef = doc(db, `voting-sessions/${sessionId}/votes`, currentPNM);

  const userSnap = await getDoc(userVoteRef);
  const voteSnap = await getDoc(votesRef);

  if (!userSnap.exists() || !voteSnap.exists()) return;

  const prevVote = userSnap.data().vote;
  let data = voteSnap.data();

  data[prevVote] = Math.max(0, data[prevVote] - 1);

  await setDoc(votesRef, data, { merge: true });
  await updateDoc(userVoteRef, { vote: null });

  voteStatus.textContent = "Vote cleared — cast a new vote.";
  voteYesBtn.disabled = false;
  voteNoBtn.disabled = false;
  voteAbstainBtn.disabled = false;
  revoteBtn.style.display = "none";
};

// Button bindings
voteYesBtn.onclick = () => submitVote("yes");
voteNoBtn.onclick = () => submitVote("no");
voteAbstainBtn.onclick = () => submitVote("abstain");
