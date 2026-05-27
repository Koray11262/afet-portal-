(function () {
  const fab = document.getElementById("yanginFabBtn");
  const modal = document.getElementById("yanginModal");
  if (!fab || !modal || typeof L === "undefined") return;

  const badge = document.getElementById("yanginFabBadge");
  const meta = document.getElementById("yanginModalMeta");
  const legend = document.getElementById("yanginLegend");
  const statsEl = document.getElementById("yanginStats");
  const listEl = document.getElementById("yanginList");
  const listEmpty = document.getElementById("yanginListEmpty");
  const mapLoading = document.getElementById("yanginMapLoading");
  const mapEl = document.getElementById("yanginMap");

  let map;
  let layerGroup;
  let mapReady = false;
  let lastData = null;

  function escapeHtml(s) {
    return String(s)
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
    map = L.map(mapEl, {
      center: [39, 35],
      zoom: 6,
      zoomControl: true,
    });
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
        attribution: "Tiles © Esri",
      }
    ).addTo(map);
    layerGroup = L.layerGroup().addTo(map);
    mapReady = true;
    setLoading(false);
  }

  function renderLegend(items) {
    legend.innerHTML = (items || [])
      .map(
        (item) =>
          `<span class="yanginLegend__item"><span class="yanginLegend__swatch" style="background:${item.color}"></span>${escapeHtml(item.label)}</span>`
      )
      .join("");
  }

  function renderStats(stats) {
    if (!stats) {
      statsEl.innerHTML = "";
      return;
    }
    statsEl.innerHTML = `
      <div class="yanginStat"><span class="yanginStat__val">${stats.total}</span><span class="yanginStat__lbl">Toplam nokta</span></div>
      <div class="yanginStat"><span class="yanginStat__val">${stats.last24h}</span><span class="yanginStat__lbl">Son 24 saat</span></div>
      <div class="yanginStat"><span class="yanginStat__val">${stats.significant}</span><span class="yanginStat__lbl">FRP ≥ 10</span></div>
    `;
  }

  function renderList(hotspots) {
    listEl.innerHTML = "";
    const items = (hotspots || []).slice(0, 40);
    if (!items.length) {
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    items.forEach((h) => {
      const li = document.createElement("li");
      li.className = "yanginList__item";
      li.innerHTML = `
        <div class="yanginList__head">
          <span class="yanginList__dot" style="background:${h.frpColor}"></span>
          <strong>${h.lat?.toFixed(2)}, ${h.lng?.toFixed(2)}</strong>
          <span class="yanginList__frp">${escapeHtml(h.frpLabel)}</span>
        </div>
        <div class="yanginList__meta muted">${escapeHtml(h.observedAt)} · ${escapeHtml(h.temperatureC)} · ${escapeHtml(h.confidence)}</div>
      `;
      li.addEventListener("click", () => {
        if (!map) return;
        map.setView([h.lat, h.lng], 11, { animate: true });
      });
      listEl.appendChild(li);
    });
  }

  function paintMap(hotspots) {
    if (!mapReady) return;
    layerGroup.clearLayers();
    (hotspots || []).forEach((h) => {
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: h.markerSize || 6,
        color: h.frpColor,
        fillColor: h.frpColor,
        fillOpacity: 0.85,
        weight: 1,
      });
      marker.bindPopup(`
        <strong>🔥 Uydu sıcak noktası</strong><br>
        <b>FRP:</b> ${escapeHtml(String(h.frp))}<br>
        <b>Sıcaklık:</b> ${escapeHtml(h.temperatureC)}<br>
        <b>Güven:</b> ${escapeHtml(h.confidence)}<br>
        <b>Zaman:</b> ${escapeHtml(h.observedAt)}<br>
        <b>Uydu:</b> ${escapeHtml(h.satellite)} (${escapeHtml(h.daynight)})
      `);
      layerGroup.addLayer(marker);
    });
    setTimeout(() => map.invalidateSize(), 100);
  }

  function updateBadge(data) {
    if (!badge || !data?.ok) return;
    const count = data.stats?.last24h || 0;
    if (count > 0) {
      badge.textContent = String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  async function fetchData() {
    const res = await fetch("/api/yangin/canli");
    if (!res.ok) throw new Error("Yangın verisi alınamadı");
    return res.json();
  }

  async function refresh() {
    meta.textContent = "Güncelleniyor…";
    try {
      const data = await fetchData();
      if (!data.ok) throw new Error(data.error || "Veri yok");
      lastData = data;
      meta.textContent = `${data.source}${data.updatedAt ? ` · ${data.updatedAt}` : ""}${data.stale ? " (önbellek)" : ""}${data.truncated ? " · kısmi liste" : ""}`;
      renderLegend(data.legend);
      renderStats(data.stats);
      renderList(data.hotspots);
      paintMap(data.hotspots);
      updateBadge(data);
    } catch (err) {
      meta.textContent = `Veri yüklenemedi: ${err.message || err}`;
    }
  }

  function openModal() {
    modal.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("yanginModalOpen");
    setLoading(true, "Harita yükleniyor…");
    requestAnimationFrame(() => {
      ensureMap();
      refresh().finally(() => setLoading(false));
    });
  }

  function closeModal() {
    modal.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("yanginModalOpen");
  }

  fab.addEventListener("click", openModal);
  modal.querySelectorAll("[data-yangin-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  fetchData()
    .then((data) => updateBadge(data))
    .catch(() => {});
})();
