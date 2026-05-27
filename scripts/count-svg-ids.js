const fs = require("fs");
const s = fs.readFileSync("public/maps/turkiye-meteouyari.svg", "utf8");
const ids = [...s.matchAll(/<g[^>]*\sid="(9\d{4})"/g)].map((m) => m[1]);
console.log("count", ids.length, "unique", new Set(ids).size);
const missing = [];
for (let i = 0; i < 81; i++) {
  const id = String(90101 + i * 100);
  if (!ids.includes(id)) missing.push(id);
}
console.log("missing", missing.length);
