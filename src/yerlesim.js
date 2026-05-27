const CACHE_MS = 24 * 60 * 60 * 1000;
const BASE = "https://api.turkiyeapi.dev/v2";

let cache = {
  provincesAt: 0,
  provinces: null,
  districtsAt: new Map(), // provinceId -> { at, districts }
  provincesByName: null, // normalized name -> province
};

function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "AfetPortali/1.0" } });
  if (!res.ok) throw new Error(`Yerleşim servisi hata: ${res.status}`);
  return res.json();
}

async function getProvinces() {
  if (cache.provinces && Date.now() - cache.provincesAt < CACHE_MS) return cache.provinces;

  const data = await fetchJson(`${BASE}/provinces?fields=id,name`);
  const provinces = (data?.data || []).map((p) => ({ id: p.id, name: p.name })).filter((p) => p.id && p.name);
  provinces.sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
  cache.provinces = provinces;
  cache.provincesAt = Date.now();
  cache.provincesByName = new Map(provinces.map((p) => [normalizeKey(p.name), p]));
  return provinces;
}

async function getDistrictsByProvinceName(name) {
  const provinces = await getProvinces();
  const p = cache.provincesByName?.get(normalizeKey(name));
  if (!p) return { province: null, districts: [] };

  const prev = cache.districtsAt.get(p.id);
  if (prev && Date.now() - prev.at < CACHE_MS) return { province: p, districts: prev.districts };

  const data = await fetchJson(`${BASE}/provinces/${p.id}/districts?fields=id,name`);
  const districts = (data?.data || []).map((d) => ({ id: d.id, name: d.name })).filter((d) => d.id && d.name);
  districts.sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
  cache.districtsAt.set(p.id, { at: Date.now(), districts });
  return { province: p, districts };
}

module.exports = { getProvinces, getDistrictsByProvinceName, normalizeKey };

