const ilKoordinat = require("../data/il-koordinat.json");
const { matchIl, normalizeKey } = require("./il-match");

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hashString(s) {
  const str = String(s || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterLatLng(lat, lng, r, km) {
  const angle = r() * Math.PI * 2;
  const distKm = r() * km;
  const dLat = (distKm / 111) * Math.cos(angle);
  const dLng = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: lat + dLat, lng: lng + dLng };
}

function normalizeIlName(raw) {
  const ilNames = Object.keys(ilKoordinat);
  return matchIl(raw, ilNames) || String(raw || "").trim();
}

function chooseEpicenter(il, ilce, seed) {
  const ilNorm = normalizeIlName(il);
  const base = ilKoordinat[ilNorm] || { lat: 39.0, lng: 35.0 };
  const r = mulberry32(seed);
  const bias = normalizeKey(ilce || "");
  const biasSeed = hashString(`${seed}:${bias}`);
  const r2 = mulberry32(biasSeed);
  const mixed = () => (r() * 0.65 + r2() * 0.35);
  const epic = jitterLatLng(base.lat, base.lng, mixed, 14);
  return { il: ilNorm, lat: epic.lat, lng: epic.lng };
}

function estimateImpact(mag, r) {
  const m = Number(mag);
  const factor = clamp((m - 5.5) / 2.2, 0, 1);
  const affected = Math.round(5000 + factor * (220000 + r() * 140000));
  const heavy = Math.round(affected * (0.08 + factor * 0.12));
  const moderate = Math.round(affected * (0.18 + factor * 0.18));
  const light = Math.max(0, affected - heavy - moderate);
  const roadIssues = Math.round(15 + factor * (55 + r() * 35));
  const powerOut = Math.round(6 + factor * (22 + r() * 18));
  return {
    affectedPeople: affected,
    damage: { heavy, moderate, light },
    roadIssuesCount: roadIssues,
    powerOutagePercent: clamp(powerOut, 0, 55),
  };
}

function buildQuakeRiskZones(mag) {
  const m = Number(mag);
  const factor = clamp((m - 5.5) / 2.2, 0, 1);
  const base = 4 + factor * 2.5;
  return [
    { id: "zone-1", label: "Çok yüksek", radiusKm: Math.round(base * 6), color: "#ef4444", fill: "#fecaca" },
    { id: "zone-2", label: "Yüksek", radiusKm: Math.round(base * 12), color: "#f97316", fill: "#ffedd5" },
    { id: "zone-3", label: "Orta", radiusKm: Math.round(base * 22), color: "#eab308", fill: "#fef9c3" },
  ];
}

function buildFloodZones(r) {
  const base = 6 + r() * 6;
  return [
    { id: "f-1", label: "Taşkın çekirdek", radiusKm: Math.round(base * 2.2), color: "#2563eb", fill: "#bfdbfe" },
    { id: "f-2", label: "Yüksek risk (dere yatağı)", radiusKm: Math.round(base * 4.2), color: "#3b82f6", fill: "#dbeafe" },
    { id: "f-3", label: "Olası su baskını", radiusKm: Math.round(base * 7.2), color: "#60a5fa", fill: "#eff6ff" },
  ];
}

function buildLandslideZones(r) {
  const base = 5 + r() * 5;
  return [
    { id: "l-1", label: "Heyelan başlama bölgesi", radiusKm: Math.round(base * 1.8), color: "#a16207", fill: "#fef3c7" },
    { id: "l-2", label: "Yamaç risk zonu", radiusKm: Math.round(base * 3.4), color: "#d97706", fill: "#ffedd5" },
    { id: "l-3", label: "Akış/taşınım etkisi", radiusKm: Math.round(base * 5.8), color: "#f59e0b", fill: "#fef9c3" },
  ];
}

function estimateFloodImpact(r) {
  const affected = Math.round(2500 + r() * 65000);
  const evac = Math.round(affected * (0.22 + r() * 0.22));
  const roadIssues = Math.round(12 + r() * 65);
  const powerOut = Math.round(4 + r() * 28);
  return {
    affectedPeople: affected,
    evacuees: evac,
    roadIssuesCount: roadIssues,
    powerOutagePercent: clamp(powerOut, 0, 55),
    notes: "Su baskını; alt geçitler, dere yatakları ve düşük kotlarda daha hızlı etkiler yaratır.",
  };
}

function estimateLandslideImpact(r) {
  const affected = Math.round(800 + r() * 18000);
  const roadIssues = Math.round(10 + r() * 55);
  const slopeClosures = Math.round(2 + r() * 12);
  const powerOut = Math.round(2 + r() * 18);
  return {
    affectedPeople: affected,
    roadIssuesCount: roadIssues,
    slopeClosuresCount: slopeClosures,
    powerOutagePercent: clamp(powerOut, 0, 45),
    notes: "Heyelan; yamaç yolları, şevler ve doygun zeminlerde ani kapanmalara yol açabilir.",
  };
}

function buildHospitals(epicenter, r, count = 7) {
  const names = [
    "Devlet Hastanesi",
    "Şehir Hastanesi",
    "Eğitim ve Araştırma Hastanesi",
    "Acil Servis Noktası",
    "Saha Sağlık Birimi",
  ];
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const p = jitterLatLng(epicenter.lat, epicenter.lng, r, 18);
    const type = names[Math.floor(r() * names.length)];
    items.push({
      id: `h-${i + 1}`,
      name: `${epicenter.il} ${type} ${i + 1}`,
      lat: p.lat,
      lng: p.lng,
      triage: r() > 0.75 ? "Kritik" : r() > 0.45 ? "Yoğun" : "Normal",
      capacityHint: Math.round(80 + r() * 320),
    });
  }
  return items;
}

function buildTraffic(epicenter, r) {
  const segments = [];
  const levels = [
    { level: "Açık", color: "#16a34a", weight: 5 },
    { level: "Orta", color: "#eab308", weight: 6 },
    { level: "Yoğun", color: "#f97316", weight: 7 },
    { level: "Çok yoğun", color: "#ef4444", weight: 8 },
  ];
  for (let i = 0; i < 6; i += 1) {
    const a = jitterLatLng(epicenter.lat, epicenter.lng, r, 20);
    const b = jitterLatLng(epicenter.lat, epicenter.lng, r, 20);
    const meta = levels[Math.floor(r() * levels.length)];
    segments.push({
      id: `t-${i + 1}`,
      from: a,
      to: b,
      level: meta.level,
      color: meta.color,
      weight: meta.weight,
    });
  }
  return segments;
}

function scenarioText(type, ilce, il, mag) {
  const place = [String(ilce || "").trim(), String(il || "").trim()].filter(Boolean).join(" / ");
  const m = Number(mag);
  const magLabel = Number.isFinite(m) ? m.toFixed(1) : String(mag || "—");
  if (type === "flood") return `${place || "Bölgede"} sel/taşkın ihbarı var.`;
  if (type === "landslide") return `${place || "Bölgede"} heyelan meydana geldi.`;
  return `${place || "Bölgede"} ${magLabel} büyüklüğünde deprem oldu.`;
}

function normalizeType(raw) {
  const t = String(raw || "quake").trim().toLowerCase();
  if (t === "sel" || t === "taskin" || t === "taşkın" || t === "flood") return "flood";
  if (t === "heyelan" || t === "landslide") return "landslide";
  return "quake";
}

function runScenario({ il, ilce, magnitude, type }) {
  const ilNorm = normalizeIlName(il);
  const mag = clamp(Number(magnitude) || 7.2, 4.0, 8.2);
  const kind = normalizeType(type);
  const seed = hashString(`${kind}|${ilNorm}|${ilce || ""}|${mag.toFixed(1)}`);
  const r = mulberry32(seed);
  const epicenter = chooseEpicenter(ilNorm, ilce, seed);
  const riskZones =
    kind === "flood" ? buildFloodZones(r) : kind === "landslide" ? buildLandslideZones(r) : buildQuakeRiskZones(mag);
  const impact =
    kind === "flood"
      ? estimateFloodImpact(r)
      : kind === "landslide"
        ? estimateLandslideImpact(r)
        : estimateImpact(mag, r);
  const hospitals = buildHospitals(epicenter, r);
  const traffic = buildTraffic(epicenter, r);

  return {
    ok: true,
    input: { type: kind, il: ilNorm, ilce: ilce ? String(ilce).trim() : null, magnitude: mag },
    eventText: scenarioText(kind, ilce, ilNorm, mag),
    epicenter,
    riskZones,
    hospitals,
    traffic,
    impact,
    disclaimer:
      "Bu bir görsel/mantıksal senaryo simülasyonudur; gerçek zamanlı resmi durum değerlendirmesi değildir.",
  };
}

module.exports = { runScenario };

