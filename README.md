# 💬 Group Chat Archive

A **dependency-free, fully offline** browser for Twitter/X Direct Message
exports — both **group chats and 1:1 DMs**. Drop in your export, run one build
script, and explore years of conversation history with fuzzy search, a virtual
timeline, a media gallery, year-in-review "Wrapped" slideshows, leaderboards,
quizzes, and 18 views in all — no server, no API keys, no internet.

> **The repo ships with synthetic demo data.** No real messages, names, or media
> are committed. Open `index.html` and you'll see a runnable demo built from
> `data.sample.js`. Point it at your own export to see your real history (kept
> local and `.gitignore`d).

---

## ✨ Features

- **🔎 Fuzzy search** (Fuse.js) with filters: `has:media`, `has:links`,
  `from:name`, `before:/after:YYYY-MM-DD`, exact `"quoted phrases"`, sorting,
  list/grid views, saved searches, and CSV/JSON export.
- **🗂 Multi-conversation** — a conversation picker switches between every group
  and 1:1 DM in your export. Every view is scoped to the selected conversation.
- **≡ Virtual timeline** — scrolls 100K+ messages smoothly with a date scrubber
  and jump-to-date.
- **🖼 Gallery** of every photo & video, with a lightbox.
- **🏆 Hall of Fame** — most-reacted messages, podium + leaderboards by year.
- **🎁 Wrapped** — animated year-in-review slideshows.
- **▤ Stats** — per-person activity, word clouds, milestones, busiest hours.
- **🧵 Threads · 💫 Moods · 🌙 Sleep · 🎭 Emoji DNA · ⛓ Chains · 🌅 Firsts** —
  playful analytics over the chat.
- **⚔ Battles · 🧠 Quiz · 🎲 Random Quote** — fun & games.
- **★ Bookmarks**, **⌘K command palette**, **Time Capsule** ("on this day"),
  context-peek, and quote-card PNG export.
- **🎨 Theming** — black + blue, customizable accent, density, and theme shuffle;
  all preferences saved to `localStorage`.

Everything runs from `file://` — just double-click `index.html`. An optional
`server.js` is included only if your browser blocks local video over `file://`.

---

## 🚀 Quick start (demo, zero real data)

```bash
git clone <this-repo>
cd twitter_project
# open the demo straight away:
#   double-click index.html
# or, if your browser blocks local media over file://:
node server.js      # → http://localhost:8765
```

You'll get a 3-conversation synthetic demo (two group chats + one 1:1 DM).

Regenerate the demo data anytime:

```bash
node make_sample.js     # writes data.sample.js + sample_media/
```

---

## 📥 Using your own export

1. Request your archive from X (**Settings → Your account → Download an archive
   of your data**) and unzip it.
2. From the unzipped `data/` folder, copy any of these into a new `exports/`
   folder here (only what you have is needed):
   - `direct-messages.js` — 1:1 DM conversations (full content)
   - `direct-messages-group.js` — group DM conversations (full content)
   - `direct_messages_media/` — 1:1 DM media
   - `direct_messages_group_media/` — group DM media
   - *(the `*-headers.js` files are metadata-only and are ignored)*
3. Build:

   ```bash
   node build.js
   ```

   `build.js` parses **both** full-content files, emits an index of **every**
   conversation it finds (deduped by message id, media resolved by filename),
   and writes `data.js`. Re-run it any time you add a newer export — history is
   merged, never lost.
4. Open `index.html`. Your real `data.js`, `names.local.js`, media folders, and
   raw exports are all **git-ignored** — they never leave your machine.

### Naming participants

X exports contain only numeric user IDs, so everyone shows as **User 1, User 2,
…** by default. Rename people (and pick colors) in the **People** tab — saved to
`localStorage`. For a permanent local mapping, create a `names.local.js`
(git-ignored) that sets `window.LOCAL_NAMES` / `window.LOCAL_PFPS`.

---

## 📡 Live capture (optional)

X migrated DMs to the encrypted **XChat** UI, and encrypted messages aren't in
data exports. A Tampermonkey userscript (`scraper.user.js`, documented in
[`SCRAPER.md`](SCRAPER.md)) can capture new messages live; `build.js` merges
scraped JSON dropped into `exports/`.

---

## 🗃 Data schema

`data.js` / `data.sample.js` define one global:

```js
window.CHAT_DATA = {
  generatedAt: "ISO",
  conversations: [
    {
      id, type: "group" | "dm", title, participants: [ids], count,
      msgs:  [ { i, s, t, x, u?, m?, k?, r? } ],   // id, sender, time(ms), text, urls, media, kind, reactions
      events:[ { t, type, ... } ]                  // name/join/leave/create
    },
    ...
  ]
}
```

The viewer also accepts the older single-conversation shape
(`{ conversationId, msgs, events }`) for backward compatibility.

---

## 🧱 Project layout

```
index.html        app shell + script loading
app.js            all UI logic (vanilla JS, no framework)
styles.css        black + blue theme
build.js          exports → data.js  (multi-conversation, merge-aware)
make_sample.js    synthetic demo generator → data.sample.js + sample_media/
server.js         optional static server (range requests for video)
lib/              Fuse.js, Chart.js (vendored, MIT — see CREDITS.md)
data.sample.js    committed synthetic demo data
sample_media/     committed placeholder media
```

---

## 🔒 Privacy

This repository is designed to be published **without** any private data. Real
messages, media, profile pictures, names, and packaged archives are listed in
[`.gitignore`](.gitignore). The only data committed is the fully synthetic
sample. See [`CREDITS.md`](CREDITS.md) for third-party licenses.
