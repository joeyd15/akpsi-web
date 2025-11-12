import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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

document.getElementById("generatePPT").addEventListener("click", async () => {
  const pptx = new PptxGenJS();
  pptx.layout = "16x9";

  const querySnapshot = await getDocs(collection(db, "pnms"));

  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    const slide = pptx.addSlide();

    slide.addText(`${data.firstName} ${data.lastName}`, { x: 0.8, y: 0.5, fontSize: 28, bold: true, color: "003366" });
    slide.addText(`Grad Year: ${data.gradYear || "N/A"}`, { x: 0.8, y: 1.1, fontSize: 18 });
    slide.addText(`+Mentions: ${data.positiveMentions || 0}`, { x: 0.8, y: 1.6, fontSize: 18 });
    slide.addText(`–Mentions: ${data.negativeMentions || 0}`, { x: 0.8, y: 2.1, fontSize: 18 });
    slide.addText(`Avg Interview: ${data.avgInterview || "N/A"}`, { x: 0.8, y: 2.6, fontSize: 18 });

    if (data.photoURL) {
      slide.addImage({ path: data.photoURL, x: 7, y: 0.8, w: 3, h: 3 });
    }

    if (data.comments) {
      slide.addText(`Comments:\n${data.comments}`, {
        x: 0.8, y: 3.3, w: 8, h: 2.5, fontSize: 16, color: "444444"
      });
    }
  }

  await pptx.writeFile({ fileName: "VotingNightSlides.pptx" });
  alert("✅ Voting PowerPoint successfully generated!");
});
