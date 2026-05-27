function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function mapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createGatheringIcon(color) {
  return L.divIcon({
    className: "toplanmaMarker",
    html: `<span class="toplanmaMarker__dot" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const userIcon = L.divIcon({
  className: "toplanmaMarker toplanmaMarker--user",
  html: '<span class="toplanmaMarker__dot toplanmaMarker__dot--user"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function createClusterLayer(map) {
  if (typeof L.markerClusterGroup === "function") {
    return L.markerClusterGroup({
      maxClusterRadius: 52,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    }).addTo(map);
  }
  return L.layerGroup().addTo(map);
}

async function loadToplanmaMeta() {
  const res = await fetch("/api/toplanma/meta");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Meta yüklenemedi");
  return json;
}

function fillIlFilter(selectEl, meta) {
  if (!selectEl || !meta?.iller) return;
  const synced = new Set(meta.syncedIller || []);
  selectEl.innerHTML = `<option value="">Tümü (${meta.total.toLocaleString("tr-TR")} alan)</option>`;
  for (const il of meta.iller) {
    const opt = document.createElement("option");
    opt.value = il;
    opt.textContent = synced.has(il) ? il : `${il} (henüz yüklenmedi)`;
    selectEl.appendChild(opt);
  }
}

function setupHomeToplanma() {
  const mapEl = document.getElementById("homeToplanmaMap");
  if (!mapEl || typeof L === "undefined") return;

  const statusEl = document.getElementById("homeToplanmaStatus");
  const listEl = document.getElementById("homeToplanmaList");
  const locateBtn = document.getElementById("homeToplanmaLocate");

  const map = L.map(mapEl, { zoomControl: false, scrollWheelZoom: false }).setView(
    [39.2, 35.5],
    6
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OSM",
  }).addTo(map);

  let userMarker = null;
  let areaLayer = L.layerGroup().addTo(map);

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function renderList(items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = "<li class=\"muted\">Yakında toplanma alanı bulunamadı.</li>";
      return;
    }
    listEl.innerHTML = items
      .map(
        (a) => `
        <li class="homeToplanmaItem">
          <div>
            <strong>${escapeHtml(a.ad)}</strong>
            <span class="muted">${escapeHtml(a.ilce || a.il)} · ${a.mesafe_km} km</span>
          </div>
          <a class="homeToplanmaItem__link" href="${mapsDirectionsUrl(a.lat, a.lng)}" target="_blank" rel="noopener">Yol tarifi</a>
        </li>
      `
      )
      .join("");
  }

  function drawMap(user, items) {
    areaLayer.clearLayers();
    if (user) {
      userMarker = L.marker([user.lat, user.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Konumunuz");
    }
    const bounds = [];
    if (user) bounds.push([user.lat, user.lng]);
    items.forEach((a, i) => {
      const m = L.marker([a.lat, a.lng], {
        icon: createGatheringIcon(i === 0 ? "#16a34a" : "#0b4d8f"),
      }).bindPopup(`<strong>${escapeHtml(a.ad)}</strong><br/>${a.mesafe_km} km`);
      areaLayer.addLayer(m);
      bounds.push([a.lat, a.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    setTimeout(() => map.invalidateSize(), 120);
  }

  async function loadNearest(lat, lng) {
    setStatus("En yakın alanlar aranıyor…");
    try {
      const res = await fetch(
        `/api/toplanma/yakin?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&limit=5`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "API hatası");
      const items = json.items || [];
      renderList(items);
      drawMap({ lat, lng }, items);
      setStatus(
        items.length
          ? `En yakın ${items.length} AFAD toplanma alanı gösteriliyor.`
          : "Bu konum için toplanma alanı bulunamadı."
      );
    } catch {
      setStatus("Alanlar yüklenemedi.");
      if (listEl) listEl.innerHTML = "";
    }
  }

  function usePosition(pos) {
    loadNearest(pos.coords.latitude, pos.coords.longitude);
  }

  function locate() {
    if (!navigator.geolocation) {
      setStatus("Konum desteklenmiyor. Ankara merkezi kullanılıyor.");
      loadNearest(39.9334, 32.8597);
      return;
    }
    setStatus("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(usePosition, () => {
      setStatus("Konum izni yok. Ankara merkezi gösteriliyor.");
      loadNearest(39.9334, 32.8597);
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  }

  locateBtn?.addEventListener("click", locate);
  locate();
}

function setupToplanmaPage() {
  const mapEl = document.getElementById("toplanmaMap");
  if (!mapEl || typeof L === "undefined") return;

  const listEl = document.getElementById("toplanmaList");
  const filterEl = document.getElementById("toplanmaIlFilter");
  const locateBtn = document.getElementById("toplanmaLocate");
  const statusEl = document.getElementById("toplanmaStatus");

  const map = L.map("toplanmaMap", { zoomControl: true }).setView([39.2, 35.5], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OSM",
  }).addTo(map);

  let user = null;
  let userMarker = null;
  let areaLayer = createClusterLayer(map);
  let allItems = [];
  let selectedIl = "";
  let listLimit = 200;
  let reloadTimer = null;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function renderList(items) {
    if (!listEl) return;
    const shown = items.slice(0, listLimit);
    if (!shown.length) {
      listEl.innerHTML = "<p class=\"muted\">Kayıt bulunamadı. İl seçerek veya haritayı kaydırarak deneyin.</p>";
      return;
    }
    const sorted = user
      ? [...shown].sort((a, b) => haversineKm(user, a) - haversineKm(user, b))
      : shown;
    listEl.innerHTML = sorted
      .map((a) => {
        const dist = user ? `${Math.round(haversineKm(user, a) * 100) / 100} km · ` : "";
        return `
          <button type="button" class="toplanmaListItem" data-id="${escapeHtml(a.id)}">
            <strong>${escapeHtml(a.ad)}</strong>
            <span class="muted">${dist}${escapeHtml(a.ilce || "")} ${escapeHtml(a.il)}</span>
          </button>
        `;
      })
      .join("");

    if (items.length > listLimit) {
      listEl.insertAdjacentHTML(
        "beforeend",
        `<p class="muted">Liste ${listLimit} kayıtla sınırlandı. Haritada tüm noktalar görünür.</p>`
      );
    }

    listEl.querySelectorAll(".toplanmaListItem").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const item = sorted.find((x) => String(x.id) === id);
        if (item) map.setView([item.lat, item.lng], 15);
      });
    });
  }

  function drawMarkers(items) {
    areaLayer.clearLayers();
    if (userMarker) {
      map.removeLayer(userMarker);
      userMarker = null;
    }
    if (user) {
      userMarker = L.marker([user.lat, user.lng], { icon: userIcon }).addTo(map);
    }
    for (const a of items) {
      const m = L.marker([a.lat, a.lng], { icon: createGatheringIcon("#0b4d8f") }).bindPopup(
        `<strong>${escapeHtml(a.ad)}</strong><br/>${escapeHtml(a.il)}${a.ilce ? ` · ${escapeHtml(a.ilce)}` : ""}`
      );
      areaLayer.addLayer(m);
    }
  }

  async function fetchAll(il, useBbox) {
    setStatus("Alanlar yükleniyor…");
    const params = new URLSearchParams();
    if (il) {
      params.set("il", il);
    } else if (useBbox) {
      const b = map.getBounds();
      params.set(
        "bbox",
        `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
      );
      params.set("limit", "5000");
    } else {
      params.set("limit", "5000");
    }
    const res = await fetch(`/api/toplanma?${params}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "API hatası");
    allItems = json.items || [];
    renderList(allItems);
    drawMarkers(allItems);
    const suffix = json.syncedIller
      ? ` · ${json.syncedIller.length} il yüklü`
      : "";
    if (json.syncing && json.message) {
      setStatus(json.message);
      return;
    }
    setStatus(`${allItems.length.toLocaleString("tr-TR")} toplanma alanı${suffix}`);
  }

  function scheduleReload() {
    if (selectedIl) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      fetchAll("", true).catch(() => setStatus("Veriler yüklenemedi."));
    }, 450);
  }

  filterEl?.addEventListener("change", () => {
    selectedIl = filterEl.value;
    fetchAll(selectedIl, !selectedIl).catch(() => setStatus("Veriler yüklenemedi."));
  });

  locateBtn?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Konum desteklenmiyor.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        renderList(allItems);
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([user.lat, user.lng], { icon: userIcon }).addTo(map);
        map.setView([user.lat, user.lng], 11);
        setStatus("Konumunuz haritada işaretlendi.");
      },
      () => setStatus("Konum izni verilmedi.")
    );
  });

  map.on("moveend", scheduleReload);

  loadToplanmaMeta()
    .then((meta) => {
      fillIlFilter(filterEl, meta);
      return fetchAll("", false);
    })
    .catch(() => setStatus("Toplanma alanı verisi yüklenemedi."));
}

document.addEventListener("DOMContentLoaded", () => {
  setupHomeToplanma();
  setupToplanmaPage();
});
