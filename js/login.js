import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { SUPER_EMAIL, auth, db } from "./firebase-config.js";
import { submitLead } from "./crm.js";

const params = new URLSearchParams(location.search);
const next = ["account.html", "admin.html", "index.html"].includes(params.get("next"))
    ? params.get("next")
    : "";

const form = document.getElementById("form");
const msg = document.getElementById("msg");
const nameWrap = document.getElementById("nameWrap");
const toggle = document.getElementById("toggle");
const reset = document.getElementById("reset");
const title = document.getElementById("title");
let mode = "login";
let working = false;

function say(text) {
    msg.textContent = text || "";
}

function destination(user) {
    if (next) return next;
    return user.email === SUPER_EMAIL ? "admin.html" : "account.html";
}

toggle.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    title.textContent = mode === "login" ? "Log in" : "Create your login";
    nameWrap.hidden = mode === "login";
    toggle.textContent = mode === "login" ? "Need a login? Create one" : "Already have a login? Sign in";
    form.querySelector("button").textContent = mode === "login" ? "Enter" : "Create login";
    say("");
});

reset.addEventListener("click", async () => {
    const email = form.email.value.trim();
    if (!email) {
        say("Enter your email first, then ask for the reset link.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        say("Reset link sent. Check that inbox.");
    } catch (error) {
        say(error.message);
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    say("");
    working = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name.value.trim();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
        if (mode === "signup") {
            if (name.length < 2) throw new Error("Add your name.");
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
            await setDoc(doc(db, "users", cred.user.uid), {
                email: cred.user.email,
                name,
                role: "member",
                createdAt: serverTimestamp(),
            });
            await submitLead({
                type: "member",
                email: cred.user.email,
                name,
                message: "Created a free login",
            });
            location.href = destination(cred.user);
            return;
        }
        const cred = await signInWithEmailAndPassword(auth, email, password);
        location.href = destination(cred.user);
    } catch (error) {
        const known = {
            "auth/invalid-credential": "That email and password don't match.",
            "auth/email-already-in-use": "That email already has a login. Sign in instead.",
            "auth/weak-password": "Use at least 8 characters.",
            "auth/invalid-email": "That email doesn't look right.",
        };
        say(known[error.code] || error.message);
        button.disabled = false;
        working = false;
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user || working) return;
    let studio = user.email === SUPER_EMAIL;
    if (!studio) {
        try {
            const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
            studio = (await getDoc(doc(db, "admins", user.uid))).exists();
        } catch {
            studio = false;
        }
    }
    location.href = next || (studio ? "admin.html" : "account.html");
});
