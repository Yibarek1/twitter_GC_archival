# Architecture — how the Group Chat Archive works

A short tour of the codebase for anyone reading or extending it. The whole thing
is vanilla JavaScript with two vendored libraries (Fuse.js, Chart.js) and no
build step for the front-end.

## The pipeline

```
 raw X export(s)                 build.js                 the viewer
 ────────────────   ───────────────────────────────   ──────────────────
 direct-messages.js                                    index.html
 direct-messages-group.js  ─►  parse + merge + media ─► data.js  ─► app.js
 direct_messages_media/        resolve + dedupe          (CHAT_DATA)   (renders)
 direct_messages_group_media/                            styles.css
```

For a public/demo run with no real data, `make_sample.js` substitutes for the
left half: it synthesizes `data.sample.js` + `sample_media/` in the same schema.

## Files

| File | Role |
|------|------|
| `build.js` | Node script. Parses **both** full-content export files (`direct-messages.js`, `direct-messages-group.js`), folds **every** `dmConversation` into a per-conversation accumulator, dedupes messages by id, resolves local media by the `{messageId}-…` filename convention, merges optional XChat scrapes, and writes `data.js`. Merge-aware: re-reads the previous `data.js` as a baseline so history accumulates. Detects 1:1 vs group by id shape (`a-b` = DM). |
| `make_sample.js` | Node script. Deterministic synthetic-data generator → `data.sample.js` (2 groups + 1 DM, ~128 messages) plus placeholder SVG media/avatars. Zero real data. |
| `index.html` | App shell + sidebar markup. Loads `data.sample.js` first, then the gitignored `data.js` (overrides if present), then the gitignored `names.local.js` (real-name overrides), then `lib/`, then `app.js`. |
| `app.js` | The entire UI. See "Runtime model" below. |
| `styles.css` | Black + blue theme, CSS variables for accent/density/intensity. |
| `server.js` | Optional static file server with HTTP range support (for video). Not required — the app runs from `file://`. |
| `lib/` | Vendored Fuse.js + Chart.js (MIT — see `CREDITS.md`). |

## Data schema (`window.CHAT_DATA`)

```js
{
  generatedAt,
  conversations: [
    { id, type:"group"|"dm", title, participants:[id], count,
      msgs:  [ { i, s, t, x, u?, m?, k?, r? } ],   // id, sender, time(ms), text,
                                                   //   urls, media-path, kind, reactions
      events:[ { t, type:"name"|"join"|"leave"|"create", ... } ] }
  ]
}
```
The viewer also accepts the legacy single-conversation shape
(`{ conversationId, msgs, events }`) — `normalizeConvos()` wraps it into a
one-element `conversations` array.

## Runtime model (`app.js`)

`app.js` is one IIFE. The key design idea behind multi-conversation support:

- **`CONVOS`** — the full list of conversations (from `CHAT_DATA`).
- **Active-conversation state** — `CONV`, `MSGS`, `EVENTS`, `N`, `LOWER`
  (lowercased text cache), `ID2IDX`, `PARTS` (participants), `GENERIC`
  (`id → "User N"`). These are module-level `let`s that get **reassigned** when
  the conversation changes.
- **`activateConversation(id, rerender)`** — the switch point. It loads the
  conversation's messages into `MSGS`, rebuilds the search indexes
  (`rebuildIndexes()`), drops every derived cache and per-view state
  (`resetDerived()`), recomputes `PARTS`, assigns generic names, and (when
  `rerender`) refreshes the brand, the picker, the sparkline, and the current
  view.

Because all 18 views read from the same module-level `MSGS`/`PARTS`/caches, they
become conversation-scoped "for free" — switching simply swaps the data under
them and forces a re-render. The conversation picker (`renderConvPicker()`) is a
`<select>` in the sidebar, shown only when there is more than one conversation.

Boot happens at the very end of the IIFE (after all `let`s are declared, so
`resetDerived()` doesn't hit a temporal-dead-zone) → `activateConversation()` →
`init()`.

### Names & avatars
The export has only numeric ids. Committed defaults are empty, so people render
as **User 1…N** (`GENERIC`, assigned per-conversation by message rank). Priority
in `nameOf()`: user-saved (`settings.names`, People tab → localStorage) →
`window.LOCAL_NAMES` (gitignored `names.local.js`) → `GENERIC` → `User <id4>`.
Profile pictures work the same way via `window.LOCAL_PFPS` / `PFPS`.

### Views (registered in `setView`)
Search, Timeline (virtualized), Gallery, Pinned, Hall of Fame, Wrapped, Capsule,
Stats, Threads, Moods, Sleep, Emoji DNA, Chains, Firsts, Battles, Quiz, People,
Settings — plus Random Quote and the ⌘K command palette.

### Local data
A small IndexedDB store (`GroupChatArchiveDB`) holds scraped messages merged in
at runtime; everything else (theme, names, bookmarks, saved searches) lives in
`localStorage` under `gca.*` keys.
