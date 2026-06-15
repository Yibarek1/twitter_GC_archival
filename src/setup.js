/* setup.js — first-run wizard logic. Talks to the local server's /api/*. */
(function () {
"use strict";

const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#10b981", "#f97316", "#a855f7", "#14b8a6", "#eab308"];
function hashId(id) { id = String(id); let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; }
const colorOf = (id) => PALETTE[hashId(id) % PALETTE.length];
function initials(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
function fileToDataURL(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }

// Collected config, sent to /api/identity on finish.
const state = { gcName: "", gcPhoto: null, me: null, names: {}, pfps: {} };
let PARTS = [];
let built = false;
let step = 1;

/* ---- step navigation ----------------------------------------------------- */
function go(n) {
  step = n;
  $$(".setup-pane").forEach((p) => { const on = +p.dataset.pane === n; p.classList.toggle("active", on); p.hidden = !on; });
  $$("#steps li").forEach((li) => {
    const s = +li.dataset.step;
    li.classList.toggle("active", s === n);
    li.classList.toggle("done", s < n);
  });
  if (n === 3) loadParts();
}
$$("[data-next]").forEach((b) => b.onclick = () => {
  if (step === 1 && !built) { flash($("#src-result"), "Build the archive before continuing.", "err"); return; }
  go(Math.min(4, step + 1));
});
$$("[data-back]").forEach((b) => b.onclick = () => go(Math.max(1, step - 1)));

function flash(host, html, cls) { host.hidden = false; host.className = "setup-result " + (cls || ""); host.innerHTML = html; }

// The wizard needs the Node server (writing files / copying media / native
// dialogs all require it). Opened as a file://, every fetch fails with the
// cryptic "Failed to fetch" — so detect that and say exactly what to do.
const SERVED = location.protocol === "http:" || location.protocol === "https:";
function needServer(host) {
  flash(host,
    "This page is open as a <b>local file</b>, but the setup wizard must run " +
    "<b>through the local server</b>. Start it and reopen this page there:" +
    "<br><br>1. <code>node scripts/server.js</code>" +
    "<br>2. open <code>http://localhost:8765/setup.html</code>", "err");
}
if (!SERVED) needServer($("#src-result"));

/* ---- step 1: native pickers + build -------------------------------------- */
async function pick(kind, fill) {
  if (!SERVED) { needServer($("#src-result")); return; }
  flash($("#src-result"), "Opening the file browser… (check for a dialog window)", "");
  try {
    const r = await fetch("/api/pick-" + kind);
    const j = await r.json();
    if (!j.supported) { flash($("#src-result"), "The native file browser is only available on Windows — please paste the path instead.", "err"); return; }
    if (!j.path) { $("#src-result").hidden = true; return; }   // cancelled
    fill(j.path);
    $("#src-result").hidden = true;
  } catch (e) {
    flash($("#src-result"), "✗ " + e.message + " — is the server running? (node scripts/server.js)", "err");
  }
}
$("#src-browse").onclick = () => pick("file", (p) => { $("#src-js").value = p.split("|").join("\n"); });
$("#media-browse").onclick = () => pick("folder", (p) => { $("#src-media").value = p; });

$("#btn-build").onclick = async () => {
  if (!SERVED) { needServer($("#src-result")); return; }
  const sourceJs = $("#src-js").value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const mediaDir = $("#src-media").value.trim();
  if (!sourceJs.length) { flash($("#src-result"), "Choose at least one source .js file.", "err"); return; }
  if (!mediaDir) { flash($("#src-result"), "Choose your media folder — it's required.", "err"); return; }
  flash($("#src-result"), "Building… (copying media can take a moment)", "");
  try {
    const r = await fetch("/api/source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceJs, mediaDir }) });
    const j = await r.json();
    if (!r.ok) { flash($("#src-result"), "✗ " + (j.error || "Build failed"), "err"); return; }
    built = true;
    const groups = (j.groups || []).map((g) => `<li>${escapeHtml(g.title || "Group " + String(g.id).slice(-4))} — ${g.count.toLocaleString()} messages</li>`).join("");
    flash($("#src-result"),
      `✓ Built <b>${j.totalMsgs.toLocaleString()}</b> messages across <b>${(j.groups || []).length}</b> group(s)` +
      (j.mediaCopied ? `, copied <b>${j.mediaCopied.toLocaleString()}</b> media files` : "") +
      `.<ul>${groups}</ul>`, "ok");
    go(2);
  } catch (e) {
    flash($("#src-result"), "✗ " + e.message + " — is the server running? (node scripts/server.js)", "err");
  }
};

/* ---- step 2: group photo ------------------------------------------------- */
$("#gc-name").oninput = (e) => { state.gcName = e.target.value; };
$("#gc-pick").onclick = () => $("#gc-photo").click();
$("#gc-photo").onchange = async (e) => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  state.gcPhoto = await fileToDataURL(f);
  const pv = $("#gc-preview"); pv.textContent = ""; pv.style.backgroundImage = `url('${state.gcPhoto}')`;
};

/* ---- step 3: people ------------------------------------------------------ */
async function loadParts() {
  const host = $("#people");
  if (PARTS.length) return;
  host.innerHTML = `<div class="setup-result">Loading participants…</div>`;
  try {
    const r = await fetch("/api/parts");
    const j = await r.json();
    if (!r.ok) { host.innerHTML = `<div class="setup-result err">✗ ${escapeHtml(j.error || "Could not load participants")}</div>`; return; }
    PARTS = j.parts || [];
    host.innerHTML = "";
    PARTS.forEach((p) => host.appendChild(personCard(p)));
  } catch (e) {
    host.innerHTML = `<div class="setup-result err">✗ ${escapeHtml(e.message)}</div>`;
  }
}

function personCard(p) {
  const card = document.createElement("div"); card.className = "su-person";

  const left = document.createElement("div"); left.className = "su-left";
  const av = document.createElement("div"); av.className = "su-av";
  av.style.background = colorOf(p.id); av.textContent = initials("User " + String(p.id).slice(-4));
  const file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; file.style.display = "none";
  const pick = document.createElement("button"); pick.className = "btn ghost su-pick"; pick.textContent = "Add photo";
  pick.onclick = () => file.click();
  file.onchange = async () => {
    const f = file.files && file.files[0]; if (!f) return;
    const url = await fileToDataURL(f);
    state.pfps[p.id] = url;
    av.textContent = ""; av.style.backgroundImage = `url('${url}')`; av.style.backgroundSize = "cover"; av.style.backgroundPosition = "center";
    pick.textContent = "Change photo";
  };
  left.appendChild(av); left.appendChild(pick); left.appendChild(file);
  card.appendChild(left);

  const main = document.createElement("div");
  const name = document.createElement("input");
  name.className = "setup-input su-name"; name.type = "text"; name.placeholder = "User " + String(p.id).slice(-4);
  name.oninput = () => { const v = name.value.trim(); if (v) { state.names[p.id] = v; av.dataset.named = "1"; if (!state.pfps[p.id]) av.textContent = initials(v); } else { delete state.names[p.id]; if (!state.pfps[p.id]) av.textContent = initials("User " + String(p.id).slice(-4)); } };
  main.appendChild(name);

  const meta = document.createElement("div"); meta.className = "su-meta";
  meta.innerHTML = `${p.count.toLocaleString()} messages · id ${escapeHtml(String(p.id))}`;
  main.appendChild(meta);

  const me = document.createElement("label"); me.className = "su-me";
  const radio = document.createElement("input"); radio.type = "radio"; radio.name = "su-me"; radio.value = p.id;
  radio.onchange = () => { if (radio.checked) state.me = p.id; };
  me.appendChild(radio); me.appendChild(document.createTextNode(" This is YOU"));
  main.appendChild(me);

  if (p.samples && p.samples.length) {
    const sw = document.createElement("div"); sw.className = "su-samples";
    p.samples.forEach((s) => { const d = document.createElement("div"); d.className = "su-sample"; d.textContent = s; sw.appendChild(d); });
    main.appendChild(sw);
  }
  if (p.media && p.media.length) {
    const mw = document.createElement("div"); mw.className = "su-media";
    p.media.forEach((it) => {
      if (it.k === "vid") { const v = document.createElement("video"); v.className = "su-thumb"; v.src = it.m; v.muted = true; v.preload = "metadata"; mw.appendChild(v); }
      else { const img = document.createElement("img"); img.className = "su-thumb"; img.src = it.m; img.loading = "lazy"; img.alt = ""; mw.appendChild(img); }
    });
    main.appendChild(mw);
  }
  card.appendChild(main);
  return card;
}

/* ---- step 4: save -------------------------------------------------------- */
$("#btn-save").onclick = async () => {
  flash($("#finish-result"), "Saving…", "");
  try {
    const r = await fetch("/api/identity", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ me: state.me, gcName: state.gcName, gcPhoto: state.gcPhoto, names: state.names, pfps: state.pfps }),
    });
    const j = await r.json();
    if (!r.ok) { flash($("#finish-result"), "✗ " + (j.error || "Save failed"), "err"); return; }
    flash($("#finish-result"),
      `✓ Saved <b>${j.names}</b> name(s) and <b>${j.pfps}</b> photo(s). ` +
      `<a href="index.html">Open your archive →</a>`, "ok");
  } catch (e) {
    flash($("#finish-result"), "✗ " + e.message, "err");
  }
};

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

go(1);
})();
