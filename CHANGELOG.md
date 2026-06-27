# Changelog

All notable changes to this project are recorded here.

## v0.1.0 (2026-06-27)

First public release.

### Added

- Offline viewer for Twitter/X group DM exports. Vanilla JavaScript, runs
  straight from `file://` by double-clicking `index.html`.
- Fuzzy search (Fuse.js) with `has:media`, `has:links`, `from:`, `before:`,
  `after:`, quoted exact phrases, sorting, list/grid views, saved searches, and
  CSV/JSON export.
- Multiple group chats with a conversation picker; every view is scoped to the
  selected group.
- Virtual timeline that scrolls 100K+ messages, with jump-to-date.
- Media gallery with a lightbox, Hall of Fame, Wrapped year-in-review, Stats,
  Threads, Chains, Battles, Time Capsule, Random Quote, and a command palette.
- Black and blue theme with customizable accent and density, saved to
  `localStorage`.
- First-run setup wizard (served) that builds your archive, restores the group
  photo, and walks you through naming everyone.
- Synthetic demo data (`data.sample.js`) so the repository runs with no real
  data committed.

[v0.1.0]: https://github.com/yib7/twitter_GC_archival/releases/tag/v0.1.0
