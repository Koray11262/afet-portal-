(function () {
  const fab = document.getElementById("senaryoFabBtn");
  const modal = document.getElementById("senaryoModal");
  if (!fab || !modal || typeof L === "undefined") return;

  const form = document.getElementById("senaryoForm");
  const meta = document.getElementById("senaryoModalMeta");
  const mapEl = document.getElementById("senaryoMap");
  const mapLoading = document.getElementById("senaryoMapLoading");
  const summaryEl = document.getElementById("senaryoSummary");
  const layersEl = document.getElementById("senaryoLayers");

  let map;
  let layerGroup;
  let mapReady = false;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setLoading(visible, message) {
    if (!mapLoading) return;
    if (message) mapLoading.textContent = message;
    mapLoading.hidden = !visible;
  }

  function ensureMap() {
    if (mapReady) return;
    map = L.map(mapEl, { center: [39, 35], zoom: 6, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OSM",
    }).addTo(map);
    layerGroup = L.layerGroup().addTo(map);
    mapReady = true;
    setLoading(false);
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("senaryoModalOpen");
    fab.setAttribute("aria-expanded", "true");
    ensureMap();
    setTimeout(() => map.invalidateSize(), 120);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("senaryoModalOpen");
    fab.setAttribute("aria-expanded", "false");
  }

  function bindClose() {
    modal.querySelectorAll("[data-senaryo-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", (e) => {
      if (!modal.hidden && e.key === "Escape") closeModal();
    });
  }

  function renderLayers(data) {
    if (!layersEl) return;
    const items = [];
    const kind = data?.input?.type || "quake";
    const centerLabel =
      kind === "flood" ? "Merkez (taşkın odağı)" : kind === "landslide" ? "Merkez (heyelan odağı)" : "Merkez (deprem noktası)";
    items.push(`<div class="senaryoLayerItem"><span class="senaryoDot" style="background:#0b4d8f"></span>${escapeHtml(centerLabel)}</div>`);
    for (const z of data.riskZones || []) {
      items.push(
        `<div class="senaryoLayerItem"><span class="senaryoDot" style="background:${escapeHtml(z.color)}"></span>Risk: ${escapeHtml(
          z.label
        )} (${z.radiusKm} km)</div>`
      );
    }
    items.push(`<div class="senaryoLayerItem"><span class="senaryoDot" style="background:#16a34a"></span>Toplanma alanları (yakın)</div>`);
    items.push(`<div class="senaryoLayerItem"><span class="senaryoDot" style="background:#7c3aed"></span>Hastaneler (tahmini)</div>`);
    items.push(`<div class="senaryoLayerItem"><span class="senaryoDot" style="background:#ef4444"></span>Trafik yoğunluğu (tahmini)</div>`);
    layersEl.innerHTML = items.join("");
  }

  function renderSummary(data) {
    const imp = data.impact || {};
    const dmg = imp.damage || {};
    const kind = data?.input?.type || "quake";
    const kpi2Label =
      kind === "flood"
        ? "Tahliye (tahmini)"
        : kind === "landslide"
          ? "Şev kapanması"
          : "Ağır hasar";
    const kpi2Val =
      kind === "flood"
        ? Number(imp.evacuees || 0).toLocaleString("tr-TR")
        : kind === "landslide"
          ? Number(imp.slopeClosuresCount || 0).toLocaleString("tr-TR")
          : Number(dmg.heavy || 0).toLocaleString("tr-TR");
    summaryEl.innerHTML = `
      <p class="senaryoEvent"><strong>${escapeHtml(data.eventText)}</strong></p>
      <div class="senaryoKpis">
        <div class="senaryoKpi"><span class="senaryoKpi__val">${Number(
          imp.affectedPeople || 0
        ).toLocaleString("tr-TR")}</span><span class="senaryoKpi__lbl">Etkilenen (tahmini)</span></div>
        <div class="senaryoKpi"><span class="senaryoKpi__val">${kpi2Val}</span><span class="senaryoKpi__lbl">${escapeHtml(
          kpi2Label
        )}</span></div>
        <div class="senaryoKpi"><span class="senaryoKpi__val">${Number(
          imp.roadIssuesCount || 0
        ).toLocaleString("tr-TR")}</span><span class="senaryoKpi__lbl">Yol sorunu</span></div>
        <div class="senaryoKpi"><span class="senaryoKpi__val">%${Number(
          imp.powerOutagePercent || 0
        ).toFixed(0)}</span><span class="senaryoKpi__lbl">Elektrik kesintisi</span></div>
      </div>
      ${imp.notes ? `<p class="muted">${escapeHtml(imp.notes)}</p>` : ""}
      <p class="muted">${escapeHtml(data.disclaimer || "")}</p>
    `;
  }

  function icon(color) {
    return L.divIcon({
      className: "toplanmaMarker",
      html: `<span class="toplanmaMarker__dot" style="background:${color}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  async function runSimulation(payload) {
    setLoading(true, "Senaryo yükleniyor…");
    meta.textContent = "Senaryo hazırlanıyor…";
    const params = new URLSearchParams(payload);
    const res = await fetch(`/api/senaryo/run?${params}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Simülasyon çalıştırılamadı");
    return json;
  }

  async function loadNearestGathering(lat, lng) {
    try {
      const res = await fetch(
        `/api/toplanma/yakin?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&limit=8`
      );
      const json = await res.json();
      if (!json.ok) return [];
      return json.items || [];
    } catch {
      return [];
    }
  }

  function drawScenario(data, gathering) {
    layerGroup.clearLayers();

    const epic = data.epicenter;
    const bounds = [[epic.lat, epic.lng]];

    const epicMarker = L.marker([epic.lat, epic.lng], { icon: icon("#0b4d8f") }).bindPopup(
      `<strong>Merkez</strong><br/>${escapeHtml(epic.il)}`
    );
    layerGroup.addLayer(epicMarker);

    for (const z of data.riskZones || []) {
      const c = L.circle([epic.lat, epic.lng], {
        radius: (z.radiusKm || 0) * 1000,
        color: z.color,
        weight: 2,
        fillColor: z.fill || z.color,
        fillOpacity: 0.25,
      }).bindPopup(`<strong>Risk</strong><br/>${escapeHtml(z.label)} · ${z.radiusKm} km`);
      layerGroup.addLayer(c);
    }

    for (const a of gathering || []) {
      const m = L.marker([a.lat, a.lng], { icon: icon("#16a34a") }).bindPopup(
        `<strong>${escapeHtml(a.ad)}</strong><br/>Toplanma alanı · ${escapeHtml(a.il)}`
      );
      layerGroup.addLayer(m);
      bounds.push([a.lat, a.lng]);
    }

    for (const h of data.hospitals || []) {
      const m = L.marker([h.lat, h.lng], { icon: icon("#7c3aed") }).bindPopup(
        `<strong>${escapeHtml(h.name)}</strong><br/>Durum: ${escapeHtml(h.triage)} · Kapasite: ${h.capacityHint}`
      );
      layerGroup.addLayer(m);
      bounds.push([h.lat, h.lng]);
    }

    for (const t of data.traffic || []) {
      const p = L.polyline(
        [
          [t.from.lat, t.from.lng],
          [t.to.lat, t.to.lng],
        ],
        { color: t.color, weight: t.weight, opacity: 0.8 }
      ).bindPopup(`<strong>Trafik</strong><br/>${escapeHtml(t.level)}`);
      layerGroup.addLayer(p);
      bounds.push([t.from.lat, t.from.lng], [t.to.lat, t.to.lng]);
    }

    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
  }

  fab.addEventListener("click", openModal);
  bindClose();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const data = await runSimulation(payload);
      const gathering = await loadNearestGathering(data.epicenter.lat, data.epicenter.lng);
      drawScenario(data, gathering);
      renderSummary(data);
      renderLayers(data);
      meta.textContent = `${escapeHtml(data.input.il)} senaryosu hazır.`;
      setLoading(false);
    } catch (err) {
      setLoading(false);
      meta.textContent = "Simülasyon çalıştırılamadı.";
      summaryEl.innerHTML = `<p class="muted">${escapeHtml(err?.message || err)}</p>`;
    }
  });
})();

