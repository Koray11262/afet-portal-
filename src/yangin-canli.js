const ESRI_FIRE_URL =
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0/query";
const TURKEY_WHERE = "latitude > 35 AND latitude < 43 AND longitude > 25 AND longitude < 46";
const CACHE_MS = 5 * 60 * 1000;
const MAX_RECORDS = 8000;
const PAGE_SIZE = 2000;

let cache = { at: 0, data: null };

function frpMeta(frp) {
  const n = Number(frp) || 0;
  if (n > 750) return { level: "xl", color: "#b91c1c", label: ">750 FRP", size: 18 };
  if (n >= 300) return { level: "lg", color: "#ea580c", label: "300–749 FRP", size: 14 };
  if (n >= 100) return { level: "md", color: "#f59e0b", label: "100–299 FRP", size: 11 };
  if (n >= 10) return { level: "sm", color: "#fbbf24", label: "10–99 FRP", size: 8 };
  return { level: "xs", color: "#fde68a", label: "0–9 FRP", size: 6 };
}

function formatTime(ms) {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(d);
}

function normalizeFeature(f) {
  const p = f.properties || {};
  const frp = Number(p.frp) || 0;
  const meta = frpMeta(frp);
  const brightK = p.bright_ti4 ? Number(p.bright_ti4) : null;
  return {
    id: f.id ?? p.OBJECTID,
    lat: p.latitude,
    lng: p.longitude,
    frp,
    frpLevel: meta.level,
    frpColor: meta.color,
    frpLabel: meta.label,
    markerSize: meta.size,
    confidence: p.confidence || "—",
    satellite: p.satellite || "—",
    daynight: p.daynight === "D" ? "Gündüz" : p.daynight === "N" ? "Gece" : "—",
    hoursOld: p.hours_old != null ? Number(p.hours_old) : null,
    observedAt: formatTime(p.esritimeutc || p.acq_time || p.acq_date),
    temperatureC: brightK != null ? `${(brightK - 273.15).toFixed(1)} °C` : "—",
  };
}

async function fetchPage(offset) {
  const url = new URL(ESRI_FIRE_URL);
  url.searchParams.set("where", TURKEY_WHERE);
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("resultRecordCount", String(PAGE_SIZE));
  url.searchParams.set("resultOffset", String(offset));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "AfetPortali/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Yangın verisi: ${res.status}`);
  return res.json();
}

async function fetchHotspots() {
  const features = [];
  let offset = 0;
  let truncated = false;

  while (offset < MAX_RECORDS) {
    const data = await fetchPage(offset);
    if (!data?.features?.length) break;
    features.push(...data.features);
    if (!data.properties?.exceededTransferLimit) break;
    offset += PAGE_SIZE;
    truncated = true;
  }

  return { features, truncated };
}

function buildPayload(rawFeatures, truncated) {
  const hotspots = rawFeatures
    .map(normalizeFeature)
    .filter((h) => h.lat != null && h.lng != null)
    .sort((a, b) => (a.hoursOld ?? 9999) - (b.hoursOld ?? 9999));

  const recent24h = hotspots.filter((h) => h.hoursOld != null && h.hoursOld <= 24);
  const significant = hotspots.filter((h) => h.frp >= 10);

  return {
    ok: true,
    updatedAt: new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
    source: "VIIRS Uydu (NASA FIRMS / Esri)",
    sourceUrl: "https://afetharitasi.org/yangin-haritasi/map.html",
    referenceUrl: "https://firms.modaps.eosdis.nasa.gov/",
    truncated,
    stats: {
      total: hotspots.length,
      last24h: recent24h.length,
      significant: significant.length,
    },
    legend: [
      { color: "#b91c1c", label: ">750 FRP" },
      { color: "#ea580c", label: "300–749 FRP" },
      { color: "#f59e0b", label: "100–299 FRP" },
      { color: "#fbbf24", label: "10–99 FRP" },
      { color: "#fde68a", label: "0–9 FRP" },
    ],
    hotspots,
    geojson: {
      type: "FeatureCollection",
      features: rawFeatures,
    },
  };
}

async function getLiveFireMap() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;

  try {
    const { features, truncated } = await fetchHotspots();
    const payload = buildPayload(features, truncated);
    cache = { at: now, data: payload };
    return payload;
  } catch (err) {
    if (cache.data?.ok) {
      return { ...cache.data, stale: true, error: String(err?.message || err) };
    }
    return {
      ok: false,
      hotspots: [],
      geojson: { type: "FeatureCollection", features: [] },
      stats: { total: 0, last24h: 0, significant: 0 },
      legend: [],
      source: "VIIRS Uydu (NASA FIRMS / Esri)",
      sourceUrl: "https://afetharitasi.org/yangin-haritasi/map.html",
      error: String(err?.message || err),
    };
  }
}

module.exports = { getLiveFireMap };
