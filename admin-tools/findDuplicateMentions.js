const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function normalizeText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => (out[k] = obj[k]));
  return out;
}

function fingerprint(m) {
  const pnmId = m.pnmId || m.pnmUID || m.pnm || "";
  const submittedBy = m.submittedBy || m.brotherId || m.userId || "";
  const text = String(m.text || m.mentionText || m.note || ""); // NO normalize
  const eventId = m.eventId || "";
  const category = m.category || "";

  return `${pnmId}||${submittedBy}||${eventId}||${category}||${text}`;
}


(async () => {
  const snapshot = await db.collection("mentions").get();
  console.log(`Total mentions: ${snapshot.size}`);

  const map = new Map(); // key -> [{id, data}]
  snapshot.forEach((doc) => {
    const data = doc.data();
    const key = fingerprint(data);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ id: doc.id, data });
  });

  const duplicates = [...map.entries()].filter(([_, arr]) => arr.length > 1);
  duplicates.sort((a, b) => b[1].length - a[1].length);

  console.log(`Duplicate groups found: ${duplicates.length}\n`);

  // Print top 20 largest groups with context
  const top = duplicates.slice(0, 20);
  top.forEach(([key, arr], idx) => {
    console.log(`Group ${idx + 1} (${arr.length} copies)`);
    console.log("Doc IDs:", arr.map((x) => x.id).join(", "));

    const sample = arr[0].data;
    console.log("Sample fields:", pick(sample, [
      "pnmId", "pnmUID", "pnm",
      "submittedBy", "brotherId", "userId",
      "eventId", "category",
      "text", "mentionText", "note",
      "createdAt"
    ]));

    // Show the exact fingerprint key (truncated)
    console.log("Fingerprint:", key.slice(0, 220) + (key.length > 220 ? "..." : ""));
    console.log("—".repeat(60));
  });
})();

