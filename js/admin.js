import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { createUserWithEmailAndPassword, signOut as makerSignOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { SUPER_EMAIL, auth, db, memberMakerAuth } from "./firebase-config.js";
import { DEFAULT_CONTENT, LEAD_STATUSES, LEAD_TYPES, mergeContent } from "./content.js";

const appEl = document.getElementById("app");
let tab = "pipeline";
let leads = [];
let members = [];
let draft = structuredClone(DEFAULT_CONTENT);
let filter = "all";
let openId = "";
let user = null;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function when(stamp) {
  if (!stamp) return "";
  const date = stamp.toDate ? stamp.toDate() : new Date(stamp);
  return date.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function render() {
  if (tab === "pipeline") renderPipeline();
  else if (tab === "members") renderMembers();
  else renderSite();
}

function renderPipeline() {
  const counts = LEAD_STATUSES.map((status) => {
    const count = leads.filter((lead) => lead.status === status).length;
    return `<button type="button" class="chip ${filter === status ? "on" : ""}" data-filter="${status}">${esc(status)} <b>${count}</b></button>`;
  }).join("");
  const rows = leads.filter((lead) => filter === "all" || lead.status === filter);
  appEl.innerHTML = `
    <div class="chips">
      <button type="button" class="chip ${filter === "all" ? "on" : ""}" data-filter="all">All <b>${leads.length}</b></button>
      ${counts}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>When</th><th>Type</th><th>Name</th><th>Email</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map((lead) => `
            <tr data-open="${esc(lead.id)}" class="${openId === lead.id ? "open" : ""}">
              <td>${esc(when(lead.createdAt))}</td>
              <td>${esc(LEAD_TYPES[lead.type] || lead.type)}</td>
              <td>${esc(lead.name || "—")}</td>
              <td>${esc(lead.email)}</td>
              <td><span class="status ${esc(lead.status)}">${esc(lead.status)}</span></td>
            </tr>
            ${openId === lead.id ? `<tr class="detail"><td colspan="5">${detail(lead)}</td></tr>` : ""}
          `).join("") || `<tr><td colspan="5">No one in this lane yet.</td></tr>`}
        </tbody>
      </table>
    </div>`;

  appEl.querySelectorAll("[data-filter]").forEach((button) => {
    button.onclick = () => {
      filter = button.dataset.filter;
      render();
    };
  });
  appEl.querySelectorAll("[data-open]").forEach((row) => {
    row.onclick = () => {
      openId = openId === row.dataset.open ? "" : row.dataset.open;
      render();
    };
  });
  const save = appEl.querySelector("[data-save-lead]");
  if (save) save.onclick = saveLead;
  const remove = appEl.querySelector("[data-delete-lead]");
  if (remove) remove.onclick = deleteLead;
}

function detail(lead) {
  const extras = Object.entries(lead.details || {})
    .map(([key, value]) => `<p><span>${esc(key)}</span> ${esc(value)}</p>`)
    .join("");
  const notes = (lead.notes || []).map((note) => `<li>${esc(note.text)}</li>`).join("");
  return `
    <div class="detail-card">
      <p>${esc(lead.message || "No message.")}</p>
      ${extras}
      ${notes ? `<ul>${notes}</ul>` : ""}
      <label>Status
        <select id="leadStatus">${LEAD_STATUSES.map((status) => `<option ${status === lead.status ? "selected" : ""}>${esc(status)}</option>`).join("")}</select>
      </label>
      <label>Add a note
        <textarea id="leadNote" rows="3" placeholder="What happened, and what's next"></textarea>
      </label>
      <div class="row">
        <button type="button" data-save-lead="${esc(lead.id)}">Save</button>
        <button type="button" class="ghost" data-delete-lead="${esc(lead.id)}">Delete</button>
      </div>
    </div>`;
}

async function saveLead(event) {
  const id = event.currentTarget.dataset.saveLead;
  const lead = leads.find((item) => item.id === id);
  const note = document.getElementById("leadNote").value.trim();
  const notes = [...(lead.notes || [])];
  if (note) notes.push({ text: note, at: new Date().toISOString() });
  await updateDoc(doc(db, "leads", id), {
    status: document.getElementById("leadStatus").value,
    notes,
  });
}

async function deleteLead(event) {
  const id = event.currentTarget.dataset.deleteLead;
  if (!confirm("Delete this lead?")) return;
  openId = "";
  await deleteDoc(doc(db, "leads", id));
}

function renderMembers() {
  appEl.innerHTML = `
    <form id="memberForm" class="card">
      <h2>Create a member login</h2>
      <div class="grid">
        <label>Name<input name="name" required></label>
        <label>Email<input name="email" type="email" required></label>
        <label>Password<input name="password" type="password" minlength="8" required></label>
      </div>
      <button type="submit">Create login</button>
      <p id="memberMsg"></p>
    </form>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>
          ${members.map((member) => `<tr><td>${esc(member.name || "—")}</td><td>${esc(member.email)}</td><td>${esc(member.role)}</td></tr>`).join("") || `<tr><td colspan="3">No member profiles yet.</td></tr>`}
        </tbody>
      </table>
    </div>`;
  document.getElementById("memberForm").onsubmit = createMember;
}

async function createMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById("memberMsg");
  msg.textContent = "Creating…";
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  try {
    const maker = memberMakerAuth();
    const cred = await createUserWithEmailAndPassword(maker, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      email: cred.user.email,
      name,
      role: "member",
      createdAt: serverTimestamp(),
    });
    await makerSignOut(maker);
    form.reset();
    msg.textContent = `Login created for ${email}.`;
  } catch (error) {
    msg.textContent = error.message;
  }
}

function field(label, value, path) {
  return `<label>${esc(label)}<input data-path="${esc(path)}" value="${esc(value)}"></label>`;
}

function renderSite() {
  const guide = draft.guide || DEFAULT_CONTENT.guide;
  appEl.innerHTML = `
    <form id="siteForm">
      <section class="card">
        <h2>Stats</h2>
        <div class="grid">
          ${draft.stats.map((stat, index) => `${field("Number", stat.num, `stats.${index}.num`)}${field("Label", stat.lbl, `stats.${index}.lbl`)}`).join("")}
        </div>
      </section>
      <section class="card">
        <h2>Links</h2>
        <div class="grid">
          ${field("Instagram", draft.socials.instagram || "", "socials.instagram")}
          ${field("Show Instagram", draft.socials.instagramPodcast || "", "socials.instagramPodcast")}
          ${field("YouTube", draft.socials.youtube || "", "socials.youtube")}
          ${field("Spotify", draft.socials.spotify || "", "socials.spotify")}
          ${field("Apple Podcasts", draft.socials.apple || "", "socials.apple")}
          ${field("Facebook", draft.socials.facebook || "", "socials.facebook")}
          ${field("TikTok", draft.socials.tiktok || "", "socials.tiktok")}
          ${field("LinkedIn", draft.socials.linkedin || "", "socials.linkedin")}
        </div>
      </section>
      <section class="card">
        <h2>Featured episodes</h2>
        ${draft.episodes.map((episode, index) => `
          <div class="block">
            ${field("Label", episode.label, `episodes.${index}.label`)}
            ${field("Title", episode.title, `episodes.${index}.title`)}
            <label>Blurb<textarea data-path="episodes.${index}.blurb" rows="3">${esc(episode.blurb)}</textarea></label>
            ${field("URL", episode.url, `episodes.${index}.url`)}
            <button type="button" class="ghost" data-remove="episodes.${index}">Remove</button>
          </div>`).join("")}
        <button type="button" class="ghost" id="addEpisode">Add episode</button>
      </section>
      <section class="card">
        <h2>Events</h2>
        ${(draft.events || []).map((event, index) => `
          <div class="block">
            <div class="grid">
              ${field("Day", event.day, `events.${index}.day`)}
              ${field("Month", event.mon, `events.${index}.mon`)}
              ${field("Title", event.title, `events.${index}.title`)}
              ${field("Link", event.url, `events.${index}.url`)}
            </div>
            <label>Detail<textarea data-path="events.${index}.detail" rows="2">${esc(event.detail)}</textarea></label>
            <button type="button" class="ghost" data-remove="events.${index}">Remove</button>
          </div>`).join("") || `<p class="quiet">No public dates yet. The site shows the waitlist.</p>`}
        <button type="button" class="ghost" id="addEvent">Add event</button>
      </section>
      <section class="card">
        <h2>Published client stories</h2>
        <p class="quiet">Only publish a line after the client has confirmed it. Incoming stories stay in the pipeline until then.</p>
        ${(draft.testimonials || []).map((item, index) => `
          <div class="block">
            <label>Quote<textarea data-path="testimonials.${index}.quote" rows="3">${esc(item.quote)}</textarea></label>
            ${field("Name and role", item.who, `testimonials.${index}.who`)}
            <button type="button" class="ghost" data-remove="testimonials.${index}">Remove</button>
          </div>`).join("")}
        <button type="button" class="ghost" id="addStory">Add story</button>
      </section>
      <section class="card">
        <h2>Speaking topics</h2>
        ${draft.topics.map((topic, index) => field(`Topic ${index + 1}`, topic, `topics.${index}`)).join("")}
      </section>
      <section class="card">
        <h2>The guide</h2>
        ${field("Title", guide.title, "guide.title")}
        ${field("Subtitle", guide.subtitle, "guide.subtitle")}
        <label>Intro<textarea data-path="guide.intro" rows="4">${esc(guide.intro)}</textarea></label>
        ${(guide.sections || []).map((section, index) => `
          <div class="block">
            ${field("Step", section.title, `guide.sections.${index}.title`)}
            <label>Body<textarea data-path="guide.sections.${index}.body" rows="3">${esc(section.body)}</textarea></label>
          </div>`).join("")}
      </section>
      <button type="submit">Publish to the site</button>
      <p id="siteMsg"></p>
    </form>`;

  document.getElementById("siteForm").onsubmit = saveSite;
  document.getElementById("addEpisode").onclick = () => {
    readSiteForm();
    draft.episodes.push({ label: "Featured", title: "", blurb: "", url: "" });
    render();
  };
  document.getElementById("addEvent").onclick = () => {
    readSiteForm();
    draft.events.push({ day: "", mon: "", title: "", detail: "", url: "" });
    render();
  };
  document.getElementById("addStory").onclick = () => {
    readSiteForm();
    draft.testimonials.push({ quote: "", who: "" });
    render();
  };
  appEl.querySelectorAll("[data-remove]").forEach((button) => {
    button.onclick = () => {
      readSiteForm();
      const [list, index] = button.dataset.remove.split(".");
      draft[list].splice(Number(index), 1);
      render();
    };
  });
}

function setPath(object, path, value) {
  const parts = path.split(".");
  let cursor = object;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = Number.isNaN(Number(parts[i])) ? parts[i] : Number(parts[i]);
    cursor = cursor[key];
  }
  const last = parts[parts.length - 1];
  cursor[Number.isNaN(Number(last)) ? last : Number(last)] = value;
}

function readSiteForm() {
  appEl.querySelectorAll("[data-path]").forEach((input) => {
    setPath(draft, input.dataset.path, input.value);
  });
}

async function saveSite(event) {
  event.preventDefault();
  readSiteForm();
  const msg = document.getElementById("siteMsg");
  msg.textContent = "Publishing…";
  try {
    await setDoc(doc(db, "site", "content"), { ...draft, updatedAt: serverTimestamp() }, { merge: true });
    msg.textContent = "Live on the site.";
  } catch (error) {
    msg.textContent = error.message;
  }
}

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.onclick = () => {
    if (tab === "site") readSiteForm();
    tab = button.dataset.tab;
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("on", item === button));
    render();
  };
});

document.getElementById("signOut").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

onAuthStateChanged(auth, async (next) => {
  user = next;
  if (!user) {
    location.href = "login.html?next=admin.html";
    return;
  }
  let allowed = user.email === SUPER_EMAIL;
  if (!allowed) {
    try {
      allowed = (await getDoc(doc(db, "admins", user.uid))).exists();
    } catch {
      allowed = false;
    }
  }
  if (!allowed) {
    location.href = "account.html";
    return;
  }
  await setDoc(doc(db, "admins", user.uid), {
    email: user.email,
    role: "superadmin",
    createdAt: serverTimestamp(),
  }, { merge: true });
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    name: user.displayName || "Studio",
    role: "superadmin",
  }, { merge: true });

  document.getElementById("who").textContent = user.email;
  document.getElementById("shell").hidden = false;
  document.getElementById("boot").hidden = true;

  onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (snap) => {
    leads = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    if (tab === "pipeline") render();
  }, (error) => {
    appEl.innerHTML = `<p>${esc(error.message)}</p>`;
  });
  onSnapshot(collection(db, "users"), (snap) => {
    members = snap.docs.map((item) => item.data()).sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    if (tab === "members") render();
  });
  onSnapshot(doc(db, "site", "content"), (snap) => {
    if (snap.exists() && tab !== "site") {
      draft = mergeContent(snap.data());
    } else if (snap.exists() && !appEl.innerHTML) {
      draft = mergeContent(snap.data());
    }
    if (!appEl.innerHTML) render();
  });
});
