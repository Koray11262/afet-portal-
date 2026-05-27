const fs = require("fs");
const path = require("path");

const MGM_API = "https://servis.mgm.gov.tr/web/meteoalarm";
const MGM_REFERER = "https://www.mgm.gov.tr/meteouyari/turkiye.aspx";
const CACHE_MS = 10 * 60 * 1000;

const LEVEL_COLORS = {
  0: "#1DCE7D",
  1: "#f7f739",
  2: "#FFC757",
  3: "#F94B65",
};

const LEVEL_LABELS = {
  0: "Tehlike yok",
  1: "Sarı (Az tehlikeli)",
  2: "Turuncu (Tehlikeli)",
  3: "Kırmızı (Çok tehlikeli)",
};

const HADISE_LABELS = {
  cold: "Soğuk",
  hot: "Sıcak",
  fog: "Sis",
  agricultural: "Zirai Don",
  ice: "Buzlanma ve Don",
  dust: "Toz Taşınımı",
  snowmelt: "Kar Erimesi",
  avalanche: "Çığ",
  snow: "Kar",
  thunderstorm: "Gökgürültülü Sağanak Yağış",
  wind: "Rüzgar",
  rain: "Yağmur",
};

let cache = { at: 0, data: {} };
let provinceMeta = null;

function loadProvinceMeta() {
  if (provinceMeta) return provinceMeta;
  const file = path.join(__dirname, "..", "public", "maps", "turkiye-iller.json");
  if (fs.existsSync(file)) {
    provinceMeta = JSON.parse(fs.readFileSync(file, "utf8"));
    return provinceMeta;
  }
  provinceMeta = [];
  for (let i = 0; i < 81; i++) {
    provinceMeta.push({
      id: String(90101 + i * 100),
      plate: String(i + 1).padStart(2, "0"),
      name: `İl ${i + 1}`,
    });
  }
  return provinceMeta;
}

function townToProvinceId(town) {
  return String(parseInt(String(town).substring(0, 3), 10) + "01");
}

function labelHadise(key) {
  return HADISE_LABELS[key] || key;
}

function mergeWarnings(target, source) {
  for (const level of ["yellow", "orange", "red"]) {
    for (const key of source[level] || []) {
      if (!target[level].includes(key)) target[level].push(key);
    }
  }
}

function buildProvinceState(alerts) {
  const meta = loadProvinceMeta();
  const byId = new Map();
  for (const p of meta) {
    byId.set(p.id, {
      id: p.id,
      plate: p.plate,
      name: p.name,
      level: 0,
      color: LEVEL_COLORS[0],
      levelLabel: LEVEL_LABELS[0],
      warnings: { yellow: [], orange: [], red: [] },
    });
  }

  for (const alert of alerts || []) {
    const levels = [
      { key: "yellow", level: 1 },
      { key: "orange", level: 2 },
      { key: "red", level: 3 },
    ];
    for (const { key, level } of levels) {
      for (const town of alert.towns?.[key] || []) {
        const pid = townToProvinceId(town);
        const prov = byId.get(pid);
        if (!prov) continue;
        mergeWarnings(prov.warnings, alert.weather || {});
        if (prov.level < level) {
          prov.level = level;
          prov.color = LEVEL_COLORS[level];
          prov.levelLabel = LEVEL_LABELS[level];
        }
      }
    }
  }

  const provinces = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const warned = provinces.filter((p) => p.level > 0).map((p) => ({
    ...p,
    warningLabels: [
      ...p.warnings.red.map((w) => ({ level: "red", label: labelHadise(w) })),
      ...p.warnings.orange.map((w) => ({ level: "orange", label: labelHadise(w) })),
      ...p.warnings.yellow.map((w) => ({ level: "yellow", label: labelHadise(w) })),
    ],
  }));

  return { provinces, warned, warningCount: warned.length };
}

async function fetchAlerts(day = 1) {
  const endpoint = day === 2 ? "tomorrow" : "today";
  const res = await fetch(`${MGM_API}/${endpoint}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AfetPortali/1.0",
      Referer: MGM_REFERER,
      Origin: "https://www.mgm.gov.tr",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`MGM API yanıtı: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("MGM verisi beklenen formatta değil");
  }
  return data;
}

function formatUpdatedAt(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getMeteoUyari(day = 1) {
  const gun = day === 2 ? 2 : 1;
  const now = Date.now();
  const cacheKey = String(gun);

  if (cache.data[cacheKey] && now - cache.at < CACHE_MS) {
    return cache.data[cacheKey];
  }

  try {
    const alerts = await fetchAlerts(gun);
    const state = buildProvinceState(alerts);
    const payload = {
      ok: true,
      day: gun,
      dayLabel: gun === 2 ? "Yarın" : "Bugün",
      updatedAt: formatUpdatedAt(new Date()),
      source: "MGM MeteoUyarı",
      sourceUrl: MGM_REFERER,
      legend: [
        { level: 0, color: LEVEL_COLORS[0], label: "Yeşil — Tehlike yok" },
        { level: 1, color: LEVEL_COLORS[1], label: "Sarı — Az tehlikeli" },
        { level: 2, color: LEVEL_COLORS[2], label: "Turuncu — Tehlikeli" },
        { level: 3, color: LEVEL_COLORS[3], label: "Kırmızı — Çok tehlikeli" },
      ],
      ...state,
    };
    cache.data[cacheKey] = payload;
    cache.at = now;
    return payload;
  } catch (err) {
    if (cache.data[cacheKey]?.ok) {
      return { ...cache.data[cacheKey], stale: true, error: String(err?.message || err) };
    }
    return {
      ok: false,
      day: gun,
      dayLabel: gun === 2 ? "Yarın" : "Bugün",
      provinces: [],
      warned: [],
      warningCount: 0,
      updatedAt: null,
      source: "MGM MeteoUyarı",
      sourceUrl: MGM_REFERER,
      legend: [],
      error: String(err?.message || err),
    };
  }
}

module.exports = {
  getMeteoUyari,
  LEVEL_COLORS,
  HADISE_LABELS,
};
