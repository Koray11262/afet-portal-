(() => {
  const SLOGANS = [
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

  function pickSlogan() {
    return SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
  }

  function applySlogan() {
    const el = document.querySelector("[data-home-slogan]");
    if (!el) return;
    el.textContent = pickSlogan();
  }

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) applySlogan();
  });
})();
