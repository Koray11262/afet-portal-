(function () {
  const form = document.getElementById("ilRiskForm");
  if (!form || typeof L === "undefined") return;

  const input = document.getElementById("ilRiskInput");
  const datalist = document.getElementById("ilRiskList");
  const statusEl = document.getElementById("ilRiskStatus");
  const titleEl = document.getElementById("ilRiskTitle");
  const cardsEl = document.getElementById("ilRiskCards");
  const mapEl = document.getElementById("ilRiskMap");
  const hintEl = document.getElementById("ilRiskHint");

  const COLORS = { yuksek: "#dc2626", orta: "#d97706", dusuk: "#16a34a" };

  function colorForScore(score) {
    const s = Number(score);
    if (!Number.isFinite(s)) return "#e8edf2";
    if (s >= 7) return COLORS.yuksek;
    if (s >= 4) return COLORS.orta;
    return COLORS.dusuk;
  }

  function riskLabel(puan) {
    const s = Number(puan);
    if (!Number.isFinite(s)) return "Veri yok";
    if (s >= 7) return "Yüksek";
    if (s >= 4) return "Orta";
    return "Düşük";
  }

  function featureName(feature) {
    return (
      feature?.properties?.feature_name ||
      feature?.properties?.NAME ||
      feature?.properties?.name ||
      ""
    );
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const map = L.map("ilRiskMap", { zoomControl: true, scrollWheelZoom: true }).setView(
    [39.0, 35.0],
    6
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  let geoLayer = null;
  let geoData = null;

  async function loadGeo() {
    if (geoData) return geoData;
    const res = await fetch("/turkey.geojson");
    if (!res.ok) throw new Error("Harita verisi yüklenemedi");
    geoData = await res.json();
    return geoData;
  }

  function renderCards(risks, il) {
    if (!cardsEl) return;
    const sorted = [...risks].sort((a, b) => Number(b.puan) - Number(a.puan));
    const top = sorted[0];
    if (hintEl && top && Number.isFinite(Number(top.puan))) {
      hintEl.textContent = `${il} için en yüksek görünen risk: ${top.label} (${top.puan}/10).`;
      hintEl.hidden = false;
    } else if (hintEl) {
      hintEl.hidden = true;
    }

    cardsEl.innerHTML = sorted
      .map((r) => {
        const color = colorForScore(r.puan);
        const href = r.slug ? `/afet/${r.slug}` : "#";
        return `
          <a class="ilRiskCard" href="${href}" style="--risk-color:${color}">
            <span class="ilRiskCard__label">${escapeHtml(r.label)}</span>
            <span class="ilRiskCard__score">${Number.isFinite(Number(r.puan)) ? r.puan : "—"}<small>/10</small></span>
            <span class="ilRiskCard__level">${riskLabel(r.puan)}</span>
          </a>
        `;
      })
      .join("");
    cardsEl.hidden = false;
  }

  function renderMap(il, risks) {
    const scores = risks.map((r) => Number(r.puan)).filter(Number.isFinite);
    const avg = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
    const fill = colorForScore(avg);

    if (geoLayer) {
      map.removeLayer(geoLayer);
      geoLayer = null;
    }

    geoLayer = L.geoJSON(geoData, {
      style: (feature) => {
        const name = featureName(feature);
        const selected = name === il;
        return {
          color: selected ? "#0b4d8f" : "#cbd5e1",
          weight: selected ? 2.5 : 1,
          fillColor: selected ? fill : "#e8edf2",
          fillOpacity: selected ? 0.72 : 0.55,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = featureName(feature);
        if (name !== il) return;
        const lines = risks
          .map((r) => `${escapeHtml(r.label)}: ${r.puan ?? "—"}/10`)
          .join("<br/>");
        layer.bindPopup(`<strong>${escapeHtml(il)}</strong><br/>${lines}`);
        layer.openPopup();
      },
    }).addTo(map);

    geoLayer.eachLayer((layer) => {
      if (featureName(layer.feature) === il) {
        const b = layer.getBounds();
        if (b.isValid()) map.fitBounds(b.pad(0.08));
      }
    });

    setTimeout(() => map.invalidateSize(), 150);
  }

  async function showIl(ilName) {
    setStatus("Risk verileri yükleniyor…");
    if (cardsEl) cardsEl.hidden = true;
    if (hintEl) hintEl.hidden = true;

    try {
      const res = await fetch(`/api/risk/il/${encodeURIComponent(ilName)}`);
      const json = await res.json();
      if (!json.ok) {
        setStatus(json.error || "İl bulunamadı.");
        if (titleEl) titleEl.textContent = "İl seçin";
        return;
      }

      await loadGeo();
      if (input) input.value = json.il;
      if (titleEl) titleEl.textContent = json.il;
      renderCards(json.risks, json.il);
      renderMap(json.il, json.risks);
      setStatus(`${json.il} — 6 afet türü için risk özeti.`);
    } catch {
      setStatus("Veriler yüklenemedi. Veritabanı bağlantısını kontrol edin.");
    }
  }

  async function loadIller() {
    try {
      const res = await fetch("/api/iller");
      const json = await res.json();
      if (!json.ok || !datalist) return;
      datalist.innerHTML = json.iller.map((il) => `<option value="${escapeHtml(il)}">`).join("");
    } catch {
      /* sessiz */
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const il = input?.value?.trim();
    if (!il) {
      setStatus("Lütfen bir il adı girin.");
      return;
    }
    showIl(il);
  });

  loadIller();

  const params = new URLSearchParams(window.location.search);
  const qIl = params.get("il");
  if (qIl) showIl(qIl);
})();
