import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

const TYPES = new Set(["newsletter", "guest", "speaking", "mentoring", "event", "testimonial", "member", "contact"]);

export async function submitLead(fields) {
  const type = String(fields.type || "").trim();
  const email = String(fields.email || "").trim().toLowerCase();
  if (!TYPES.has(type)) throw new Error("Unknown lead type");
  if (!email || !email.includes("@")) throw new Error("A real email is required");

  const name = String(fields.name || "").trim().slice(0, 200);
  const message = String(fields.message || "").trim().slice(0, 4000);
  const details = {};
  const skip = new Set(["type", "email", "name", "message", "company_website"]);
  Object.entries(fields).forEach(([key, value]) => {
    if (skip.has(key)) return;
    const text = String(value || "").trim();
    if (text) details[key] = text.slice(0, 2000);
  });

  await addDoc(collection(db, "leads"), {
    type,
    email,
    name,
    message,
    details,
    status: "new",
    source: location.pathname || "/",
    notes: [],
    createdAt: serverTimestamp(),
  });
}
