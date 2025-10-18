import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQGY6rTnONnmBUUnrWpHM5qvyMz9BpfN8",
  authDomain: "akpsi-web.firebaseapp.com",
  projectId: "akpsi-web",
  storageBucket: "akpsi-web.firebasestorage.app",
  messagingSenderId: "268414380859",
  appId: "1:268414380859:web:52cdd93b22d7801f60251e"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let sessionId = "current";

const pnmSelect = document.getElementById("pnmSelect");
const openBtn = document.getElementById("openVoting");
const closeBtn = document.getElementById("closeVoting");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signin.html";
    return;
  }
  // Populate select with PNMs
  const pnmsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "pnm")));
  pnmSelect.innerHTML = "";
  pnmsSnap.forEach(docSnap => {
    const d = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.text = `${d.firstName || ""} ${d.lastName || ""}`;
    pnmSelect.appendChild(option);
  });
});

openBtn.onclick = async () => {
  await setDoc(doc(db, "voting-sessions", sessionId), {
    votingOpen: true,
    activePNM: pnmSelect.value
  }, {merge:true});
};
closeBtn.onclick = async () => {
  await setDoc(doc(db, "voting-sessions", sessionId), {
    votingOpen: false,
    activePNM: pnmSelect.value
  }, {merge:true});
};
