const path = require("path");
const express = require("express");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

const afetler = require("./data/afetler.json");
const db = require("./src/db");
const toplanma = require("./src/toplanma");
const ilMatch = require("./src/il-match");
const ilKoordinat = require("./data/il-koordinat.json");
const riskTurleri = require("./data/risk-turleri.json");
const karsilastirmalar = require("./data/karsilastirmalar.json");
const mikroboleme = require("./data/mikroboleme.json");
const afetMudahalePlani = require("./data/afet-mudahale-plani.json");

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

app.get("/", (req, res) => {
  res.render("home", {
    pageTitle: "Anasayfa",
    nav: afetler,
  });
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

app.get("/api/toplanma", async (req, res) => {
  const il = String(req.query.il || "").trim();
  try {
    const pool = db.getPool();
    let sql =
      "SELECT id, ad, il, ilce, adres, lat, lng, kapasite FROM toplanma_alanlari";
    const params = [];
    if (il) {
      sql += " WHERE il = ?";
      params.push(il);
    }
    sql += " ORDER BY il ASC, ad ASC";
    const [rows] = await pool.query(sql, params);
    const items = rows.map((r) => ({
      id: r.id,
      ad: r.ad,
      il: r.il,
      ilce: r.ilce,
      adres: r.adres,
      lat: Number(r.lat),
      lng: Number(r.lng),
      kapasite: r.kapasite,
    }));
    res.json({ ok: true, items });
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes("toplanma_alanlari")) {
      return res.status(503).json({
        ok: false,
        error: "toplanma_alanlari tablosu bulunamadı. veri/toplanma_alanlari.sql dosyasını import edin.",
      });
    }
    res.status(500).json({ ok: false, error: msg });
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
    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT id, ad, il, ilce, adres, lat, lng, kapasite
       FROM toplanma_alanlari
       WHERE lat IS NOT NULL AND lng IS NOT NULL`
    );
    const items = toplanma.withDistance(rows, lat, lng).slice(0, limit);
    res.json({ ok: true, items });
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes("toplanma_alanlari")) {
      return res.status(503).json({
        ok: false,
        error: "toplanma_alanlari tablosu bulunamadı. veri/toplanma_alanlari.sql dosyasını import edin.",
      });
    }
    res.status(500).json({ ok: false, error: msg });
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

app.get("/il-riskleri", (req, res) => {
  res.render("il-riskleri", {
    pageTitle: "İle Göre Riskler",
    nav: afetler,
    pageHero: {
      title: "İle Göre Afet Riskleri",
      lead: "İl seçerek deprem, sel, heyelan ve diğer afet risklerini tek sayfada görün.",
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "İle Göre Riskler" }],
    },
  });
});

app.get("/hazirlik-sorular.json", (req, res) => {
  res.sendFile(path.join(__dirname, "data", "hazirlik-sorular.json"));
});

app.get("/hazirlik-skoru", (req, res) => {
  res.render("hazirlik-skoru", {
    pageTitle: "Hazırlık Skoru",
    nav: afetler,
    pageHero: {
      title: "Afet Hazırlık Testi",
      lead: "10 soruluk test ile ev ve aile hazırlık seviyenizi ölçün.",
      crumbs: [{ label: "Anasayfa", href: "/" }, { label: "Hazırlık Testi" }],
    },
  });
});

app.get("/toplanma-alanlari", (req, res) => {
  res.render("toplanma-alanlari", {
    pageTitle: "Toplanma Alanları",
    nav: afetler,
    pageHero: {
      title: "Toplanma Alanları",
      lead: "Haritada toplanma alanlarını görüntüleyin ve konumunuza en yakın alanları bulun.",
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
});