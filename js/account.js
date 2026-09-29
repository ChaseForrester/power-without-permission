import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { SUPER_EMAIL, auth, db } from "./firebase-config.js";
import { DEFAULT_CONTENT, LEAD_TYPES } from "./content.js";

const gate = document.getElementById("gate");
const app = document.getElementById("app");

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderGuide(guide) {
    const sheet = guide || DEFAULT_CONTENT.guide;
    return `
    <p class="kicker">Your guide</p>
    <h2>${esc(sheet.title)}</h2>
    <p class="sub">${esc(sheet.subtitle)}</p>
    <p>${esc(sheet.intro)}</p>
    <ol class="sheet">
      ${(sheet.sections || []).map((section) => `<li><strong>${esc(section.title)}</strong><span>${esc(section.body)}</span></li>`).join("")}
    </ol>`;
}

function renderLeads(leads) {
    if (!leads.length) {
        return `<p class="quiet">Nothing with this email is in the studio yet. Apply from the site and it will show up here.</p>`;
    }
    return `<ul class="lead-list">${leads
        .map((lead) => `<li><span>${esc(LEAD_TYPES[lead.type] || lead.type)}</span><strong>${esc(lead.status)}</strong><em>${esc(lead.message || lead.name || "")}</em></li>`)
        .join("")}</ul>`;
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "login.html?next=account.html";
        return;
    }
    let studio = user.email === SUPER_EMAIL;
    if (!studio) {
        try {
            studio = (await getDoc(doc(db, "admins", user.uid))).exists();
        } catch {
            studio = false;
        }
    }
    if (studio) {
        location.href = "admin.html";
        return;
    }

    const profileRef = doc(db, "users", user.uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
        await setDoc(profileRef, {
            email: user.email,
            name: user.displayName || "",
            role: "member",
            createdAt: serverTimestamp(),
        });
    }
    const profile = (await getDoc(profileRef)).data() || {};
    gate.hidden = true;
    app.hidden = false;
    document.getElementById("hello").textContent = profile.name || user.displayName || user.email;
    document.getElementById("emailLine").textContent = user.email;

    onSnapshot(doc(db, "site", "content"), (snap) => {
        const content = snap.exists() ? { ...DEFAULT_CONTENT, ...snap.data() } : DEFAULT_CONTENT;
        document.getElementById("guide").innerHTML = renderGuide(content.guide);
    });

    const leadsQuery = query(collection(db, "leads"), where("email", "==", user.email.toLowerCase()));
    onSnapshot(leadsQuery, (snap) => {
        const leads = snap.docs.map((item) => item.data());
        document.getElementById("mine").innerHTML = renderLeads(leads);
    }, () => {
        document.getElementById("mine").textContent = "Your studio notes will appear once a form is in.";
    });
});

document.getElementById("signOut").addEventListener("click", async () => {
    await signOut(auth);
    location.href = "index.html";
});
