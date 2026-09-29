import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { SUPER_EMAIL, auth, db } from "./firebase-config.js";
import { DEFAULT_CONTENT } from "./content.js";
import { submitLead } from "./crm.js";

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function render(content) {
    const stats = document.getElementById("statRow");
    if (stats && content.stats?.length) {
        stats.innerHTML = content.stats
            .map((stat) => `<div class="stat-box"><span class="num">${esc(stat.num)}</span><span class="lbl">${esc(stat.lbl)}</span></div>`)
            .join("");
    }

    const episodes = document.getElementById("epGrid");
    if (episodes && content.episodes?.length) {
        episodes.innerHTML = content.episodes
            .map((episode) => `
        <article class="ep-card">
          <div class="ep-no">${esc(episode.label || "Featured")}</div>
          <h3>${esc(episode.title)}</h3>
          <p>${esc(episode.blurb)}</p>
          ${episode.url ? `<a class="ep-play" href="${esc(episode.url)}" target="_blank" rel="noopener">▸ Listen now</a>` : ""}
        </article>`)
            .join("");
    }

    const topics = document.getElementById("topicList");
    if (topics && content.topics?.length) {
        topics.innerHTML = content.topics.map((topic) => `<li>${esc(topic)}</li>`).join("");
    }

    const events = document.getElementById("eventsList");
    if (events) {
        const rows = content.events?.length
            ? content.events
            : [{ day: "—", mon: "List", title: "The next room is not on sale yet", detail: "Workshops, retreats, and live days are announced here first. Join the list and the studio writes before the public post.", url: "" }];
        events.innerHTML = rows
            .map((event) => `
        <article class="event-row">
          <div class="event-date"><span class="event-day">${esc(event.day || "—")}</span><span class="event-mon">${esc(event.mon || "")}</span></div>
          <div class="event-info"><h3>${esc(event.title)}</h3><p>${esc(event.detail || "")}</p></div>
          ${event.url ? `<a class="btn btn-ghost" href="${esc(event.url)}" target="_blank" rel="noopener">Details</a>` : ""}
        </article>`)
            .join("");
    }

    const stories = document.getElementById("testiGrid");
    if (stories) {
        stories.innerHTML = (content.testimonials || [])
            .filter((item) => item.quote && item.who)
            .map((item) => `<div class="testi-card"><div class="mark">"</div><p class="quote">${esc(item.quote)}</p><div class="who">${esc(item.who)}</div></div>`)
            .join("");
    }

    const guide = content.guide || DEFAULT_CONTENT.guide;
    const title = document.getElementById("guideTitle");
    const sub = document.getElementById("guideSub");
    const body = document.getElementById("guideBody");
    if (title) title.textContent = guide.title;
    if (sub) sub.textContent = guide.subtitle;
    if (body) body.textContent = guide.intro;

    const socials = content.socials || {};
    document.querySelectorAll("[data-social]").forEach((link) => {
        const href = socials[link.dataset.social];
        if (href) {
            link.href = href;
            link.hidden = false;
        } else if (link.dataset.social) {
            link.hidden = true;
        }
    });
}

function formMessage(form) {
    return form.querySelector("[data-msg]");
}

function wireForms() {
    document.querySelectorAll("form[data-crm]").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const msg = formMessage(form);
            const data = Object.fromEntries(new FormData(form).entries());
            if (String(data.company_website || "").trim()) {
                if (msg) msg.textContent = "Received.";
                form.reset();
                return;
            }
            const button = form.querySelector("button, input[type=submit]");
            if (button) button.disabled = true;
            try {
                const type = form.dataset.crm;
                let message = data.story || data.message || data.quote || "";
                if (type === "newsletter") message = "Requested The 10K Month Permission Slip";
                await submitLead({ ...data, type, message });
                const name = data.name ? `, ${data.name}` : "";
                const thanks = {
                    newsletter: "You're on the list. Create a free login with this email to open the guide.",
                    guest: `Thanks${name} — your application is in the studio. I'll be in touch.`,
                    speaking: `Thanks${name} — the speaking request is with the studio.`,
                    mentoring: `Thanks${name} — your 1:1 application is in. Expect a reply within 24 hours.`,
                    event: "You're on the list. You'll hear before the public post.",
                    testimonial: "Received. Nothing goes on the site until you confirm it.",
                };
                if (msg) msg.textContent = thanks[type] || "Received.";
                form.reset();
            } catch (error) {
                if (msg) msg.textContent = error.message || "Something went wrong. Try again.";
            } finally {
                if (button) button.disabled = false;
            }
        });
    });
}

async function watchAccount() {
    const link = document.getElementById("navLogin");
    if (!link) return;
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            link.textContent = "Log in";
            link.href = "login.html";
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
        link.textContent = studio ? "Studio" : "Account";
        link.href = studio ? "admin.html" : "account.html";
    });
}

render(DEFAULT_CONTENT);
wireForms();
watchAccount();

onSnapshot(doc(db, "site", "content"), (snap) => {
    if (snap.exists()) render({ ...DEFAULT_CONTENT, ...snap.data() });
}, () => {
    /* The page already shows the published defaults. */
});
