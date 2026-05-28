/**
 * Kişisel hazırlık özeti — localStorage birleştirme (anasayfa + hazırlık skoru).
 */
(function (global) {
  const KEYS = {
    CANTA: "afet:canta:v1",
    HOME_CHECK: "senior_home_check_v1",
    HAZIRLIK: "hazirlik_last_scores_v1",
    BILGI: "hazirlik_bilgi_scores_v1",
    PROFILE: "afet_portal_profile_v1",
    TEEN_SCENARIOS: "teen_scenario_total_v1",
    BADGES: "awareness_badges_v1",
  };

  const CANTA_ITEMS = [
    { id: "su", label: "Su stoğu" },
    { id: "gida", label: "Dayanıklı gıda" },
    { id: "ilkYardim", label: "İlk yardım seti" },
    { id: "ilac", label: "Kişisel ilaçlar" },
    { id: "fener", label: "Fener ve pil" },
    { id: "powerbank", label: "Powerbank" },
    { id: "radyo", label: "Pilli radyo" },
    { id: "battaniye", label: "Battaniye" },
    { id: "yedekKiyafet", label: "Yedek kıyafet" },
    { id: "hijyen", label: "Hijyen seti" },
    { id: "belge", label: "Belge kopyaları" },
    { id: "duuduk", label: "Düdük" },
  ];

  const HOME_CHECK_ITEMS = [
    { id: "bag", label: "Acil durum çantası hazır mı?" },
    { id: "meds", label: "İlaç yedeği güncel mi?" },
    { id: "numbers", label: "Acil numaralar kayıtlı mı?" },
    { id: "plan", label: "Aile buluşma planı var mı?" },
    { id: "assembly", label: "Toplanma alanı biliniyor mu?" },
    { id: "supplies", label: "Su ve gıda yedeği var mı?" },
    { id: "power", label: "Fener / powerbank hazır mı?" },
    { id: "docs", label: "Belge kopyaları güvende mi?" },
    { id: "exit", label: "Tahliye yolu açık mı?" },
  ];

  const HAZIRLIK_CAT = {
    "ev-guvenligi": { name: "Ev Güvenliği", href: "/kaynaklar#yas-40-plus" },
    "acil-durum": { name: "Acil Durum", href: "/acil-canta" },
    iletisim: { name: "İletişim ve Plan", href: "/aile-afet-plani" },
    bilinc: { name: "Bilinç ve Eğitim", href: "/kaynaklar#yas-10-18" },
  };

  const BADGES = [
    { min: 0, max: 30, id: "baslangic", label: "Başlangıç", emoji: "🌱" },
    { min: 31, max: 55, id: "gelisen", label: "Gelişen", emoji: "📋" },
    { min: 56, max: 75, id: "hazirlikli", label: "Hazırlıklı", emoji: "🛡️" },
    { min: 76, max: 100, id: "usta", label: "Usta Hazırlık", emoji: "⭐" },
  ];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function readSnapshot() {
    const homeRaw = readJson(KEYS.HOME_CHECK, {});
    const answers =
      homeRaw.answers && typeof homeRaw.answers === "object" ? homeRaw.answers : {};
    return {
      canta: readJson(KEYS.CANTA, {}),
      homeAnswers: answers,
      hazirlik: readJson(KEYS.HAZIRLIK, null),
      bilgi: readJson(KEYS.BILGI, null),
      profile: readJson(KEYS.PROFILE, null),
      teenTotal: Number(localStorage.getItem(KEYS.TEEN_SCENARIOS) || "0") || 0,
      badges: Array.isArray(readJson(KEYS.BADGES, [])) ? readJson(KEYS.BADGES, []) : [],
    };
  }

  function saveProfile(il, ilce) {
    try {
      localStorage.setItem(
        KEYS.PROFILE,
        JSON.stringify({
          il: String(il || "").trim(),
          ilce: String(ilce || "").trim(),
          updatedAt: Date.now(),
        })
      );
    } catch {
      /* depolama dolu */
    }
  }

  function cantaProgress(state) {
    const done = CANTA_ITEMS.filter((i) => state[i.id]).length;
    const total = CANTA_ITEMS.length;
    return {
      done,
      total,
      pct: total ? done / total : 0,
      missing: CANTA_ITEMS.filter((i) => !state[i.id]),
    };
  }

  function homeProgress(answers) {
    const done = HOME_CHECK_ITEMS.filter((i) => answers[i.id]).length;
    const total = HOME_CHECK_ITEMS.length;
    return {
      done,
      total,
      pct: total ? done / total : 0,
      missing: HOME_CHECK_ITEMS.filter((i) => !answers[i.id]),
    };
  }

  function hasAnyActivity(snapshot) {
    const c = cantaProgress(snapshot.canta);
    const h = homeProgress(snapshot.homeAnswers);
    return !!(
      snapshot.hazirlik ||
      snapshot.bilgi ||
      c.done > 0 ||
      h.done > 0 ||
      snapshot.profile?.il ||
      snapshot.teenTotal > 0 ||
      snapshot.badges.length
    );
  }

  function computeSummary(snapshot) {
    const canta = cantaProgress(snapshot.canta);
    const home = homeProgress(snapshot.homeAnswers);

    let hazirlikPts = 0;
    let bilgiPts = 0;
    let weakestCat = null;

    if (snapshot.hazirlik?.overall != null) {
      hazirlikPts = (Number(snapshot.hazirlik.overall) / 10) * 35;
      const cats = snapshot.hazirlik.categoryScores || {};
      let min = 11;
      for (const [id, score] of Object.entries(cats)) {
        const s = Number(score);
        if (s < min) {
          min = s;
          weakestCat = { id, score: s, ...(HAZIRLIK_CAT[id] || { name: id, href: "/hazirlik-skoru" }) };
        }
      }
    }

    if (snapshot.bilgi?.percent != null) {
      bilgiPts = (Number(snapshot.bilgi.percent) / 100) * 25;
    }

    const cantaPts = canta.pct * 25;
    const homePts = home.pct * 15;
    const score = Math.round(hazirlikPts + bilgiPts + cantaPts + homePts);

    const badge = BADGES.find((b) => score >= b.min && score <= b.max) || BADGES[0];

    return {
      score,
      badge,
      hasData: hasAnyActivity(snapshot),
      canta,
      home,
      hazirlikPts: Math.round(hazirlikPts),
      bilgiPts: Math.round(bilgiPts),
      cantaPts: Math.round(cantaPts),
      homePts: Math.round(homePts),
      weakestCat,
      snapshot,
    };
  }

  function pickWeeklySteps(summary) {
    const steps = [];
    const snap = summary.snapshot;

    if (!snap.hazirlik) {
      steps.push({
        text: "Hazırlık öz değerlendirme testini tamamlayın.",
        href: "/hazirlik-skoru",
      });
    } else if (summary.weakestCat && summary.weakestCat.score < 7) {
      steps.push({
        text: `${summary.weakestCat.name} kategorisini güçlendirin (puan: ${summary.weakestCat.score}/10).`,
        href: summary.weakestCat.href,
      });
    }

    for (const item of summary.canta.missing.slice(0, 2)) {
      steps.push({
        text: `Acil çantaya ekleyin: ${item.label}.`,
        href: "/acil-canta",
      });
    }

    for (const item of summary.home.missing.slice(0, 2)) {
      steps.push({
        text: `Ev kontrolü: ${item.label}`,
        href: "/kaynaklar#yas-40-plus",
      });
    }

    if (!snap.bilgi) {
      steps.push({
        text: "Afet bilgi testini çözerek bilgi seviyenizi ölçün.",
        href: "/hazirlik-skoru#bilgi",
      });
    }

    if (snap.profile?.il) {
      steps.push({
        text: `${snap.profile.il} için bölgesel risk özeti ve önerileri inceleyin.`,
        href: "/il-riskleri",
        riskIl: snap.profile.il,
      });
    } else {
      steps.push({
        text: "Anasayfadan il seçerek size özel risk önerisi alın.",
        href: "/#homeToolForm",
      });
    }

    if (snap.teenTotal < 2) {
      steps.push({
        text: "Farkındalık merkezinde afet senaryosu deneyin.",
        href: "/kaynaklar#yas-10-18",
      });
    }

    if (summary.canta.done === 0) {
      steps.push({
        text: "Acil durum çantası checklist’ine başlayın.",
        href: "/acil-canta",
      });
    }

    const fillers = [
      { text: "Aile afet planı oluşturucuyu doldurun.", href: "/aile-afet-plani" },
      { text: "Toplanma alanlarını haritada keşfedin.", href: "/toplanma-alanlari" },
      { text: "Deprem rehberinde önce/sıra/sonra adımlarını okuyun.", href: "/afet/deprem" },
    ];

    const seen = new Set();
    const out = [];
    for (const s of [...steps, ...fillers]) {
      const key = s.text.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 3) break;
    }
    return out;
  }

  async function fetchTopRiskForIl(il) {
    if (!il) return null;
    try {
      const res = await fetch(`/api/risk/il/${encodeURIComponent(il)}`);
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.risks)) return null;
      const sorted = [...json.risks].sort((a, b) => Number(b.puan) - Number(a.puan));
      const top = sorted[0];
      if (!top) return null;
      const slugMap = {
        deprem: "deprem",
        sel: "sel-taskin",
        heyelan: "heyelan",
        yangin: "orman-yangini",
        cig: "cig",
        kuraklik: "kuraklik",
      };
      return {
        label: top.label || top.key,
        puan: top.puan,
        href: top.slug ? `/afet/${top.slug}` : slugMap[top.key] ? `/afet/${slugMap[top.key]}` : "/il-riskleri",
      };
    } catch {
      return null;
    }
  }

  global.HazirlikOzet = {
    KEYS,
    CANTA_ITEMS,
    HOME_CHECK_ITEMS,
    BADGES,
    readSnapshot,
    saveProfile,
    computeSummary,
    pickWeeklySteps,
    fetchTopRiskForIl,
    hasAnyActivity,
  };
})(typeof window !== "undefined" ? window : global);
