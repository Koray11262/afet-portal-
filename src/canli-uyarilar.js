const ilMatch = require("./il-match");
const { HADISE_LABELS } = require("./mgm-meteouyari");

const HADISE_PREP = {
  rain: [
    "Sağanak/taşkın riskine karşı bodrum ve zemin kat eşyalarını yükseltin; su birikintisine araçla girmeyin.",
    "Yağmur suyu giderlerini kontrol edin; pencere ve kapı altı sızdırmazlığını gözden geçirin.",
    "Acil çantaya yağmurluk, su geçirmez ayakkabı ve ek temiz su ekleyin.",
  ],
  thunderstorm: [
    "Gökgürültülü sağanak sırasında açık alanda durmayın; metal eşyalardan uzak durun.",
    "Elektrikli cihazları prizden çekin; modem ve hassas cihazları fişten ayırın.",
    "Ani sel taşkını ihtimaline karşı alçak geçitlerden kaçının.",
  ],
  wind: [
    "Balkon ve bahçedeki gevşek eşyaları sabitleyin veya içeri alın.",
    "Çatı, tabela ve ağaç dallarını kontrol edin; uçuşabilecek nesneleri kaldırın.",
  ],
  snow: [
    "Kar yağışında ulaşım planınızı güncelleyin; zincir ve kar küreği bulundurun.",
    "Çatı kar yükünü güvenli şekilde takip edin.",
  ],
  avalanche: [
    "Çığ riski olan bölgelerde yolculuğu erteleyin; dağ yamaçlarından uzak durun.",
    "Kış tatili planınızı MGM çığ uyarılarına göre güncelleyin.",
  ],
  ice: [
    "Buzlanma riskinde yaya ve araç hareketlerinde ekstra dikkat; kaygan zemin önlemleri alın.",
  ],
  fog: [
    "Sisli havalarda görüş mesafesi düşer; araç kullanımında hızı azaltın, uzun far kullanmayın.",
  ],
  hot: [
    "Aşırı sıcakta su tüketimini artırın; güneş çarpmasına karşı gölgede kalın.",
    "Ormanlık alanlara yakınsanız yangın riski artabilir; ateş yakmayın.",
  ],
  agricultural: [
    "Zirai don uyarısında sera ve bahçe örtülerini hazırlayın; hassas bitkileri koruyun.",
  ],
  dust: [
    "Toz taşınımında maske kullanın; pencereleri kapatın; astım hastaları dışarı çıkmamalı.",
  ],
  snowmelt: [
    "Kar erimesi sel riskini artırabilir; dere yatağı yakınında dikkatli olun.",
  ],
  cold: [
    "Soğuk hava dalgasında ısınma ve yalıtımı kontrol edin; komşu ve yaşlı bireyleri arayın.",
  ],
};

const LEVEL_SEVERITY = { yellow: "warn", orange: "alert", red: "critical" };
const LEVEL_TR = { yellow: "Sarı", orange: "Turuncu", red: "Kırmızı" };

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findProvince(meteo, il) {
  if (!meteo?.ok || !meteo.provinces) return null;
  const key = ilMatch.normalizeKey(il);
  return meteo.provinces.find((p) => ilMatch.normalizeKey(p.name) === key) || null;
}

function collectWarningKeys(prov) {
  if (!prov?.warnings) return [];
  const keys = [];
  for (const level of ["red", "orange", "yellow"]) {
    for (const k of prov.warnings[level] || []) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  return keys;
}

function filterFiresNearIl(fires, coord, radiusKm = 110) {
  if (!fires?.ok || !coord || !fires.hotspots?.length) {
    return { nearby: [], significant24h: [], totalNearby: 0 };
  }
  const nearby = fires.hotspots.filter((h) => {
    const d = haversineKm(coord.lat, coord.lng, h.lat, h.lng);
    return d <= radiusKm;
  });
  const significant24h = nearby.filter(
    (h) => h.frp >= 10 && h.hoursOld != null && h.hoursOld <= 24
  );
  return {
    nearby,
    significant24h,
    totalNearby: nearby.length,
    radiusKm,
  };
}

function warningLabelText(prov) {
  const fromList = (prov.warningLabels || []).map((w) => w.label);
  if (fromList.length) return fromList.join(", ");
  const fromKeys = collectWarningKeys(prov).map((k) => HADISE_LABELS[k] || k);
  if (fromKeys.length) return fromKeys.join(", ");
  return prov.levelLabel || "Meteorolojik uyarı";
}

function buildMeteoAlert(il, dayLabel, prov) {
  if (!prov || prov.level < 1) return null;
  const labels = prov.warningLabels || [];
  const labelText = warningLabelText(prov);
  const maxLevel = labels.some((w) => w.level === "red")
    ? "red"
    : labels.some((w) => w.level === "orange")
      ? "orange"
      : "yellow";

  const prep = [];
  const keys = collectWarningKeys(prov);
  for (const k of keys) {
    for (const line of HADISE_PREP[k] || []) {
      if (!prep.includes(line)) prep.push(line);
    }
  }
  if (!prep.length) {
    prep.push("MGM uyarılarını takip edin; resmi duyurulara göre planınızı güncelleyin.");
  }

  return {
    source: "mgm",
    severity: LEVEL_SEVERITY[maxLevel] || "warn",
    title: `MGM MeteoUyarı (${dayLabel}): ${il}`,
    summary: `${prov.levelLabel} — ${labelText}`,
    levelLabel: prov.levelLabel,
    hadise: labelText,
    dayLabel,
    prep,
    href: "https://www.mgm.gov.tr/meteouyari/turkiye.aspx",
  };
}

function buildFireAlert(il, fireInfo) {
  if (!fireInfo.totalNearby) return null;
  const sig = fireInfo.significant24h.length;
  const prep = [
    "Orman ve makilik alanlara yaklaşmayın; izin verilmeyen yerde ateş yakmayın.",
    "Ev çevresinde kuru ot ve yanıcı artık temizliği yapın.",
    "Tahliye yönünüzü ve alternatif yolları önceden belirleyin.",
  ];
  if (sig > 0) {
    prep.unshift(
      `İliniz çevresinde son 24 saatte ${sig} anlamlı sıcak nokta (FRP≥10) tespit edildi; yangın riski yüksek sayılır.`
    );
  } else {
    prep.unshift(
      `İliniz çevresinde ${fireInfo.totalNearby} uydu sıcak noktası kaydı var; durumu yangın haritasından izleyin.`
    );
  }

  return {
    source: "yangin",
    severity: sig >= 3 ? "alert" : sig >= 1 ? "warn" : "info",
    title: `Canlı yangın haritası: ${il} çevresi`,
    summary:
      sig > 0
        ? `Son 24 saatte ${sig} güçlü sıcak nokta (${fireInfo.radiusKm} km yarıçap içinde).`
        : `${fireInfo.totalNearby} sıcak nokta kaydı (${fireInfo.radiusKm} km yarıçap).`,
    stats: {
      totalNearby: fireInfo.totalNearby,
      significant24h: sig,
    },
    prep,
    href: "/",
    note: "Anasayfadaki yangın haritası FAB üzerinden detaylı haritayı açabilirsiniz.",
  };
}

function buildForIl(il, { meteoToday, meteoTomorrow, fires, coord }) {
  const alerts = [];
  const prepItems = [];
  const equipItems = [];

  const todayProv = findProvince(meteoToday, il);
  const tomorrowProv = findProvince(meteoTomorrow, il);

  const todayAlert = buildMeteoAlert(il, meteoToday?.dayLabel || "Bugün", todayProv);
  if (todayAlert) alerts.push(todayAlert);

  const tomorrowAlert = buildMeteoAlert(il, meteoTomorrow?.dayLabel || "Yarın", tomorrowProv);
  if (tomorrowAlert) alerts.push(tomorrowAlert);

  const fireInfo = filterFiresNearIl(fires, coord);
  const fireAlert = buildFireAlert(il, fireInfo);
  if (fireAlert) alerts.push(fireAlert);

  for (const a of alerts) {
    for (const p of a.prep || []) {
      if (!prepItems.includes(p)) prepItems.push(p);
    }
  }

  const keysToday = collectWarningKeys(todayProv);
  const keysTomorrow = collectWarningKeys(tomorrowProv);
  const allKeys = [...new Set([...keysToday, ...keysTomorrow])];

  if (allKeys.some((k) => ["rain", "thunderstorm", "snowmelt"].includes(k))) {
    equipItems.push(
      "Su geçirmez ayakkabı/çizme ve yağmurluk",
      "Ek içme suyu ve su geçirmez belge dosyası"
    );
  }
  if (allKeys.includes("wind")) {
    equipItems.push("Balkon/bahçe sabitleme malzemesi, bant ve ip");
  }
  if (fireAlert?.stats?.significant24h > 0) {
    equipItems.push("Duman maskesi (FFP2), gözlük, acil tahliye çantası");
  }

  const headline =
    alerts.length > 0
      ? `${il} için ${alerts.length} canlı uyarı birleştirildi (MGM hava + yangın haritası).`
      : `${il} için şu an MGM veya yangın haritasında öne çıkan kritik uyarı yok; yine de genel hazırlık önerileri geçerlidir.`;

  return {
    headline,
    alerts,
    meteo: {
      today: todayProv
        ? {
            level: todayProv.level,
            levelLabel: todayProv.levelLabel,
            warnings: todayProv.warningLabels?.map((w) => w.label) || [],
          }
        : null,
      tomorrow: tomorrowProv
        ? {
            level: tomorrowProv.level,
            levelLabel: tomorrowProv.levelLabel,
            warnings: tomorrowProv.warningLabels?.map((w) => w.label) || [],
          }
        : null,
      updatedAt: meteoToday?.updatedAt || null,
      stale: Boolean(meteoToday?.stale || meteoTomorrow?.stale),
    },
    fire: {
      ...fireInfo,
      updatedAt: fires?.updatedAt || null,
      stale: Boolean(fires?.stale),
    },
    prepFromLive: prepItems,
    equipFromLive: equipItems,
  };
}

module.exports = {
  buildForIl,
  findProvince,
  filterFiresNearIl,
};
