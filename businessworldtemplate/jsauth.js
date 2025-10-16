// source/jsauth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyAQGY6rTnONnmBUUnrWpHM5qvyMz9BpfN8",
  authDomain: "akpsi-web.firebaseapp.com",
  projectId: "akpsi-web",
  storageBucket: "akpsi-web.firebasestorage.app",
  messagingSenderId: "268414380859",
  appId: "1:268414380859:web:52cdd93b22d7801f60251e",
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(e => {
  console.warn("Failed to set persistence", e);
});
const db = getFirestore(app);
const storage = getStorage(app);


// your existing listenAuth stays here unchanged
function listenAuth({
  greeting,
  authButton,
  brotherPortalLink,
  adminPortalLink,
  mentionsLink,
  pnmDashboardLink,
  rushDashboardLink,
  interviewDashboardLink,
}) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let role = "pnm";
      let firstName = user.email.split("@")[0];
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role || "pnm";
          firstName = data.firstName || firstName;
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }


      if (greeting) greeting.textContent = `Hi, ${firstName}!`;
      if (authButton) {
        authButton.textContent = "Log Out";
        authButton.href = "#";
        authButton.onclick = async (e) => {
          e.preventDefault();
          await signOut(auth);
          window.location.href = "signin.html";
        };
      }


      brotherPortalLink?.classList.toggle("d-none", !(role === "brother" || role === "admin"));
      adminPortalLink?.classList.toggle("d-none", role !== "admin");
      mentionsLink?.classList.toggle("d-none", !(role === "brother" || role === "admin"));
      pnmDashboardLink?.classList.toggle("d-none", role !== "admin");
      rushDashboardLink?.classList.toggle("d-none", role !== "admin");
      interviewDashboardLink?.classList.toggle("d-none", role !== "admin");
    } else {
      if (greeting) greeting.textContent = "Hi!";
      if (authButton) {
        authButton.textContent = "Sign In";
        authButton.href = "signin.html";
        authButton.onclick = null;
      }
      brotherPortalLink?.classList.add("d-none");
      adminPortalLink?.classList.add("d-none");
      mentionsLink?.classList.add("d-none");
      pnmDashboardLink?.classList.add("d-none");
      rushDashboardLink?.classList.add("d-none");
      interviewDashboardLink?.classList.add("d-none");
    }
  });
}

// New functions for photo upload

async function getPNMList() {
  const snapshot = await getDocs(collection(db, "users"));
  const pnms = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.role && data.role.toLowerCase() === "pnm") {
      pnms.push({ id: docSnap.id, ...data });
    }
  });
  return pnms;
}

async function savePhotoToPNM(pnmId, url) {
  await updateDoc(doc(db, "users", pnmId), { photoURL: url });
}

async function uploadPNMPhoto(pnmId, file, progressCallback) {
  if (!file) throw new Error("No file selected");
  if (!pnmId) throw new Error("No PNM selected");
  const fileName = `${pnmId}_${Date.now()}_${file.name}`;
  const photoRef = ref(storage, `pnm_photos/${fileName}`);
  const uploadTask = uploadBytesResumable(photoRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snap) => {
        if (progressCallback) {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          progressCallback(pct);
        }
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export {
  auth,
  db,
  listenAuth,
  getPNMList,
  savePhotoToPNM,
  uploadPNMPhoto,
};

