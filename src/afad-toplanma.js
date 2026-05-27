const fs = require("fs");
const path = require("path");

const { matchIl, normalizeKey } = require("./il-match");
const { withDistance } = require("./toplanma");

const BASE_URL = "https://www.turkiye.gov.tr";
const TOPLANMA_URL = `${BASE_URL}/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama`;
const CACHE_DIR = path.join(__dirname, "..", "data", "toplanma-alanlari");
const ILLER = require("../data/afad-iller.json");
const GITHUB_RAW =
  "https://raw.githubusercontent.com/RKursatV/afad-toplanma-alani-acik-veri/main/iller";

const BASE_HEADERS = {
  Host: "www.turkiye.gov.tr",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  Connection: "keep-alive",
};

const ilByNorm = new Map(ILLER.map((x) => [normalizeKey(x.name), x]));
const ilNames = ILLER.map((x) => x.name);

let memoryIndex = null;
let loadPromise = null;
let scraperSession = null;

function normalizeIlName(raw) {
  const matched = matchIl(raw, ilNames);
  return matched || String(raw || "").trim();
}

function normalizeArea(props) {
  if (!props) return null;
  const lng = Number(props.x);
  const lat = Number(props.y);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 35 || lat > 43 || lng < 25 || lng > 46) return null;

  return {
    id: String(props.id),
    ad: String(props.tesis_adi || props.ad || "Toplanma Alanı").trim(),
    il: normalizeIlName(props.il_adi),
    ilce: props.ilce_adi ? String(props.ilce_adi).trim() : null,
    mahalle: props.mahalle_adi ? String(props.mahalle_adi).trim() : null,
    adres: [props.acik_adres, props.sokak_adi].filter(Boolean).join(", ").trim() || null,
    lat,
    lng,
    tabela_kod: props.tabela_kod ? String(props.tabela_kod) : null,
  };
}

function flattenNestedProvince(data) {
  const items = [];
  const seen = new Set();

  for (const ilName of Object.keys(data || {})) {
    const ilceler = data[ilName]?.ilceler || {};
    for (const ilceName of Object.keys(ilceler)) {
      const mahalleler = ilceler[ilceName]?.mahalleler || {};
      for (const mahName of Object.keys(mahalleler)) {
        const alanlar = mahalleler[mahName]?.toplanmaAlanlari || {};
        for (const key of Object.keys(alanlar)) {
          const item = normalizeArea(alanlar[key]);
          if (!item || seen.has(item.id)) continue;
          seen.add(item.id);
          items.push(item);
        }
      }
    }
  }

  return items;
}

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cacheFileForIl(ilName) {
  const safe = normalizeKey(ilName).replace(/[^a-z0-9]+/g, "-");
  return path.join(CACHE_DIR, `${safe}.json`);
}

function readProvinceCache(ilName) {
  const file = cacheFileForIl(ilName);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(parsed?.items)) return parsed;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const items = flattenNestedProvince(parsed);
      return { il: ilName, items, updatedAt: null, source: "github-nested" };
    }
  } catch {
    return null;
  }
  return null;
}

function writeProvinceCache(ilName, items, source) {
  ensureCacheDir();
  const payload = {
    il: ilName,
    updatedAt: new Date().toISOString(),
    count: items.length,
    source,
    items,
  };
  fs.writeFileSync(cacheFileForIl(ilName), JSON.stringify(payload), "utf8");
  return payload;
}

function buildMemoryIndex() {
  ensureCacheDir();
  const byId = new Map();
  const byIl = new Map();
  const syncedIller = [];

  for (const il of ILLER) {
    const cached = readProvinceCache(il.name);
    if (!cached?.items?.length) continue;
    syncedIller.push(il.name);
    const list = [];
    for (const item of cached.items) {
      if (byId.has(item.id)) continue;
      byId.set(item.id, item);
      list.push(item);
    }
    byIl.set(il.name, list);
  }

  const items = Array.from(byId.values());
  memoryIndex = {
    items,
    byIl,
    syncedIller: syncedIller.sort((a, b) => a.localeCompare(b, "tr")),
    loadedAt: Date.now(),
  };
  return memoryIndex;
}

async function ensureLoaded() {
  if (memoryIndex) return memoryIndex;
  if (!loadPromise) loadPromise = Promise.resolve(buildMemoryIndex());
  return loadPromise;
}

function reloadIndex() {
  memoryIndex = null;
  loadPromise = null;
  return ensureLoaded();
}

function parseBbox(raw) {
  if (!raw) return null;
  const parts = String(raw)
    .split(",")
    .map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [south, west, north, east] = parts;
  if (south > north || west > east) return null;
  return { south, west, north, east };
}

function inBbox(item, bbox) {
  return (
    item.lat >= bbox.south &&
    item.lat <= bbox.north &&
    item.lng >= bbox.west &&
    item.lng <= bbox.east
  );
}

function filterItems({ il, bbox, limit }) {
  let items = memoryIndex?.items || [];
  if (il) {
    const matched = matchIl(il, ilNames);
    if (!matched) return [];
    items = memoryIndex.byIl.get(matched) || [];
  }
  if (bbox) items = items.filter((x) => inBbox(x, bbox));
  if (limit && limit > 0) items = items.slice(0, limit);
  return items;
}

async function getMeta() {
  const index = await ensureLoaded();
  return {
    ok: true,
    total: index.items.length,
    iller: ilNames,
    syncedIller: index.syncedIller,
    syncedCount: index.syncedIller.length,
    totalIller: ilNames.length,
    kaynak: "AFAD e-Devlet (turkiye.gov.tr)",
    loadedAt: index.loadedAt,
  };
}

async function queryAreas({ il, bbox, limit }) {
  await ensureLoaded();
  const matchedIl = il ? matchIl(il, ilNames) : null;
  if (il && !matchedIl) {
    return { ok: false, error: "Geçersiz il adı." };
  }

  if (matchedIl && !memoryIndex.byIl.has(matchedIl)) {
    syncProvince(matchedIl, (msg) => console.log("[toplanma]", msg))
      .then(() => reloadIndex())
      .catch((err) => console.error("[toplanma]", err.message));
    return {
      ok: true,
      items: [],
      total: 0,
      il: matchedIl,
      syncing: true,
      message: `${matchedIl} verisi arka planda yükleniyor. Birkaç dakika sonra tekrar deneyin.`,
      syncedIller: memoryIndex.syncedIller,
    };
  }

  const parsedBbox = parseBbox(bbox);
  const max = limit ? Math.min(Number(limit) || 0, 10000) : matchedIl ? 0 : 5000;
  const items = filterItems({
    il: matchedIl,
    bbox: parsedBbox,
    limit: max || undefined,
  });

  return {
    ok: true,
    items,
    total: items.length,
    il: matchedIl || null,
    syncedIller: memoryIndex.syncedIller,
  };
}

async function queryNearest({ lat, lng, limit = 5 }) {
  try {
    const live = await queryPoint(lng, lat);
    const features = live?.features || [];
    const seen = new Set();
    const normalized = [];
    for (const f of features) {
      const item = normalizeArea(f.properties);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      normalized.push(item);
    }
    const rows = normalized.map((x) => ({ ...x, kapasite: null }));
    const items = withDistance(rows, lat, lng).slice(0, limit);
    return { ok: true, items, source: "live" };
  } catch {
    await ensureLoaded();
    if (memoryIndex?.items?.length > 0) {
      const rows = memoryIndex.items.map((x) => ({ ...x, kapasite: null }));
      const items = withDistance(rows, lat, lng).slice(0, limit);
      return { ok: true, items, source: "cache" };
    }
    return { ok: true, items: [], source: "none" };
  }
}

class AfadScraper {
  constructor() {
    this.token = null;
    this.tokenAt = 0;
    this.cookies = "";
  }

  storeCookies(res) {
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (!setCookie.length) return;
    const map = new Map();
    if (this.cookies) {
      for (const part of this.cookies.split("; ")) {
        const eq = part.indexOf("=");
        if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1));
      }
    }
    for (const c of setCookie) {
      const pair = c.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq > 0) map.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    this.cookies = Array.from(map.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  buildHeaders(extra = {}) {
    return {
      ...BASE_HEADERS,
      ...(this.cookies ? { Cookie: this.cookies } : {}),
      ...extra,
    };
  }

  async parseJsonResponse(res) {
    this.storeCookies(res);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("AFAD yanıtı JSON değil.");
    }
  }

  async getToken(force = false) {
    if (!force && this.token && Date.now() - this.tokenAt < 10 * 60 * 1000) {
      return this.token;
    }
    const res = await fetch(TOPLANMA_URL, { headers: BASE_HEADERS });
    this.storeCookies(res);
    const html = await res.text();
    const match = html.match(/data-token="([^"]*)"/);
    if (!match) throw new Error("AFAD kimlik jetonu alınamadı.");
    this.token = match[1];
    this.tokenAt = Date.now();
    return this.token;
  }

  async postForm(url, data, extraHeaders = {}) {
    const token = await this.getToken();
    const body = new URLSearchParams({ ...data, token, ajax: "1" });
    const res = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders({
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        ...extraHeaders,
      }),
      body,
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      try {
        this.storeCookies(res);
        return JSON.parse(text);
      } catch {
        await this.getToken(true);
        return this.postForm(url, data, extraHeaders);
      }
    }
    return this.parseJsonResponse(res);
  }

  async fetchData(payload) {
    const data = Object.fromEntries(new URLSearchParams(payload));
    return this.postForm(`${TOPLANMA_URL}?submit`, {
      pn: "/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama",
      ...data,
    });
  }

  async queryPoint(lng, lat) {
    const token = await this.getToken();
    const body = new URLSearchParams({
      pn: "/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama",
      ajax: "1",
      token,
      islem: "getAlanlarForNokta",
      lat: String(lat),
      lng: String(lng),
    });
    const res = await fetch(`${TOPLANMA_URL}?harita=goster&submit`, {
      method: "POST",
      headers: this.buildHeaders({
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Origin: BASE_URL,
        Referer: `${TOPLANMA_URL}?harita=goster`,
      }),
      body,
    });
    return this.parseJsonResponse(res);
  }

  extractSignificantVertices(polygon) {
    const points = polygon?.[0] || [];
    if (points.length < 6) return points;
    const result = [];
    for (const key of ["min", "max"]) {
      const pointsX = [...points].sort((a, b) => (key === "max" ? b[0] - a[0] : a[0] - b[0]));
      const pointsY = [...points].sort((a, b) => (key === "max" ? b[1] - a[1] : a[1] - b[1]));
      result.push(pointsX[0], pointsY[0]);
    }
    const centerX = result.reduce((s, p) => s + p[0], 0) / 4;
    const centerY = result.reduce((s, p) => s + p[1], 0) / 4;
    result.push([centerX, centerY]);
    return result;
  }

  async getFromMap(ilCode, districtCode, neighborhoodCode) {
    const token = await this.getToken();
    const body = new URLSearchParams({
      ilKodu: String(ilCode),
      ilceKodu: String(districtCode),
      mahalleKodu: String(neighborhoodCode),
      sokakKodu: "",
      token,
      btn: "Sorgula",
    });
    const res = await fetch(`${TOPLANMA_URL}?submit`, {
      method: "POST",
      headers: this.buildHeaders(),
      body,
    });
    this.storeCookies(res);
    const html = await res.text();
    const match = html.match(/toplanmaAlanlari = (.*);/);
    if (!match || match[1] === "null") return null;
    let areas;
    try {
      areas = JSON.parse(match[1]);
    } catch {
      return null;
    }
    if (!areas?.length) return null;
    const coords = areas[0]?.geometry?.coordinates;
    if (!coords) return null;

    const vertices = this.extractSignificantVertices(coords);
    const features = [];
    for (const point of vertices) {
      let result = null;
      for (let i = 0; i < 3; i += 1) {
        result = await this.queryPoint(point[0], point[1]);
        if (result?.features?.length) break;
        await this.getToken(true);
      }
      if (result?.features) features.push(...result.features);
    }
    return features;
  }
}

function getScraper() {
  if (!scraperSession) scraperSession = new AfadScraper();
  return scraperSession;
}

async function queryPoint(lng, lat) {
  return getScraper().queryPoint(lng, lat);
}

async function fetchWithRetry(query) {
  const scraper = getScraper();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await scraper.fetchData(query);
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}

async function processNeighborhood(cityCode, district, neighborhood) {
  const scraper = getScraper();
  const byId = new Map();

  try {
    await fetchWithRetry(
      `ilKodu=${cityCode}&ilceKodu=${district.id}&sokakKodu=${neighborhood.id}&islem=sokakKodu`
    );
    const features = await scraper.getFromMap(cityCode, district.id, neighborhood.id);
    for (const f of features || []) {
      const item = normalizeArea(f.properties);
      if (item) byId.set(item.id, item);
    }
  } catch {
    return byId;
  }
  return byId;
}

async function mapPool(items, worker, concurrency = 6) {
  const results = [];
  let index = 0;
  async function runOne() {
    while (index < items.length) {
      const i = index;
      index += 1;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runOne));
  return results;
}

async function syncProvince(ilName, onProgress) {
  const il = ilByNorm.get(normalizeKey(ilName));
  if (!il) throw new Error(`Bilinmeyen il: ${ilName}`);

  const existing = readProvinceCache(il.name);
  if (existing?.items?.length) {
    onProgress?.(`${il.name} önbellekte (${existing.items.length} alan).`);
    return existing;
  }

  onProgress?.(`${il.name} AFAD'dan çekiliyor…`);
  const districtData = await fetchWithRetry(`ilKodu=${il.code}&islem=ilceKodu`);
  const districts = districtData?.data?.dataArr || [];
  const byId = new Map();

  for (const district of districts) {
    onProgress?.(`${il.name} / ${district.name}…`);
    const neighborhoodData = await fetchWithRetry(
      `ilKodu=${il.code}&ilceKodu=${district.id}&islem=mahalleKodu`
    );
    const neighborhoods = neighborhoodData?.data?.dataArr || [];
    const maps = await mapPool(
      neighborhoods,
      (n) => processNeighborhood(il.code, district, n),
      4
    );
    for (const map of maps) {
      for (const [id, item] of map.entries()) byId.set(id, item);
    }
  }

  const items = Array.from(byId.values());
  writeProvinceCache(il.name, items, "afad-edevlet");
  onProgress?.(`${il.name} tamamlandı: ${items.length} alan.`);
  return { il: il.name, items };
}

async function importFromGithubFile(fileName, ilName) {
  const url = `${GITHUB_RAW}/${encodeURIComponent(fileName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${fileName} indirilemedi (${res.status}).`);
  const data = await res.json();
  const items = flattenNestedProvince(data);
  writeProvinceCache(ilName, items, "github-afad-acik-veri");
  return items.length;
}

async function importGithubBundle(onProgress) {
  const files = [
    ["Adana.json", "Adana"],
    ["Adiyaman.json", "Adıyaman"],
    ["Diyarbakir.json", "Diyarbakır"],
    ["Gaziantep.json", "Gaziantep"],
    ["Hatay.json", "Hatay"],
    ["Kahramanmaras.json", "Kahramanmaraş"],
    ["Kilis.json", "Kilis"],
    ["Malatya.json", "Malatya"],
    ["Osmaniye.json", "Osmaniye"],
    ["Sanliurfa.json", "Şanlıurfa"],
  ];
  let total = 0;
  for (const [file, il] of files) {
    onProgress?.(`${il} GitHub'dan indiriliyor…`);
    total += await importFromGithubFile(file, il);
  }
  onProgress?.(`GitHub paketi tamamlandı (${total} alan).`);
  return total;
}

async function syncAllMissing(onProgress) {
  ensureCacheDir();
  let synced = 0;
  for (const il of ILLER) {
    const cached = readProvinceCache(il.name);
    if (cached?.items?.length) continue;
    await syncProvince(il.name, onProgress);
    synced += 1;
    reloadIndex();
  }
  return synced;
}

module.exports = {
  CACHE_DIR,
  ILLER,
  ilNames,
  ensureLoaded,
  reloadIndex,
  getMeta,
  queryAreas,
  queryNearest,
  queryPoint,
  syncProvince,
  importGithubBundle,
  syncAllMissing,
  normalizeArea,
};
