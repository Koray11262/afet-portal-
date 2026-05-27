const AFAD_FILTER_URL = "https://deprem.afad.gov.tr/apiv2/event/filter";
const CACHE_MS = 3 * 60 * 1000;
const DEFAULT_LIMIT = 15;
const DAYS_BACK = 7;

let cache = { at: 0, data: null };

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatAfadDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.replace("T", " ");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function magnitudeClass(mag) {
  const m = Number(mag);
  if (m >= 5) return "homeEq__mag--high";
  if (m >= 4) return "homeEq__mag--medium";
  if (m >= 3) return "homeEq__mag--low";
  return "homeEq__mag--minor";
}

function normalizeItem(raw) {
  const mag = Number(raw.magnitude);
  return {
    id: raw.eventID || raw.eventId || "",
    date: raw.date,
    dateLabel: formatAfadDate(raw.date),
    location: raw.location || [raw.province, raw.district].filter(Boolean).join(" / ") || "—",
    magnitude: Number.isFinite(mag) ? mag.toFixed(1) : "—",
    magnitudeClass: magnitudeClass(mag),
    depth: raw.depth != null ? `${raw.depth} km` : "—",
    type: raw.type || "ML",
    lat: raw.latitude,
    lon: raw.longitude,
    province: raw.province || "",
  };
}

function afadDateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000);
  const fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { start: fmt(start), end: fmt(end) };
}

async function fetchFromAfad(limit = DEFAULT_LIMIT) {
  const { start, end } = afadDateRange();
  const url = new URL(AFAD_FILTER_URL);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("orderby", "timedesc");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "AfetPortali/1.0 (+https://github.com/Koray11262/afet-portal-)",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`AFAD API yanıtı: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("AFAD verisi beklenen formatta değil");
  }

  return data.map(normalizeItem);
}

async function getRecentEarthquakes(limit = DEFAULT_LIMIT) {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const items = await fetchFromAfad(limit);
    const payload = {
      ok: true,
      items: items.slice(0, limit),
      updatedAt: formatUpdatedAt(new Date()),
      source: "AFAD",
      sourceUrl: "https://deprem.afad.gov.tr/",
    };
    cache = { at: now, data: payload };
    return payload;
  } catch (err) {
    if (cache.data?.ok) {
      return {
        ...cache.data,
        stale: true,
        error: String(err?.message || err),
      };
    }
    return {
      ok: false,
      items: [],
      updatedAt: null,
      source: "AFAD",
      sourceUrl: "https://deprem.afad.gov.tr/",
      error: String(err?.message || err),
    };
  }
}

module.exports = {
  getRecentEarthquakes,
  DEFAULT_LIMIT,
};
