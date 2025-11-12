import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc, increment, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


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


let userRole = "pnm";
let userId = null;
let sessionId = "current";


const voteYesBtn = document.getElementById("voteYes");
const voteNoBtn = document.getElementById("voteNo");
const voteAbstainBtn = document.getElementById("voteAbstain");
const pnmName = document.getElementById("pnmName");
const pnmPhoto = document.getElementById("pnmPhoto");
const slideNote = document.getElementById("slideNote");
const voteStatus = document.getElementById("voteStatus");
const userGreeting = document.getElementById("userGreeting");
const authButton = document.getElementById("authButton");
const voteButtons = document.getElementById("voteButtons");


// Admin-only result summary element
let resultSummary = document.getElementById('resultSummary');
if (!resultSummary) {
  resultSummary = document.createElement('div');
  resultSummary.id = 'resultSummary';
  resultSummary.className = 'mt-2 fw-semibold';
  document.querySelector('.summary-chart').appendChild(resultSummary);
}


let chart = null;
function updateChart({yes=0,no=0,abstain=0}, showChart=true) {
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
    const yesPct = ((yes / total) * 100).toFixed(1);
    const noPct = ((no / total) * 100).toFixed(1);
    const abstainPct = ((abstain / total) * 100).toFixed(1);
    resultSummary.innerHTML = `
      <span style="color:#198754">Yes:</span> ${yes} (${yesPct}%)&nbsp;&nbsp;
      <span style="color:#dc3545">No:</span> ${no} (${noPct}%)&nbsp;&nbsp;
      <span style="color:#adb5bd">Abstain:</span> ${abstain} (${abstainPct}%)
      <br><small>Total votes: ${total}</small>
    `;
  }
}


function disableVoting(msg) {
  voteYesBtn.disabled = true;
  voteNoBtn.disabled = true;
  voteAbstainBtn.disabled = true;
  voteButtons.classList.add('disabled');
  voteStatus.textContent = msg || "Voting is currently closed.";
}


function enableVoting() {
  voteYesBtn.disabled = false;
  voteNoBtn.disabled = false;
  voteAbstainBtn.disabled = false;
  voteButtons.classList.remove('disabled');
  voteStatus.textContent = "Voting is open. Please submit your vote.";
}


let currentPNM = null;
let votingOpen = false;
let userVote = null;


// Authentication state listener with safe redirection
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    userGreeting.textContent = '';
    authButton.textContent = 'Sign In';
    authButton.onclick = () => window.location.href = "signin.html";
    if (!window.location.pathname.endsWith('signin.html')) {
      setTimeout(() => {
        if (!auth.currentUser) {
          window.location.href = "signin.html";
        }
      }, 100);
    }
    return;
  }


  userId = user.uid;
  const userDoc = await getDoc(doc(db, "users", userId));
  userRole = userDoc.exists() ? (userDoc.data().role || "pnm") : "pnm";


  let greetingText = `Signed in as: ${user.email}`;
  if (userDoc.exists() && userDoc.data().firstName) {
    greetingText = `Signed in as: ${userDoc.data().firstName} (${userRole})`;
  }
  userGreeting.textContent = greetingText;


  authButton.textContent = 'Log Out';
  authButton.onclick = async () => {
    await signOut(auth);
    userGreeting.textContent = '';
    authButton.textContent = 'Sign In';
    window.location.href = "signin.html";
  };


  if (userRole === "pnm") {
    disableVoting("Access denied. Only Brothers & Admins may vote.");
    updateChart({ yes: 0, no: 0, abstain: 0 }, false);
    resultSummary.style.display = 'none';
    return;
  }


  onSnapshot(doc(db, "voting-sessions", sessionId), async (snap) => {
    if (!snap.exists()) {
      disableVoting("No voting session is currently active.");
      pnmName.textContent = "";
      pnmPhoto.src = "";
      slideNote.textContent = "";
      updateChart({ yes: 0, no: 0, abstain: 0 }, userRole === 'admin');
      resultSummary.style.display = 'none';
      return;
    }
    const { activePNM, votingOpen: vo } = snap.data();
    votingOpen = vo;
    if (activePNM) {
      const pnmSnap = await getDoc(doc(db, "users", activePNM));
      if (pnmSnap.exists()) {
        const d = pnmSnap.data();
        pnmName.textContent = `${d.firstName || ""} ${d.lastName || ""}`;
        pnmPhoto.src = d.photoURL || "https://placehold.co/130x130";
        slideNote.textContent = d.year ? `Year: ${d.year}` : "";
        currentPNM = activePNM;
      } else {
        pnmName.textContent = "";
        pnmPhoto.src = "";
        slideNote.textContent = "";
        currentPNM = null;
      }
    } else {
      pnmName.textContent = "No PNM selected.";
      pnmPhoto.src = "";
      slideNote.textContent = "";
      currentPNM = null;
    }


    if (currentPNM) {
      onSnapshot(doc(db, `voting-sessions/${sessionId}/votes`, currentPNM), (voteSnap) => {
        const data = voteSnap.exists() ? voteSnap.data() : {};
        console.log("Votes data snapshot:", data, "For PNM:", currentPNM);
        updateChart({
          yes: data.yes || 0,
          no: data.no || 0,
          abstain: data.abstain || 0,
        }, userRole === 'admin');
        resultSummary.style.display = userRole === 'admin' ? '' : 'none';
      });
      const userVoteSnap = await getDoc(doc(db, `voting-sessions/${sessionId}/userVotes`, `${currentPNM}_${userId}`));
      userVote = userVoteSnap.exists() ? userVoteSnap.data().vote : null;
    }


    if (!votingOpen) {
      disableVoting("Voting not opened by admin.");
      updateChart({ yes: 0, no: 0, abstain: 0 }, userRole === 'admin');
    } else {
      enableVoting();
      if (userVote) {
        voteStatus.textContent = `Vote submitted: ${userVote.toUpperCase()}`;
        voteYesBtn.disabled = true;
        voteNoBtn.disabled = true;
        voteAbstainBtn.disabled = true;
      } else {
        voteYesBtn.disabled = false;
        voteNoBtn.disabled = false;
        voteAbstainBtn.disabled = false;
      }
    }
  });
});


// Submit vote with single vote enforcement and safe first vote initialization
async function submitVote(vote) {
  if (!(votingOpen && currentPNM && userRole && userRole !== "pnm")) return;

  const userVoteSnap = await getDoc(doc(db, `voting-sessions/${sessionId}/userVotes`, `${currentPNM}_${userId}`));
  if (userVoteSnap.exists()) {
    voteStatus.textContent = "You have already submitted your vote for this PNM.";
    return;
  }

  const votesDocRef = doc(db, `voting-sessions/${sessionId}/votes`, currentPNM);
  const votesSnap = await getDoc(votesDocRef);
  if (!votesSnap.exists()) {
    await setDoc(votesDocRef, { yes: 0, no: 0, abstain: 0 });
  }

  await setDoc(doc(db, `voting-sessions/${sessionId}/userVotes`, `${currentPNM}_${userId}`), { vote }, { merge: true }).catch(console.error);
  await updateDoc(votesDocRef, { [vote]: increment(1) }).catch(console.error);

  voteStatus.textContent = `Vote submitted: ${vote.toUpperCase()}`;
  voteYesBtn.disabled = true;
  voteNoBtn.disabled = true;
  voteAbstainBtn.disabled = true;
}


voteYesBtn.onclick = () => submitVote("yes");
voteNoBtn.onclick = () => submitVote("no");
voteAbstainBtn.onclick = () => submitVote("abstain");
