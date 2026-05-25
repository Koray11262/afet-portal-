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

function setupHomeToplanma() {
  const mapEl = document.getElementById("homeToplanmaMap");
  if (!mapEl || typeof L === "undefined") return;

  const statusEl = document.getElementById("homeToplanmaStatus");
  const listEl = document.getElementById("homeToplanmaList");
  const locateBtn = document.getElementById("homeToplanmaLocate");

  const map = L.map(mapEl, { zoomControl: false, scrollWheelZoom: false }).setView(
    [39.2, 28.5],
    7
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
      })
        .bindPopup(`<strong>${escapeHtml(a.ad)}</strong><br/>${a.mesafe_km} km`);
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
          ? `En yakın ${items.length} alan gösteriliyor.`
          : "Veritabanında kayıt yok; örnek veriyi import edin."
      );
    } catch (err) {
      setStatus("Alanlar yüklenemedi. Veritabanı bağlantısını kontrol edin.");
      if (listEl) listEl.innerHTML = "";
    }
  }

  function usePosition(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    loadNearest(lat, lng);
  }

  function locate() {
    if (!navigator.geolocation) {
      setStatus("Tarayıcı konum desteklemiyor. İzmir merkezi kullanılıyor.");
      loadNearest(38.4237, 27.1428);
      return;
    }
    setStatus("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(usePosition, () => {
      setStatus("Konum izni yok. İzmir merkezi gösteriliyor.");
      loadNearest(38.4237, 27.1428);
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

  const map = L.map("toplanmaMap", { zoomControl: true }).setView([39.2, 28.5], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OSM",
  }).addTo(map);

  let user = null;
  let userMarker = null;
  let areaLayer = L.layerGroup().addTo(map);
  let allItems = [];

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function renderList(items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = "<p class=\"muted\">Kayıt bulunamadı.</p>";
      return;
    }
    const sorted = user
      ? [...items].sort(
          (a, b) =>
            haversineKm(user, a) - haversineKm(user, b)
        )
      : items;
    listEl.innerHTML = sorted
      .map((a) => {
        const dist = user
          ? `${Math.round(haversineKm(user, a) * 100) / 100} km · `
          : "";
        return `
          <button type="button" class="toplanmaListItem" data-id="${a.id}">
            <strong>${escapeHtml(a.ad)}</strong>
            <span class="muted">${dist}${escapeHtml(a.ilce || "")} ${escapeHtml(a.il)}</span>
          </button>
        `;
      })
      .join("");

    listEl.querySelectorAll(".toplanmaListItem").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const item = sorted.find((x) => x.id === id);
        if (item) map.setView([item.lat, item.lng], 15);
      });
    });
  }

  function drawMarkers(items) {
    areaLayer.clearLayers();
    if (user) {
      userMarker = L.marker([user.lat, user.lng], { icon: userIcon }).addTo(map);
    }
    const bounds = [];
    if (user) bounds.push([user.lat, user.lng]);
    items.forEach((a) => {
      const m = L.marker([a.lat, a.lng], { icon: createGatheringIcon("#0b4d8f") }).bindPopup(
        `<strong>${escapeHtml(a.ad)}</strong><br/>${escapeHtml(a.il)}`
      );
      areaLayer.addLayer(m);
      bounds.push([a.lat, a.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }

  async function fetchAll(il) {
    setStatus("Alanlar yükleniyor…");
    const q = il ? `?il=${encodeURIComponent(il)}` : "";
    const res = await fetch(`/api/toplanma${q}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "API hatası");
    allItems = json.items || [];
    renderList(allItems);
    drawMarkers(allItems);
    setStatus(`${allItems.length} toplanma alanı`);
  }

  filterEl?.addEventListener("change", () => {
    const il = filterEl.value;
    fetchAll(il || "").catch(() => setStatus("Veriler yüklenemedi."));
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

  fetchAll("").catch(() => setStatus("Veritabanı bağlantısı veya tablo eksik olabilir."));
}

document.addEventListener("DOMContentLoaded", () => {
  setupHomeToplanma();
  setupToplanmaPage();
});
