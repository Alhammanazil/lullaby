// Zero-dependency "build": copy only the files the site needs into dist/ for deployment.
const fs = require("fs");
const path = require("path");

const FILES = ["index.html", "styles.css", "app.js", "i18n.js", "favicon.svg"];
const out = path.join(__dirname, "dist");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
console.log(`Built ${FILES.length} files into dist/`);
