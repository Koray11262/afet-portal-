/**
 * Bölgesel risk verisine ve hazırlık testi skorlarına göre kural tabanlı öneri üretir.
 */

const RISK_LEVEL = (puan) => {
  const s = Number(puan);
  if (!Number.isFinite(s)) return "unknown";
  if (s >= 7) return "high";
  if (s >= 4) return "medium";
  return "low";
};

const LEVEL_LABEL = { high: "Yüksek", medium: "Orta", low: "Düşük", unknown: "—" };

const DISASTER_GUIDE = {
  deprem: {
    label: "Deprem",
    highIntro:
      "Aktif fay hatlarına yakınlık veya yerel zemin koşulları nedeniyle deprem riski öne çıkıyor.",
    prep: [
      "Çök-kapan-tutun hareketini ayda bir tüm aileyle uygulayın; masa altı ve güvenli köşeleri belirleyin.",
      "Ağır mobilyaları L demiri veya duvar bağlantılarıyla sabitleyin; üst raflara ağır eşya koymayın.",
      "Bina tahliye planını ve merdiven toplanma noktasını öğrenin; asansör kullanmayın.",
      "Deprem sonrası gaz kaçağı ihtimaline karşı vananın yerini bilin; sarsıntı bitene kadar gazı kapatmayı planlayın.",
      "Cam ve vitrinlere yakın yatak/koltuk konumlandırmayın; kırılma riskini azaltın.",
      "Okul ve iş yerindeki acil toplanma prosedürlerini aile bireyleriyle paylaşın.",
    ],
    equip: [
      "Deprem çantası: su, dayanıklı gıda, düdük, el feneri, ilk yardım seti",
      "Battaniye ve yedek kıyafet (mevsime uygun)",
      "Powerbank ve yedek pil; radyo veya pil ile çalışan acil haber kaynağı",
      "İş eldiveni ve toz maskesi (enkaz/toz senaryosu)",
      "Su geçirmez dosyada kimlik ve tapu fotokopileri",
      "Duvara sabitleme seti (mobilya, TV, raf)",
    ],
  },
  sel: {
    label: "Sel / Taşkın",
    highIntro: "Yağış, dere yatağı veya altyapı taşkınlarına karşı sel riski yüksek görünüyor.",
    prep: [
      "Bodrum ve zemin kat eşyalarını yükseltin; elektrik panosu ve prizleri sel seviyesinin üzerinde tutun.",
      "Yağışlı günlerde dere, vadi ve alçak geçitlerden uzak durun; araçla su birikintisine girmeyin.",
      "Ev girişine kum torbası veya geçici bariyer planı yapın (özellikle tekrarlayan taşkın bölgelerinde).",
      "Kanalizasyon geri tepmesine karşı geri vana ve sigorta kapsamını kontrol edin.",
      "Aile planında yüksek kotlu alternatif buluşma noktası tanımlayın.",
      "MGM/AFAD uyarılarını takip edin; erken tahliye kararı için komşuluk iletişim ağı kurun.",
    ],
    equip: [
      "Su geçirmez çanta ve belge dosyası",
      "Yağmurluk, çizme veya su geçirmez ayakkabı",
      "El pompası veya küçük su emici (ev tipi)",
      "Temiz içme suyu stoğu (kişi başı en az 3 gün)",
      "Dezenfektan ve hijyen malzemesi",
      "Araçta acil set: reflektör, çekme halatı, powerbank",
    ],
  },
  heyelan: {
    label: "Heyelan",
    highIntro: "Eğimli arazi, zayıf zemin veya geçmiş kayma alanları heyelan riskini artırıyor.",
    prep: [
      "Yağış sonrası yamaç altı ve dere yatağına yakın konutlarda gece tahliyesi planı yapın.",
      "Yamaç üstündeki drenaj ve su yönlendirmesini kontrol edin; su birikintisi oluşturmayın.",
      "Çatlak, kapı/pencere sıkışması, duvar eğriliği gibi erken uyarı işaretlerini öğrenin.",
      "Riskli hava koşullarında alternatif barınma adresi (akraba/otel) belirleyin.",
      "Belediye ve AFAD heyelan haritalarını inceleyin; yeni yapılaşma kararlarını buna göre verin.",
      "Arazi mühendisliği raporu gerektiren bölgelerde uzman görüşü alın.",
    ],
    equip: [
      "Hızlı tahliye çantası (ev girişine yakın)",
      "Sağlam ayakkabı ve el feneri",
      "Harita veya offline navigasyon (şebeke kesintisi için)",
      "İletişim: tam şarjlı telefon + powerbank",
      "Yağmurluk ve soğuk hava katmanı",
      "Aile iletişim kartı (kağıt yedek)",
    ],
  },
  yangin: {
    label: "Orman yangını",
    highIntro: "Ormanlık alan yakınlığı ve kurak dönemler yangın riskini yükseltiyor.",
    prep: [
      "Orman ve makilik alana yakın bölgelerde ateş yakmayın; izin verilen alanlarda kurallara uyun.",
      "Ev çevresinde 10–30 m savunma bandı: kuru ot, yanıcı artık temizliği",
      "Tahliye yönünü ve alternatif yolları önceden sürüşle deneyin.",
      "Dumanlı havada solunum koruyucu (FFP2) ve gözlük bulundurun.",
      "Kritik eşyaları tek çantada toplayın; 15 dakikada çıkış senaryosu prova edin.",
      "Yangın uyarı uygulamalarını ve yerel belediye duyurularını takip edin.",
    ],
    equip: [
      "Duman maskesi (FFP2 veya daha iyisi)",
      "Gözlük ve başörtüsü/şapka (koruma)",
      "Acil çanta + su (tahliye süresine göre artırın)",
      "Araçta: yangın söndürücü, reflektör, ilk yardım",
      "Harita ve tam şarjlı telefon",
      "Nefes almayı kolaylaştıran ıslak havlu (kısa süreli duman)",
    ],
  },
  cig: {
    label: "Çığ",
    highIntro: "Yüksek rakım ve kar örtüsü çığ riski taşıyor.",
    prep: [
      "Kış turizmi ve dağ yollarında hava ve çığ bulletin’ini kontrol edin; riskli günlerde rotayı erteleyin.",
      "Çığ transceiver (ARVA), kürek ve sonda eğitimi alın; grup halinde hareket edin.",
      "Kar yükü artışı sonrası yamaç altı konutlarda geçici tahliye planı yapın.",
      "Tek başına izole patikalardan kaçının; konumunuzu birine bildirin.",
      "Çatı kar yükünü düzenli kontrol edin; güvenli uzaklıktan temizlik yaptırın.",
      "Acil 112 ve yerel kurtarma numaralarını kaydedin.",
    ],
    equip: [
      "Çığ güvenlik seti (ARVA, sonda, kürek) — dağ aktivitesi için",
      "Termal iç çamaşırı ve rüzgâr geçirmez dış katman",
      "Acil gıda ve su (ısı yalıtımlı matara)",
      "İlk yardım ve acil battaniye (space blanket)",
      "Powerbank ve düdük",
      "Kar zinciri ve araçta kar küreği (kış sürüşü)",
    ],
  },
  kuraklik: {
    label: "Kuraklık",
    highIntro: "Uzun süreli yağış azlığı ve su stresi kuraklık riskini artırıyor.",
    prep: [
      "Su tüketimini izleyin; sızıntıları giderin, yağmur suyu toplama imkânını değerlendirin.",
      "Bahçe sulamasında sabah/akşam saatlerini tercih edin; damla sulama kullanın.",
      "Yangın riskiyle birlikte kuru bitki örtüsünü temizleyin.",
      "Gıda ve hayvancılık planınızı su kısıtına göre güncelleyin (kırsal bölgeler).",
      "Belediye su kesintisi duyurularına karşı depolama planı yapın.",
      "Uzun vadede su tasarruflu ev aletleri ve gri su kullanımını araştırın.",
    ],
    equip: [
      "Yedek içme suyu deposu (kapasite aile büyüklüğüne göre)",
      "Su arıtma veya tablet/filtre (acil senaryo)",
      "Sızdırmaz kaplar ve ölçekli sulama ekipmanı",
      "Nem ve sıcaklık korumalı gıda saklama",
      "Elde dezenfeksiyon ve hijyen stoku",
      "Kuru dönem yangın seti (yangın riski birlikte artabilir)",
    ],
  },
};

const CATEGORY_PERSONAL = {
  "ev-guvenligi": {
    name: "Ev Güvenliği",
    weak: [
      "Test sonucunuza göre ev güvenliği zayıf: mobilya sabitleme ve tahliye yolu önceliğiniz olsun.",
      "Ağır eşyaları duvara sabitleyin; cam ve devrilebilir eşyalardan uyku/oturma alanlarını uzaklaştırın.",
      "Anahtar, ayakkabı ve el fenerini yatak odası yakınında sabit bir noktada toplayın.",
    ],
  },
  "acil-durum": {
    name: "Acil Durum Hazırlığı",
    weak: [
      "Acil durum hazırlığı skorunuz düşük: çantayı bu hafta tamamlayıp kapı yanına koyun.",
      "Su, gıda, ilaç ve powerbank için 72 saatlik minimum stok hedefleyin.",
      "Çanta içeriğini 3 ayda bir tarih ve pil kontrolüyle yenileyin.",
    ],
  },
  iletisim: {
    name: "İletişim ve Planlama",
    weak: [
      "İletişim planı eksik: aile WhatsApp grubu + kağıt yedek liste oluşturun.",
      "Şehir dışı irtibat kişisi ve buluşma noktalarını yazılı plana ekleyin.",
      "112 ve AFAD numaralarını telefona ve cüzdana kaydedin.",
    ],
  },
  bilinc: {
    name: "Bilinç ve Eğitim",
    weak: [
      "Bilinç skorunuz geliştirilebilir: bölgenizdeki öncelikli afet için AFAD rehberini okuyun.",
      "Yılda en az bir okul/iş yeri tatbikatına katılın veya evde mini tatbikat yapın.",
      "Farkındalık Merkezi’ndeki yaş grubunuza uygun içerikleri inceleyin.",
    ],
  },
};

function riskSort(risks) {
  return [...risks].sort((a, b) => Number(b.puan) - Number(a.puan));
}

function pickByLevel(guide, level) {
  const prep = guide.prep || [];
  const equip = guide.equip || [];
  if (level === "high") return { prep: prep.slice(0, 6), equip: equip.slice(0, 6) };
  if (level === "medium") return { prep: prep.slice(0, 4), equip: equip.slice(0, 4) };
  return { prep: prep.slice(0, 2), equip: equip.slice(0, 2) };
}

function buildRecommendations({ il, ilce, risks, categoryScores, weakThreshold = 7, liveContext }) {
  const sorted = riskSort(risks.filter((r) => Number.isFinite(Number(r.puan))));
  const top = sorted[0];
  const highRisks = sorted.filter((r) => RISK_LEVEL(r.puan) === "high");
  const mediumRisks = sorted.filter((r) => RISK_LEVEL(r.puan) === "medium");

  const loc = ilce ? `${ilce}, ${il}` : il;
  const topNames = sorted
    .slice(0, 3)
    .map((r) => `${r.label} (${r.puan}/10)`)
    .join("; ");

  const summaryParts = [];
  if (liveContext?.headline) summaryParts.push(liveContext.headline);
  summaryParts.push(
    `${loc} için veri tabanlı analiz tamamlandı.`,
    topNames ? `Öne çıkan riskler: ${topNames}.` : "",
    highRisks.length
      ? `${highRisks.length} afet türünde yüksek risk görünüyor — öncelikli hazırlık ve ekipman listesine odaklanın.`
      : "Genel risk profili orta/düşük seviyede; yine de temel afet çantası ve aile planı önerilir."
  );

  const riskyDisasters = sorted.map((r) => {
    const level = RISK_LEVEL(r.puan);
    const guide = DISASTER_GUIDE[r.key] || { label: r.label, prep: [], equip: [] };
    return {
      key: r.key,
      label: r.label,
      slug: r.slug,
      score: r.puan,
      level,
      levelLabel: LEVEL_LABEL[level],
      intro:
        level === "high"
          ? guide.highIntro || `${r.label} riski bu bölgede yüksek görünüyor.`
          : level === "medium"
            ? `${r.label} için orta düzey risk; önleyici adımlar faydalı olur.`
            : `${r.label} riski görece düşük; temel hazırlık yeterli olabilir.`,
      href: r.slug ? `/afet/${r.slug}` : null,
    };
  });

  const preparation = [];
  const equipment = [];

  if (liveContext?.prepFromLive?.length) {
    preparation.push({
      title: `Canlı uyarılara göre — ${il} (MGM / yangın haritası)`,
      riskKey: "canli",
      items: liveContext.prepFromLive,
    });
  }
  if (liveContext?.equipFromLive?.length) {
    equipment.push({
      title: "Canlı uyarılara göre ek ekipman",
      riskKey: "canli",
      items: liveContext.equipFromLive,
    });
  }

  for (const r of sorted) {
    const level = RISK_LEVEL(r.puan);
    if (level === "unknown") continue;
    const guide = DISASTER_GUIDE[r.key];
    if (!guide) continue;
    const picked = pickByLevel(guide, level);
    if (picked.prep.length) {
      preparation.push({
        title: `${guide.label} — hazırlık (${LEVEL_LABEL[level]} risk)`,
        riskKey: r.key,
        items: picked.prep,
      });
    }
    if (picked.equip.length) {
      equipment.push({
        title: `${guide.label} — önerilen ekipman`,
        riskKey: r.key,
        items: picked.equip,
      });
    }
  }

  preparation.push({
    title: "Tüm bölgeler için genel hazırlık",
    riskKey: "genel",
    items: [
      "Aile afet planı oluşturun: buluşma noktası, şehir dışı iletişim kişisi, evcil hayvan planı.",
      "Yılda iki kez acil çanta ve ilaç stok tarihlerini kontrol edin.",
      "Toplanma alanlarını öğrenin; evden yaya ve araçla ulaşım süresini tahmin edin.",
      "Komşularınızla dayanışma listesi (yaşlı, engelli, yalnız yaşayan) oluşturun.",
      "Sigorta poliçeleri ve tapu/kira belgelerinin dijital ve basılı kopyasını saklayın.",
      "Afet anında SMS’in aramadan daha etkili olabileceğini aile bireylerine hatırlatın.",
    ],
  });

  equipment.push({
    title: "Temel acil durum ekipmanı (her ev)",
    riskKey: "genel",
    items: [
      "72 saatlik su ve dayanıkmaz gıda",
      "İlk yardım çantası ve kişisel ilaçlar",
      "El feneri, düdük, çok amaçlı çakı",
      "Powerbank ve yedek şarj kablosu",
      "Nakit para (küçük banknotlar)",
      "Su geçirmez belge dosyası",
      "Hijyen: ıslak mendil, çöp torbası, sabun",
      "Bebek/yaşlı ihtiyaçları (aileye özel)",
    ],
  });

  const personalized = [];
  if (categoryScores && typeof categoryScores === "object") {
    for (const [id, score] of Object.entries(categoryScores)) {
      const s = Number(score);
      if (!Number.isFinite(s) || s >= weakThreshold) continue;
      const block = CATEGORY_PERSONAL[id];
      if (!block) continue;
      const topRisk = top?.label || "bölgesel afet";
      personalized.push({
        title: `${block.name} (test skoru: ${s}/10)`,
        items: [
          ...block.weak,
          `Bölgenizde öncelikli risk "${topRisk}" ile birlikte bu alanı bu ay içinde güçlendirmeniz önerilir.`,
        ],
      });
    }
  }

  const regionalExtras = [
    {
      title: "Bölgesel öncelik",
      items: top
        ? [
            `${il} genelinde en yüksek görünen risk: ${top.label} (${top.puan}/10). İlgili rehberi okuyup çanta ve ev önlemlerini buna göre özelleştirin.`,
          ]
        : [],
    },
    {
      title: "İletişim ve erken uyarı",
      items: [
        "AFAD ve MGM uyarılarını açın; yerel belediye bildirimlerini takip edin.",
        "Acil durum uyarılarını sessize almayın; gece modunda kritik bildirimleri istisna tutun.",
        "İnternet kesintisine karşı offline harita ve kağıt toplanma alanı listesi bulundurun.",
      ],
    },
    {
      title: "Tahliye ve ulaşım",
      items: [
        "Ana tahliye yolunu ve alternatifini haritada işaretleyin.",
        "Araç yakıt seviyesini kritik hava uyarılarından önce dolu tutun.",
        "Toplanma alanına yürüme süresini bir kez gerçekten ölçün.",
      ],
    },
  ];

  let totalItems =
    riskyDisasters.length +
    preparation.reduce((a, s) => a + s.items.length, 0) +
    equipment.reduce((a, s) => a + s.items.length, 0) +
    personalized.reduce((a, s) => a + s.items.length, 0) +
    regionalExtras.reduce((a, s) => a + s.items.length, 0);

  const liveAlerts = liveContext?.alerts || [];
  totalItems += liveAlerts.reduce((a, al) => a + (al.prep?.length || 0), 0);

  return {
    summary: summaryParts.filter(Boolean).join(" "),
    location: { il, ilce: ilce || null },
    topRisk: top || null,
    highRiskCount: highRisks.length,
    mediumRiskCount: mediumRisks.length,
    liveAlerts,
    liveStatus: liveContext
      ? {
          meteo: liveContext.meteo,
          fire: liveContext.fire,
        }
      : null,
    riskyDisasters,
    preparation,
    equipment,
    personalized,
    regionalExtras,
    totalRecommendations: totalItems,
    disclaimer:
      "Öneriler il risk veritabanı, MGM MeteoUyarı, anasayfa yangın haritası (uydu sıcak noktaları), hazırlık testi skorlarınız ve afet hazırlığı rehberlerine göre otomatik üretilir. Resmi uyarılar için AFAD, MGM ve valilik duyurularını esas alın.",
  };
}

module.exports = {
  buildRecommendations,
  RISK_LEVEL,
  LEVEL_LABEL,
};
