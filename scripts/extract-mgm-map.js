const fs = require("fs");
const path = require("path");

(async () => {
  const res = await fetch("https://www.mgm.gov.tr/meteouyari/turkiye.aspx", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const match = html.match(/<svg[^>]*id="svg-turkiye-haritasi"[\s\S]*?<\/svg>/);
  if (!match) {
    console.error("SVG bulunamadı");
    process.exit(1);
  }
  const dir = path.join(__dirname, "..", "public", "maps");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "turkiye-meteouyari.svg"), match[0]);
  const meta = [];
  const re = /<g[^>]*\sid="(9\d{4})"[^>]*data-iladi="([^"]+)"/g;
  let m;
  while ((m = re.exec(match[0]))) {
    const id = Number(m[1]);
    const plateFromId = String(Math.floor((id - 90101) / 100) + 1).padStart(2, "0");
    meta.push({ id: m[1], plate: plateFromId, name: m[2] });
  }
  fs.writeFileSync(path.join(dir, "turkiye-iller.json"), JSON.stringify(meta, null, 2));
  console.log("svg bytes", match[0].length, "provinces", meta.length);
})();
