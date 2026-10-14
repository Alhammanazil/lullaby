// Tiny zero-dependency static server for local preview: `npm start` then open http://localhost:5180
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 5180;
const ROOT = __dirname;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json",
};
const PUBLIC = new Set(["index.html", "styles.css", "app.js", "i18n.js", "favicon.svg"]);

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const name = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  if (!PUBLIC.has(name)) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
  fs.readFile(path.join(ROOT, name), (err, data) => {
    if (err) { res.writeHead(500); return res.end("Server error"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(name)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}).on("error", (e) => { console.error(e.code === "EADDRINUSE" ? `Port ${PORT} is busy. Try: PORT=5190 npm start` : e.message); process.exit(1); })
  .listen(PORT, () => console.log(`The Power of Sleep guide running at http://localhost:${PORT}`));
