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
  const onerilerEl = document.getElementById("ilRiskOneriler");
  const oneriSummaryEl = document.getElementById("ilRiskOneriSummary");
  const oneriBlocksEl = document.getElementById("ilRiskOneriBlocks");
  const senaryoBtn = document.getElementById("ilRiskSenaryoBtn");
  const senaryoHint = document.getElementById("ilRiskSenaryoHint");

  const COLORS = { yuksek: "#dc2626", orta: "#d97706", dusuk: "#16a34a" };

  let lastIl = null;
  let lastTopRiskKey = null;

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

  function readHazirlikCategoryScores() {
    try {
      const raw = localStorage.getItem("hazirlik_last_scores_v1");
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.categoryScores || null;
    } catch {
      return null;
    }
  }

  function renderOneriBlock(title, items, tag) {
    if (!items?.length) return "";
    const tagHtml = tag
      ? `<span class="ilRiskOneriBlock__tag ilRiskOneriBlock__tag--${escapeHtml(tag)}">${escapeHtml(
          tag === "prep" ? "Hazırlık" : tag === "live" ? "Canlı uyarı" : "Bilgi"
        )}</span>`
      : "";
    return `<section class="ilRiskOneriBlock">
      <h5 class="ilRiskOneriBlock__title">${tagHtml}${escapeHtml(title)}</h5>
      <ul class="ilRiskOneriBlock__list">${items.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
    </section>`;
  }

  function renderLiveAlerts(alerts) {
    if (!alerts?.length) return "";
    return alerts
      .map((a) => {
        const items = [...(a.prep || []), ...(a.equip || [])].slice(0, 4);
        if (!items.length) return "";
        return renderOneriBlock(a.title || "Canlı uyarı", items, "live");
      })
      .join("");
  }

  function renderOneriler(data, il) {
    if (!onerilerEl) return;

    lastTopRiskKey = data.topRisk?.key || null;

    if (oneriSummaryEl) {
      oneriSummaryEl.textContent = data.summary || `${il} için hazırlık önerileri.`;
    }

    const riskIntro = (data.riskyDisasters || [])
      .filter((r) => r.level === "high" || r.level === "medium")
      .slice(0, 3)
      .map(
        (r) =>
          `<p class="ilRiskOneriRisk"><strong>${escapeHtml(r.label)}</strong> (${r.score}/10 · ${escapeHtml(
            r.levelLabel
          )}) — ${escapeHtml(r.intro)}${
            r.href ? ` <a href="${escapeHtml(r.href)}">Rehber →</a>` : ""
          }</p>`
      )
      .join("");

    const prepBlocks = (data.preparation || [])
      .slice(0, 4)
      .map((s) => renderOneriBlock(s.title, s.items.slice(0, 5), "prep"))
      .join("");

    const extraBlocks = (data.regionalExtras || [])
      .slice(0, 2)
      .map((s) => renderOneriBlock(s.title, s.items.slice(0, 4), "info"))
      .join("");

    const personalBlocks = (data.personalized || [])
      .slice(0, 2)
      .map((s) => renderOneriBlock(s.title, s.items.slice(0, 3), "you"))
      .join("");

    if (oneriBlocksEl) {
      oneriBlocksEl.innerHTML =
        renderLiveAlerts(data.liveAlerts) +
        riskIntro +
        prepBlocks +
        extraBlocks +
        personalBlocks +
        `<p class="muted small ilRiskOneriler__disc">${escapeHtml(data.disclaimer || "")}</p>`;
    }

    onerilerEl.hidden = false;

    if (senaryoBtn) {
      senaryoBtn.hidden = false;
      senaryoBtn.textContent = `${il} için afet senaryosunu aç →`;
    }
    if (senaryoHint) senaryoHint.hidden = false;

    if (window.HazirlikOzet?.saveProfile) {
      window.HazirlikOzet.saveProfile(il, "");
    }
  }

  function hideOneriler() {
    if (onerilerEl) onerilerEl.hidden = true;
    if (senaryoBtn) senaryoBtn.hidden = true;
    if (senaryoHint) senaryoHint.hidden = true;
    lastIl = null;
    lastTopRiskKey = null;
  }

  async function loadOneriler(il) {
    if (!onerilerEl) return;
    if (oneriSummaryEl) oneriSummaryEl.textContent = "Öneriler hazırlanıyor…";
    if (oneriBlocksEl) oneriBlocksEl.innerHTML = "";
    onerilerEl.hidden = false;

    try {
      const categoryScores = readHazirlikCategoryScores();
      const res = await fetch("/api/hazirlik/akilli-oneri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          il,
          categoryScores,
          weakThreshold: 7,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (oneriSummaryEl) {
          oneriSummaryEl.textContent = json.error || "Öneriler yüklenemedi.";
        }
        return;
      }
      renderOneriler(json, il);
    } catch {
      if (oneriSummaryEl) {
        oneriSummaryEl.textContent = "Öneriler yüklenemedi. Lütfen tekrar deneyin.";
      }
    }
  }

  function openSenaryoForCurrentIl() {
    if (!lastIl) return;
    if (window.AfetSenaryo?.openModal) {
      window.AfetSenaryo.openModal({ il: lastIl, ilce: "", riskKey: lastTopRiskKey || undefined });
      return;
    }
    window.location.href = `/?senaryo=1&il=${encodeURIComponent(lastIl)}${
      lastTopRiskKey ? `&risk=${encodeURIComponent(lastTopRiskKey)}` : ""
    }`;
  }

  senaryoBtn?.addEventListener("click", openSenaryoForCurrentIl);

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
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
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
    hideOneriler();

    try {
      const res = await fetch(`/api/risk/il/${encodeURIComponent(ilName)}`);
      const json = await res.json();
      if (!json.ok) {
        setStatus(json.error || "İl bulunamadı.");
        if (titleEl) titleEl.textContent = "İl seçin";
        return;
      }

      await loadGeo();
      lastIl = json.il;
      if (input) input.value = json.il;
      if (titleEl) titleEl.textContent = json.il;
      renderCards(json.risks, json.il);
      renderMap(json.il, json.risks);
      setStatus(`${json.il} — 6 afet türü için risk özeti.`);
      loadOneriler(json.il);
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

  if (params.get("senaryo") === "1" && qIl) {
    setTimeout(() => {
      if (lastIl) openSenaryoForCurrentIl();
    }, 800);
  }
})();
