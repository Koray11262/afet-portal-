const path = require("path");
const express = require("express");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "32kb" }));

const afetler = require("./data/afetler.json");
const db = require("./src/db");
const afadToplanma = require("./src/afad-toplanma");
const toplanma = require("./src/toplanma");
const ilMatch = require("./src/il-match");
const ilKoordinat = require("./data/il-koordinat.json");
const riskTurleri = require("./data/risk-turleri.json");
const karsilastirmalar = require("./data/karsilastirmalar.json");
const mikroboleme = require("./data/mikroboleme.json");
const afetMudahalePlani = require("./data/afet-mudahale-plani.json");
const deprem = require("./src/deprem");
const afadDuyurular = require("./src/afad-duyurular");
const mgmMeteouyari = require("./src/mgm-meteouyari");
const yanginCanli = require("./src/yangin-canli");
const senaryo = require("./src/senaryo");
const yerlesim = require("./src/yerlesim");
const hazirlikOneri = require("./src/hazirlik-oneri-engine");
const canliUyarilar = require("./src/canli-uyarilar");

app.locals.karsilastirmalar = karsilastirmalar;

function findCategory(slug) {
  return afetler.categories.find((c) => c.slug === slug) || null;
}

function findDisaster(slug) {
  for (const c of afetler.categories) {
    const d = c.items.find((x) => x.slug === slug);
    if (d) return { category: c, disaster: d };
  }
  return null;
}

function findKarsilastirma(slug) {
  return karsilastirmalar.items.find((x) => x.slug === slug) || null;
}

const HOME_SLOGANS = [
  "Afet değil, hazırlıksızlık öldürür.",
  "Bilinç hayat kurtarır.",
  "Önlem al, güvende kal.",
  "Afetlere karşı bilgi en büyük güçtür.",
  "Hazırlıklı toplum, güçlü toplumdur.",
  "Riskleri bil, hayatı koru.",
  "Bir çanta, bir plan, bir hayat.",
  "Afet anı değil, hazırlık zamanı önemlidir.",
  "Doğayı durduramayız, zararını azaltabiliriz.",
  "Güvenli yarınlar bilinçle başlar.",
  "Afetlere karşı tek yürek, tek bilinç.",
  "Bilgi paniği azaltır, hayat kurtarır.",
  "Afet gelmeden tedbirini al.",
  "Hazırlık bugün başlar.",
  "Her saniye önemli, her önlem değerlidir.",
  "Afetlere karşı bilinçli ol, güvende kal.",
  "Unutma: Küçük önlemler büyük hayatlar kurtarır.",
  "Toplum bilinçlenirse afetlerin etkisi azalır.",
  "Afet değil, tedbirsizlik felakettir.",
  "Geleceği korumanın yolu hazırlıktan geçer.",
];

function pickHomeSlogan() {
  return HOME_SLOGANS[Math.floor(Math.random() * HOME_SLOGANS.length)];
}

function renderPartial(res, view, locals) {
  return new Promise((resolve, reject) => {
    res.render(view, locals, (err, html) => {
      if (err) reject(err);
      else resolve(html);
    });
  });
}

app.get("/", async (req, res, next) => {
  try {
    const [sonDepremler, afadDuyuruData] = await Promise.all([
      deprem.getRecentEarthquakes(),
      afadDuyurular.getRecentAnnouncements(),
    ]);
    const [sonDepremlerHtml, afadDuyurularHtml, meteoUyariWidgetHtml, yanginWidgetHtml, senaryoWidgetHtml, hazirlikOzetWidgetHtml] =
      await Promise.all([
        renderPartial(res, "partials/home-earthquakes", { sonDepremler }),
        renderPartial(res, "partials/home-afad-duyurular", { afadDuyurular: afadDuyuruData }),
        renderPartial(res, "partials/home-meteouyari-widget"),
        renderPartial(res, "partials/home-yangin-widget"),
        renderPartial(res, "partials/home-senaryo-widget"),
        renderPartial(res, "partials/home-hazirlik-ozet-widget"),
      ]);
    res.render("home", {
      pageTitle: "Anasayfa",
      nav: afetler,
      homeSlogan: pickHomeSlogan(),
      sonDepremlerHtml,
      afadDuyurularHtml,
      meteoUyariWidgetHtml,
      yanginWidgetHtml,
      senaryoWidgetHtml,
      hazirlikOzetWidgetHtml,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/deprem/son", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || deprem.DEFAULT_LIMIT, 30);
    const data = await deprem.getRecentEarthquakes(limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/yangin/canli", async (req, res) => {
  try {
    const data = await yanginCanli.getLiveFireMap();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/mgm/meteouyari", async (req, res) => {
  try {
    const gun = Number(req.query.gun) === 2 ? 2 : 1;
    const data = await mgmMeteouyari.getMeteoUyari(gun);
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/afad/duyurular", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || afadDuyurular.DEFAULT_LIMIT, 20);
    const data = await afadDuyurular.getRecentAnnouncements(limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/senaryo/run", (req, res) => {
  try {
    const il = String(req.query.il || "").trim() || "Kocaeli";
    const ilce = String(req.query.ilce || "").trim() || "Gebze";
    const type = String(req.query.type || "quake").trim();
    const magnitude = req.query.magnitude != null ? Number(req.query.magnitude) : 7.2;
    const data = senaryo.runScenario({ il, ilce, magnitude, type });
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// Bağlantı testi (geliştirme için)
app.get("/api/health/db", async (req, res) => {
  try {
    await db.ping();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

const VALID_AFETLER = new Set(["deprem", "sel", "heyelan", "yangin", "cig", "kuraklik"]);

let illerCache = null;

async function getIllerList() {
  if (illerCache) return illerCache;
  const pool = db.getPool();
  const [rows] = await pool.query("SELECT il FROM sehir_riskleri ORDER BY il ASC");
  illerCache = rows.map((r) => String(r.il || "")).filter(Boolean);
  return illerCache;
}

app.get("/api/iller", async (req, res) => {
  try {
    const iller = await getIllerList();
    res.json({ ok: true, iller });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/risk/il/:il", async (req, res) => {
  const raw = decodeURIComponent(String(req.params.il || "")).trim();
  try {
    const iller = await getIllerList();
    const il = ilMatch.matchIl(raw, iller);
    if (!il) {
      return res.status(404).json({ ok: false, error: "İl bulunamadı. Listeden seçin veya tam adı yazın." });
    }

    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT il, deprem, sel, heyelan, yangin, cig, kuraklik
       FROM sehir_riskleri WHERE il = ? LIMIT 1`,
      [il]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Bu il için risk verisi yok." });
    }

    const row = rows[0];
    const risks = riskTurleri.map((t) => ({
      key: t.key,
      label: t.label,
      slug: t.slug,
      puan: row[t.key] != null ? Number(row[t.key]) : null,
    }));

    const coord = ilKoordinat[il] || null;
    res.json({ ok: true, il, risks, coord });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/risk/:afet", async (req, res) => {
  const afet = String(req.params.afet || "");
  if (!VALID_AFETLER.has(afet)) return res.status(400).json({ ok: false, error: "Geçersiz afet." });

  try {
    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT il, \`${afet}\` AS puan FROM sehir_riskleri ORDER BY il ASC`
    );
    res.json({ ok: true, afet, rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/heat/:afet", async (req, res) => {
  const afet = String(req.params.afet || "");
  if (!VALID_AFETLER.has(afet)) return res.status(400).json({ ok: false, error: "Geçersiz afet." });

  try {
    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT il, \`${afet}\` AS puan FROM sehir_riskleri WHERE \`${afet}\` IS NOT NULL`
    );

    const pts = [];
    for (const r of rows) {
      const il = String(r.il || "");
      const coord = ilKoordinat[il];
      if (!coord) continue;
      const puan = Number(r.puan);
      if (!Number.isFinite(puan)) continue;
      const intensity = Math.min(1, Math.max(0, puan / 10));
      pts.push([coord.lat, coord.lng, intensity]);
    }

    res.json({ ok: true, afet, points: pts });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/coords", (req, res) => {
  res.json({ ok: true, coords: ilKoordinat });
});

app.get("/api/yerlesim/iller", async (req, res) => {
  try {
    const provinces = await yerlesim.getProvinces();
    res.json({ ok: true, iller: provinces.map((p) => p.name) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/yerlesim/ilceler", async (req, res) => {
  const il = String(req.query.il || "").trim();
  if (!il) return res.status(400).json({ ok: false, error: "il gerekli" });
  try {
    const { province, districts } = await yerlesim.getDistrictsByProvinceName(il);
    if (!province) return res.status(404).json({ ok: false, error: "İl bulunamadı" });
    res.json({ ok: true, il: province.name, ilceler: districts.map((d) => d.name) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

function seededRand(seed) {
  let h = 2166136261;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterAround(lat, lng, r, km) {
  const angle = r() * Math.PI * 2;
  const distKm = r() * km;
  const dLat = (distKm / 111) * Math.cos(angle);
  const dLng = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: lat + dLat, lng: lng + dLng };
}

function pickTopRisks(risks) {
  const scored = (risks || []).filter((x) => Number.isFinite(Number(x.puan)));
  scored.sort((a, b) => Number(b.puan) - Number(a.puan));
  return scored.slice(0, 2);
}

app.get("/api/oneri/konum", async (req, res) => {
  const il = String(req.query.il || "").trim();
  const ilce = String(req.query.ilce || "").trim();
  if (!il) return res.status(400).json({ ok: false, error: "il gerekli" });
  if (!ilce) return res.status(400).json({ ok: false, error: "ilce gerekli" });

  try {
    // 1) Risk profili (il bazlı mevcut DB API)
    const iller = await getIllerList();
    const ilMatched = ilMatch.matchIl(il, iller);
    if (!ilMatched) return res.status(404).json({ ok: false, error: "İl bulunamadı" });

    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT il, deprem, sel, heyelan, yangin, cig, kuraklik
       FROM sehir_riskleri WHERE il = ? LIMIT 1`,
      [ilMatched]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: "Bu il için risk verisi yok." });

    const row = rows[0];
    const risks = riskTurleri.map((t) => ({
      key: t.key,
      label: t.label,
      slug: t.slug,
      puan: row[t.key] != null ? Number(row[t.key]) : null,
    }));

    // 2) İlçe bazlı toplanma alanları (il verisi içinden filtre)
    const toplanmaData = await afadToplanma.queryAreas({ il: ilMatched, limit: 10000 });
    const ilceKey = yerlesim.normalizeKey(ilce);
    const alanlarRaw = (toplanmaData.items || []).filter((a) =>
      yerlesim.normalizeKey(a.ilce || "").includes(ilceKey)
    );

    // Konum merkezini il koordinatından türet + ilçe için küçük jitter
    const base = ilKoordinat[ilMatched] || { lat: 39, lng: 35 };
    const r = seededRand(`${ilMatched}|${ilce}`);
    const center = jitterAround(base.lat, base.lng, r, 18);

    // Yakın toplanma alanlarını merkezden sırala (ilçe filtresi varsa onu kullan, yoksa il geneli)
    const rowsForDist = (alanlarRaw.length ? alanlarRaw : toplanmaData.items || []).map((x) => ({
      ...x,
      kapasite: null,
    }));
    const yakinAlanlar = rowsForDist.length
      ? toplanma.withDistance(rowsForDist, center.lat, center.lng).slice(0, 6)
      : [];

    // 3) Hastaneler (tahmini)
    const hospitalNames = [
      "Devlet Hastanesi",
      "Şehir Hastanesi",
      "Eğitim ve Araştırma Hastanesi",
      "Acil Sağlık Noktası",
    ];
    const hospitals = Array.from({ length: 5 }).map((_, i) => {
      const p = jitterAround(center.lat, center.lng, r, 12);
      const t = hospitalNames[Math.floor(r() * hospitalNames.length)];
      return {
        id: `h-${i + 1}`,
        name: `${ilMatched} ${ilce} ${t}`,
        lat: p.lat,
        lng: p.lng,
        triage: r() > 0.7 ? "Yoğun" : "Normal",
      };
    });

    // 4) Trafik (tahmini) + öneri metinleri
    const traffic = {
      level: r() > 0.75 ? "Çok yoğun" : r() > 0.5 ? "Yoğun" : r() > 0.25 ? "Orta" : "Açık",
      note: "Trafik yoğunluğu tahmini bir göstergedir (simülasyon).",
    };

    const top = pickTopRisks(risks);
    const genelOneriler = [
      "Aile afet planınızı güncelleyin ve bir şehir dışı irtibat kişisi belirleyin.",
      "Toplanma alanına gidiş için 2 alternatif rota belirleyin (yaya + araç).",
      "Acil çanta checklist’ini tamamlayın ve erişilebilir bir yerde tutun.",
      "Elektrik/gaz/su vanalarını kapatma adımlarını ev halkıyla paylaşın.",
    ];
    const riskOnerileri = top.map((t) => ({
      title: `${t.label} riski öne çıkıyor (${t.puan}/10)`,
      href: t.slug ? `/afet/${t.slug}` : null,
    }));

    res.json({
      ok: true,
      il: ilMatched,
      ilce,
      center,
      risks,
      topRisks: top,
      toplanma: {
        totalInIl: (toplanmaData.items || []).length,
        totalInIlce: alanlarRaw.length,
        nearest: yakinAlanlar,
        syncing: Boolean(toplanmaData.syncing),
        message: toplanmaData.message || null,
      },
      hospitals,
      traffic,
      recommendations: {
        risk: riskOnerileri,
        general: genelOneriler,
      },
      disclaimer:
        "Bu öneriler bilgilendirme amaçlıdır; resmi yönlendirmeler için AFAD/valilik duyurularını takip edin.",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/toplanma/meta", async (req, res) => {
  try {
    const data = await afadToplanma.getMeta();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/toplanma", async (req, res) => {
  const il = String(req.query.il || "").trim();
  const bbox = String(req.query.bbox || "").trim();
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  try {
    const data = await afadToplanma.queryAreas({ il, bbox, limit });
    if (!data.ok) return res.status(400).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/toplanma/yakin", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, error: "lat ve lng gerekli." });
  }

  try {
    const data = await afadToplanma.queryNearest({ lat, lng, limit });
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/harita", (req, res) => {
  const il = String(req.query.il || "").trim();
  if (il) return res.redirect(`/il-riskleri?il=${encodeURIComponent(il)}`);
  res.redirect("/il-riskleri");
});

app.get("/konum-hizmetleri", (req, res) => {
  res.render("konum-hizmetleri", {
    pageTitle: "Risk ve Toplanma",
    nav: afetler,
  });
});

app.get("/il-riskleri", async (req, res, next) => {
  try {
    const senaryoWidgetHtml = await renderPartial(res, "partials/home-senaryo-widget");
    res.render("il-riskleri", {
      pageTitle: "İle Göre Riskler",
      nav: afetler,
      pageHero: {
        title: "İle Göre Afet Riskleri",
        lead: "İl seçerek deprem, sel, heyelan ve diğer afet risklerini tek sayfada görün.",
        crumbs: [{ label: "Anasayfa", href: "/" }, { label: "İle Göre Riskler" }],
      },
      senaryoWidgetHtml,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/hazirlik-sorular.json", (req, res) => {
  res.sendFile(path.join(__dirname, "data", "hazirlik-sorular.json"));
});

app.post("/api/hazirlik/akilli-oneri", async (req, res) => {
  const il = String(req.body?.il || req.query?.il || "").trim();
  const ilce = String(req.body?.ilce || req.query?.ilce || "").trim();
  const categoryScores = req.body?.categoryScores || null;
  const weakThreshold = Number(req.body?.weakThreshold) || 7;

  if (!il) {
    return res.status(400).json({ ok: false, error: "İl seçimi gerekli." });
  }

  try {
    const iller = await getIllerList();
    const ilMatched = ilMatch.matchIl(il, iller);
    if (!ilMatched) {
      return res.status(404).json({ ok: false, error: "İl bulunamadı. Listeden seçin." });
    }

    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT il, deprem, sel, heyelan, yangin, cig, kuraklik
       FROM sehir_riskleri WHERE il = ? LIMIT 1`,
      [ilMatched]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Bu il için risk verisi yok." });
    }

    const row = rows[0];
    const risks = riskTurleri.map((t) => ({
      key: t.key,
      label: t.label,
      slug: t.slug,
      puan: row[t.key] != null ? Number(row[t.key]) : null,
    }));

    const coord = ilKoordinat[ilMatched] || null;
    const [meteoToday, meteoTomorrow, fires] = await Promise.all([
      mgmMeteouyari.getMeteoUyari(1),
      mgmMeteouyari.getMeteoUyari(2),
      yanginCanli.getLiveFireMap(),
    ]);

    const liveContext = canliUyarilar.buildForIl(ilMatched, {
      meteoToday,
      meteoTomorrow,
      fires,
      coord,
    });

    const payload = hazirlikOneri.buildRecommendations({
      il: ilMatched,
      ilce: ilce || null,
      risks,
      categoryScores,
      weakThreshold,
      liveContext,
    });

    res.json({ ok: true, ...payload });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/afet-bilgi-sorular.json", (req, res) => {
  res.sendFile(path.join(__dirname, "data", "afet-bilgi-sorular.json"));
});

app.get("/farkindalik-quiz.json", (req, res) => {
  res.sendFile(path.join(__dirname, "data", "farkindalik-quiz.json"));
});

app.get("/hazirlik-skoru", (req, res) => {
  res.render("hazirlik-skoru", {
    pageTitle: "Hazırlık & Afet Bilgi Testi",
    nav: afetler,
    pageHero: {
      title: "Hazırlık & Afet Bilgi Testi",
      lead: "Hazırlık öz değerlendirmesi ve çoktan seçmeli afet bilgi testi ile seviyenizi ölçün.",
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "Hazırlık & Afet Bilgi Testi" }],
    },
  });
});

app.get("/acil-canta", (req, res) => {
  res.render("acil-canta", {
    pageTitle: "Acil Durum Çantası",
    nav: afetler,
    pageHero: {
      title: "Acil Durum Çantası Checklist",
      lead: "Temel ihtiyaçları hızlıca kontrol edin ve tamamladıklarınızı işaretleyin.",
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "Acil Çanta" }],
    },
  });
});

app.get("/aile-afet-plani", (req, res) => {
  res.render("aile-afet-plani", {
    pageTitle: "Aile Afet Planı",
    nav: afetler,
    pageHero: {
      title: "Aile Afet Planı Oluşturucu",
      lead: "Buluşma noktaları ve iletişim bilgilerinizi düzenleyin, yazdırın.",
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "Aile Afet Planı" }],
    },
  });
});

app.get("/kaynaklar", (req, res) => {
  res.render("kaynaklar", {
    pageTitle: "Farkındalık Merkezi",
    nav: afetler,
    pageHero: {
      title: "Farkındalık Merkezi",
      lead: "Yaşa göre afet eğitimi içerikleri, mini etkinlikler ve pratik hazırlık araçları.",
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "Farkındalık Merkezi" }],
    },
  });
});

app.get("/toplanma-alanlari", async (req, res) => {
  let meta = { total: 0, syncedCount: 0, totalIller: 81 };
  try {
    meta = await afadToplanma.getMeta();
  } catch {
    /* meta yüklenemezse sayfa yine açılır */
  }
  res.render("toplanma-alanlari", {
    pageTitle: "Toplanma Alanları",
    nav: afetler,
    pageHero: {
      title: "Toplanma Alanları",
      lead: "AFAD e-Devlet verilerine dayalı Türkiye geneli acil toplanma alanlarını haritada görüntüleyin.",
    meta,
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "Toplanma Alanları" }],
    },
  });
});

app.get("/karsilastirmalar", (req, res) => {
  res.render("karsilastirmalar-index", {
    pageTitle: karsilastirmalar.title,
    nav: afetler,
    karsilastirmalar,
  });
});

app.get("/karsilastirmalar/:slug", (req, res) => {
  const item = findKarsilastirma(req.params.slug);
  if (!item) {
    return res.status(404).render("notfound", {
      pageTitle: "Sayfa bulunamadı",
      nav: afetler,
      message: "Karşılaştırma sayfası bulunamadı.",
    });
  }
  res.render("karsilastirma", {
    pageTitle: item.title,
    nav: afetler,
    karsilastirmalar,
    item,
  });
});

app.get("/mikroboleme", (req, res) => {
  res.render("mikroboleme", {
    pageTitle: mikroboleme.title,
    nav: afetler,
    page: mikroboleme,
  });
});

app.get("/afet-mudahale-plani", (req, res) => {
  res.render("afet-mudahale-plani", {
    pageTitle: afetMudahalePlani.title,
    nav: afetler,
    page: afetMudahalePlani,
  });
});

app.get("/duyurular", (req, res) => res.redirect(301, "/afet-mudahale-plani"));
app.get("/duyurular/:slug", (req, res) => res.redirect(301, "/afet-mudahale-plani"));

app.get(/^\/mikrob[oö]lgeleme\/?$/i, (req, res) => res.redirect(301, "/mikroboleme"));
app.get("/acil-rehber", (req, res) => res.redirect(301, "/mikroboleme"));
app.get("/acil-rehber/:slug", (req, res) => res.redirect(301, "/mikroboleme"));
app.get("/rehber", (req, res) => res.redirect(301, "/mikroboleme"));

app.get("/afetler", (req, res) => {
  res.redirect("/afetler/jeolojik");
});

app.get("/afetler/:categorySlug", (req, res) => {
  const category = findCategory(req.params.categorySlug);
  if (!category) {
    return res.status(404).render("notfound", {
      pageTitle: "Sayfa bulunamadı",
      nav: afetler,
      message: "Kategori bulunamadı.",
    });
  }

  res.render("category", {
    pageTitle: category.title,
    nav: afetler,
    category,
    pageHero: {
      title: category.title,
      lead: "Bu kategorideki afet türlerine aşağıdan veya üst menüden ulaşabilirsiniz.",
      crumbs: [
        { label: "Anasayfa", href: "/" },
        { label: category.title },
      ],
    },
  });
});

app.get("/afet/:disasterSlug", (req, res) => {
  const found = findDisaster(req.params.disasterSlug);
  if (!found) {
    return res.status(404).render("notfound", {
      pageTitle: "Sayfa bulunamadı",
      nav: afetler,
      message: "Afet sayfası bulunamadı.",
    });
  }

  res.render("disaster", {
    pageTitle: found.disaster.title,
    nav: afetler,
    category: found.category,
    disaster: found.disaster,
    pageHero: {
      title: found.disaster.title,
      lead: `${found.category.title} kapsamında bilgi, risk haritası ve önlem rehberi.`,
      crumbs: [
        { label: "Anasayfa", href: "/" },
        { label: found.category.title, href: `/afetler/${found.category.slug}` },
        { label: found.disaster.title },
      ],
    },
  });
});

app.use((req, res) => {
  res.status(404).render("notfound", {
    pageTitle: "Sayfa bulunamadı",
    nav: afetler,
    message: "Aradığınız sayfa bulunamadı.",
  });
});

app.listen(PORT, () => {
  console.log(`Afet Portalı çalışıyor: http://localhost:${PORT}`);

  (async () => {
    try {
      const meta = await afadToplanma.getMeta();
      if (meta.syncedCount === 0) {
        console.log("[toplanma] Önbellek boş; GitHub verisi indiriliyor…");
        await afadToplanma.importGithubBundle((m) => console.log("[toplanma]", m));
        afadToplanma.reloadIndex();
      }
      if (process.env.TOPLANMA_SYNC_ALL === "true") {
        console.log("[toplanma] Eksik iller arka planda senkronize ediliyor…");
        afadToplanma
          .syncAllMissing((m) => console.log("[toplanma]", m))
          .then(() => console.log("[toplanma] Tam senkronizasyon bitti."))
          .catch((err) => console.error("[toplanma] Senkronizasyon hatası:", err.message));
      }
    } catch (err) {
      console.error("[toplanma] Başlangıç yüklemesi:", err.message);
    }
  })();
});