function normalize(text) {
  return (text || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function setupGlobalSearch() {
  const input = document.getElementById("globalSearch");
  if (!input) return;

  const links = Array.from(document.querySelectorAll(".siteNav__link[href^='/']"));
  const triggers = Array.from(document.querySelectorAll(".siteNav__trigger .siteNav__title"));

  const index = links.map((a) => ({
    el: a,
    href: a.getAttribute("href"),
    text: normalize(a.textContent),
    parent: normalize(a.closest(".siteNav")?.querySelector(".siteNav__trigger")?.textContent || ""),
  }));

  triggers.forEach((t) => {
    const mega = t.closest(".siteNav--mega");
    if (!mega) return;
    index.push({
      el: t,
      href: null,
      text: normalize(t.textContent),
      parent: "",
    });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = normalize(input.value);
    if (!q) return;
    const hit = index.find((x) => x.text.includes(q) || x.parent.includes(q));
    if (hit?.href) window.location.href = hit.href;
    else if (hit?.el) hit.el.closest(".siteNav")?.classList.add("is-open");
  });
}

async function setupDisasterMaps() {
  const els = Array.from(document.querySelectorAll(".disasterMap"));
  if (els.length === 0 || typeof L === "undefined") return;

  const COLORS = { yuksek: "#dc2626", orta: "#d97706", dusuk: "#16a34a" };
  const toHex = (c) => c;

  function colorForIntensity(t) {
    if (!Number.isFinite(t)) t = 0.5;
    if (t < 0.4) return COLORS.dusuk;
    if (t < 0.7) return COLORS.orta;
    return COLORS.yuksek;
  }

  function colorForScore(score) {
    const s = Number(score);
    if (!Number.isFinite(s)) return "#e8edf2";
    if (s >= 7) return COLORS.yuksek;
    if (s >= 4) return COLORS.orta;
    return COLORS.dusuk;
  }

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

  function estimateIntensity(lat, lng, cityPoints) {
    // En yakın 3 ilin ağırlıklı ortalaması (yaklaşık)
    const here = { lat, lng };
    const nearest = cityPoints
      .map((p) => ({ ...p, d: haversineKm(here, p) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 3);
    let wSum = 0;
    let vSum = 0;
    for (const n of nearest) {
      const w = 1 / Math.max(1, n.d);
      wSum += w;
      vSum += w * n.intensity;
    }
    return wSum ? vSum / wSum : 0.5;
  }

  async function renderOne(el) {
    const geoUrl = el.getAttribute("data-geojson");
    const layerTitle = el.getAttribute("data-title") || "Risk";
    const heatUrl = el.getAttribute("data-heat");
    const mode = el.getAttribute("data-mode") || "";
    const riskUrl = el.getAttribute("data-risk");

    const map = L.map(el.id, { zoomControl: true, scrollWheelZoom: false }).setView(
      [39.0, 35.0],
      6
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap katkıcıları",
    }).addTo(map);

    // Choropleth (il poligonlarını boyama)
    if (mode === "choropleth" && geoUrl && riskUrl) {
      const [geoRes, riskRes] = await Promise.all([fetch(geoUrl), fetch(riskUrl)]);
      if (!geoRes.ok) throw new Error("Türkiye GeoJSON indirilemedi");
      if (!riskRes.ok) throw new Error("Risk verisi indirilemedi");

      const geo = await geoRes.json();
      const riskPayload = await riskRes.json(); // { ok, rows:[{il,puan}] }
      const riskMap = new Map(
        (riskPayload.rows || []).map((r) => [String(r.il || ""), Number(r.puan)])
      );

      function featureName(feature) {
        return (
          feature?.properties?.feature_name ||
          feature?.properties?.NAME ||
          feature?.properties?.name ||
          ""
        );
      }

      const layer = L.geoJSON(geo, {
        style: (feature) => {
          const il = featureName(feature);
          const puan = riskMap.get(il);
          const fillColor = colorForScore(puan);
          return {
            color: "#94a3b8",
            weight: 1,
            fillColor,
            fillOpacity: 0.65,
          };
        },
        onEachFeature: (feature, l) => {
          const il = featureName(feature);
          const puan = riskMap.get(il);
          const label =
            Number.isFinite(puan) ? `${il} — Risk puanı: ${puan}/10` : `${il} — Veri yok`;
          l.bindPopup(`<strong>${layerTitle}</strong><br/>${label}`);

          l.on("mouseover", () => {
            l.setStyle({ weight: 2, color: "#0b4d8f", fillOpacity: 0.85 });
          });
          l.on("mouseout", () => {
            layer.resetStyle(l);
          });
        },
      }).addTo(map);

      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.02));
      return;
    }

    // Fay hattı gibi "çizgi" görünümü (segment segment renklendirme)
    if (mode === "fault" && riskUrl) {
      const [riskRes, coordsRes] = await Promise.all([fetch(riskUrl), fetch("/api/coords")]);
      if (!riskRes.ok) throw new Error("Risk verisi indirilemedi");
      if (!coordsRes.ok) throw new Error("Koordinat verisi indirilemedi");

      const riskPayload = await riskRes.json(); // { ok, rows:[{il,puan}] }
      const coordsPayload = await coordsRes.json(); // { ok, coords:{Il:{lat,lng}} }
      const coords = coordsPayload.coords || {};
      const rows = riskPayload.rows || [];

      const cityPoints = [];
      for (const r of rows) {
        const il = String(r.il || "");
        const c = coords[il];
        const puan = Number(r.puan);
        if (!c || !Number.isFinite(puan)) continue;
        cityPoints.push({ lat: c.lat, lng: c.lng, intensity: Math.min(1, Math.max(0, puan / 10)) });
      }

      const faultRes = await fetch("/data/fay_hatlari.geojson");
      if (!faultRes.ok) throw new Error("Fay hattı verisi indirilemedi");
      const faultGeo = await faultRes.json();
      const paths =
        faultGeo?.features
          ?.filter((f) => f?.geometry?.type === "LineString")
          ?.map((f) => ({
            name: f?.properties?.name || "Fay hattı",
            // GeoJSON: [lng,lat] -> bizim format: [lat,lng]
            pts: (f.geometry.coordinates || []).map((c) => [c[1], c[0]]),
          })) || [];

      const group = L.layerGroup().addTo(map);
      for (const path of paths) {
        for (let i = 0; i < path.pts.length - 1; i++) {
          const a = path.pts[i];
          const b = path.pts[i + 1];
          const midLat = (a[0] + b[0]) / 2;
          const midLng = (a[1] + b[1]) / 2;
          const t = estimateIntensity(midLat, midLng, cityPoints);
          const color = colorForIntensity(t);

          L.polyline(
            [
              [a[0], a[1]],
              [b[0], b[1]],
            ],
            { color: toHex(color), weight: 8, opacity: 0.85, lineCap: "round" }
          ).addTo(group);
        }
      }

      map.fitBounds(L.latLngBounds([35.7, 25.6], [42.2, 44.9]).pad(0.05));
      return;
    }

    // Heatmap (yumuşak geçişli risk haritası)
    if (heatUrl && typeof L.heatLayer === "function") {
      const res = await fetch(heatUrl);
      if (!res.ok) throw new Error("Heat verisi indirilemedi");
      const payload = await res.json();
      const points = Array.isArray(payload) ? payload : payload.points; // [[lat,lng,intensity], ...]
      if (!Array.isArray(points)) throw new Error("Heat verisi formatı hatalı");

      L.heatLayer(points, {
        radius: 55,
        blur: 40,
        maxZoom: 8,
        minOpacity: 0.55,
        gradient: {
          0.15: COLORS.dusuk,
          0.45: COLORS.orta,
          0.8: COLORS.yuksek
        },
      }).addTo(map);

      // Türkiye'ye yakın bir görünüm
      map.fitBounds(
        L.latLngBounds([35.7, 25.6], [42.2, 44.9]).pad(0.05)
      );

      return;
    }

    if (!geoUrl) return;
    const res = await fetch(geoUrl);
    if (!res.ok) throw new Error("GeoJSON indirilemedi");
    const geo = await res.json();

    const layer = L.geoJSON(geo, {
      style: (feature) => {
        const level = feature?.properties?.risk || "orta";
        const color = COLORS[level] || COLORS.orta;
        return { color, weight: 2, fillColor: color, fillOpacity: 0.22 };
      },
      onEachFeature: (feature, l) => {
        const name = feature?.properties?.name || "Bölge";
        const risk = feature?.properties?.risk || "orta";
        l.bindPopup(`<strong>${layerTitle}</strong><br/>${name}<br/>Risk: ${risk}`);
      },
    }).addTo(map);

    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
  }

  for (const el of els) {
    try {
      await renderOne(el);
    } catch (err) {
      // sessiz geç
    }
  }
}

async function setupMapIfPresent() {
  const mapEl = document.getElementById("riskMap");
  if (!mapEl || typeof L === "undefined") return;

  const map = L.map("riskMap", { zoomControl: true }).setView([39.0, 35.0], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap katkıcıları",
  }).addTo(map);

  try {
    const res = await fetch("/data/risk-ornek.geojson");
    if (!res.ok) throw new Error("GeoJSON indirilemedi");
    const geo = await res.json();

    const layer = L.geoJSON(geo, {
      style: (feature) => {
        const level = feature?.properties?.risk || "orta";
        const color =
          level === "yuksek" ? "#ff6b7a" : level === "dusuk" ? "#62d28e" : "#ffd65a";
        return { color, weight: 2, fillColor: color, fillOpacity: 0.18 };
      },
      onEachFeature: (feature, l) => {
        const name = feature?.properties?.name || "Bölge";
        const risk = feature?.properties?.risk || "orta";
        l.bindPopup(`<strong>${name}</strong><br/>Risk seviyesi: ${risk}`);
      },
    }).addTo(map);

    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.25));
  } catch (err) {
    // Sessizce geç: sayfa yine de çalışsın.
    // (İstersen daha sonra kullanıcıya uyarı bannerı ekleriz.)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupGlobalSearch();
  setupDisasterMaps();
  setupMapIfPresent();
});

