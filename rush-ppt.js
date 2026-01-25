import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQGY6rTnONnmBUUnrWpHM5qvyMz9BpfN8",
  authDomain: "akpsi-web.firebaseapp.com",
  projectId: "akpsi-web",
  storageBucket: "akpsi-web.appspot.com",
  messagingSenderId: "268414380859",
  appId: "1:268414380859:web:52cdd93b22d7801f60251e"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById("generatePPT").addEventListener("click", async () => {
  const PptxCtor = window.PptxGenJS;
  if (!PptxCtor) {
    alert("❌ PptxGenJS did not load. Check the pptxgenjs script tag on this page.");
    return;
  }

  const pptx = new PptxCtor();
  pptx.layout = "LAYOUT_16x9";

  // ✅ FIX: pull PNMs from users where role == pnm
  const querySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "pnm")));

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const slide = pptx.addSlide();

    slide.addText(`${data.firstName || ""} ${data.lastName || ""}`.trim(), {
      x: 0.8, y: 0.5, fontSize: 28, bold: true, color: "003366"
    });

    slide.addText(`Grad Year: ${data.gradYear || "N/A"}`, { x: 0.8, y: 1.1, fontSize: 18 });
    slide.addText(`+Mentions: ${data.positiveMentions || 0}`, { x: 0.8, y: 1.6, fontSize: 18 });
    slide.addText(`–Mentions: ${data.negativeMentions || 0}`, { x: 0.8, y: 2.1, fontSize: 18 });
    slide.addText(`Avg Interview: ${data.avgInterview || "N/A"}`, { x: 0.8, y: 2.6, fontSize: 18 });

    if (data.photoURL) {
      try {
        slide.addImage({ path: data.photoURL, x: 7, y: 0.8, w: 3, h: 3 });
      } catch (e) {
        console.warn("Photo failed:", docSnap.id, e);
      }
    }

    if (data.comments) {
      slide.addText(`Comments:\n${data.comments}`, {
        x: 0.8, y: 3.3, w: 8, h: 2.5, fontSize: 16, color: "444444"
      });
    }
  }

  // ✅ Safari-safe download
  const blob = await pptx.write("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "VotingNightSlides.pptx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("✅ Voting PowerPoint successfully generated!");
});
