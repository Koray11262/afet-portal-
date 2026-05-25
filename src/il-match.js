function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchIl(input, iller) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const key = normalizeKey(raw);
  for (const il of iller) {
    if (il === raw) return il;
    if (normalizeKey(il) === key) return il;
  }

  const starts = iller.filter((il) => normalizeKey(il).startsWith(key));
  if (starts.length === 1) return starts[0];

  return null;
}

module.exports = { matchIl, normalizeKey };
