# Credits

This project is dependency-free at runtime except for two vendored MIT-licensed
libraries, bundled under `lib/` so the archive works fully offline (no CDN, no
network):

| Library | Purpose | License | Project |
|---------|---------|---------|---------|
| **Fuse.js** | Fuzzy full-text search across messages | MIT | https://www.fusejs.io/ |
| **Chart.js** | Charts in the Stats / Timeline views | MIT | https://www.chartjs.org/ |

Both are used unmodified. All other code (`src/app.js`, `src/setup.js`,
`src/styles.css`, `src/setup.css`, `scripts/build.js`, `scripts/make_sample.js`,
`scripts/server.js`, `index.html`, `setup.html`) is original to this project.

The bundled emoji/glyphs are standard Unicode characters rendered by the
operating system's own fonts — no icon library is shipped.
