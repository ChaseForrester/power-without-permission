import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4-n0uDvWw0hbBisULPvl7YOVJyILOLBg",
  authDomain: "power-without-permission-pwp.firebaseapp.com",
  projectId: "power-without-permission-pwp",
  storageBucket: "power-without-permission-pwp.firebasestorage.app",
  messagingSenderId: "789967275428",
  appId: "1:789967275428:web:776d594280a31b8529ed31",
};

export const SUPER_EMAIL = "stormychaseforrester@gmail.com";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let secondaryAuth = null;
export function memberMakerAuth() {
  if (!secondaryAuth) {
    const secondary = initializeApp(firebaseConfig, "member-maker");
    secondaryAuth = getAuth(secondary);
  }
  return secondaryAuth;
}
