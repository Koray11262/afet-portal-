(function () {
  const form = document.getElementById("homeToolForm");
  const select = document.getElementById("homeToolIl");
  const selectIlce = document.getElementById("homeToolIlce");
  const resultEl = document.getElementById("homeToolResult");
  const formCard = form?.closest(".homeToolCard--form");
  if (!form || !select) return;

  let oneriMap = null;
  let oneriLayer = null;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function markerIcon(color) {
    return L.divIcon({
      className: "toplanmaMarker",
      html: `<span class="toplanmaMarker__dot" style="background:${color}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  function destroyMap() {
    if (oneriMap) {
      oneriMap.remove();
      oneriMap = null;
      oneriLayer = null;
    }
  }

  function drawOneriMap(json) {
    if (typeof L === "undefined") return;
    const mapEl = document.getElementById("homeToolMap");
    if (!mapEl || !json?.center) return;

    destroyMap();

    const c = json.center;
    oneriMap = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false }).setView(
      [c.lat, c.lng],
      12
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OSM",
    }).addTo(oneriMap);

    oneriLayer = L.layerGroup().addTo(oneriMap);
    const bounds = [[c.lat, c.lng]];

    L.marker([c.lat, c.lng], { icon: markerIcon("#0b4d8f") })
      .bindPopup(
        `<strong>Merkez</strong><br/>${escapeHtml(json.ilce)} / ${escapeHtml(json.il)}`
      )
      .addTo(oneriLayer);

    for (const a of json.toplanma?.nearest || []) {
      L.marker([a.lat, a.lng], { icon: markerIcon("#16a34a") })
        .bindPopup(
          `<strong>${escapeHtml(a.ad)}</strong><br/>Toplanma · ${escapeHtml(a.mesafe_km)} km`
        )
        .addTo(oneriLayer);
      bounds.push([a.lat, a.lng]);
    }

    for (const h of json.hospitals || []) {
      L.marker([h.lat, h.lng], { icon: markerIcon("#7c3aed") })
        .bindPopup(
          `<strong>${escapeHtml(h.name)}</strong><br/>${escapeHtml(h.triage)}`
        )
        .addTo(oneriLayer);
      bounds.push([h.lat, h.lng]);
    }

    if (bounds.length > 1) {
      oneriMap.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
    }
    setTimeout(() => oneriMap.invalidateSize(), 120);
  }

  async function loadIller() {
    try {
      const res = await fetch("/api/yerlesim/iller");
      const json = await res.json();
      if (!json.ok) return [];
      const names = (json.iller || []).slice();
      names.sort((a, b) => String(a).localeCompare(String(b), "tr"));
      return names.filter(Boolean);
    } catch {
      return [];
    }
  }

  function fillIl(names) {
    select.innerHTML = `<option value="">İl seç…</option>`;
    names.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      select.appendChild(opt);
    });
  }

  function fillIlce(names) {
    if (!selectIlce) return;
    selectIlce.innerHTML = `<option value="">İlçe seç…</option>`;
    names.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      selectIlce.appendChild(opt);
    });
    selectIlce.disabled = false;
  }

  async function loadIlceler(il) {
    if (!selectIlce) return [];
    selectIlce.disabled = true;
    selectIlce.innerHTML = `<option value="">İlçeler yükleniyor…</option>`;
    try {
      const res = await fetch(`/api/yerlesim/ilceler?il=${encodeURIComponent(il)}`);
      const json = await res.json();
      if (!json.ok) return [];
      return (json.ilceler || []).filter(Boolean);
    } catch {
      return [];
    }
  }

  function setResult(html, json) {
    if (!resultEl) return;
    resultEl.hidden = false;
    resultEl.innerHTML = html;
    if (json) {
      formCard?.classList.add("has-result");
      drawOneriMap(json);
    } else {
      formCard?.classList.remove("has-result");
      destroyMap();
    }
  }

  loadIller().then((names) => {
    if (!names.length) {
      select.innerHTML = `<option value="">İller yüklenemedi</option>`;
      select.disabled = true;
      return;
    }
    fillIl(names);
  });

  select.addEventListener("change", async () => {
    if (!selectIlce) return;
    const il = select.value;
    formCard?.classList.remove("has-result");
    destroyMap();
    if (resultEl) resultEl.hidden = true;
    if (!il) {
      selectIlce.innerHTML = `<option value="">İlçe seç…</option>`;
      selectIlce.disabled = true;
      return;
    }
    const ilceler = await loadIlceler(il);
    if (!ilceler.length) {
      selectIlce.innerHTML = `<option value="">İlçe bulunamadı</option>`;
      selectIlce.disabled = true;
      return;
    }
    fillIlce(ilceler);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const il = select.value;
    const ilce = selectIlce?.value || "";
    if (!il || !ilce) return;
    setResult(`<p class="muted">Öneriler hazırlanıyor…</p>`, null);
    fetch(`/api/oneri/konum?il=${encodeURIComponent(il)}&ilce=${encodeURIComponent(ilce)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error || "Öneriler alınamadı");

        if (window.HazirlikOzet?.saveProfile) {
          window.HazirlikOzet.saveProfile(il, ilce);
          window.dispatchEvent(new CustomEvent("hazirlik-ozet-update"));
        }

        const top = (json.topRisks || [])
          .map((x) => `<li><strong>${escapeHtml(x.label)}</strong>: ${escapeHtml(x.puan)}/10</li>`)
          .join("");

        const nearest = (json.toplanma?.nearest || [])
          .map(
            (a) =>
              `<li><strong>${escapeHtml(a.ad)}</strong><span class="muted"> · ${escapeHtml(
                a.ilce || ""
              )} ${escapeHtml(a.il)} · ${escapeHtml(a.mesafe_km)} km</span></li>`
          )
          .join("");

        const hosps = (json.hospitals || [])
          .slice(0, 4)
          .map((h) => `<li>${escapeHtml(h.name)} <span class="muted">(${escapeHtml(h.triage)})</span></li>`)
          .join("");

        const links = (json.recommendations?.risk || [])
          .filter((x) => x.href)
          .map((x) => `<a class="homeToolLink" href="${x.href}">${escapeHtml(x.title)} →</a>`)
          .join("");

        const syncMsg =
          json.toplanma?.syncing && json.toplanma?.message
            ? `<p class="muted">${escapeHtml(json.toplanma.message)}</p>`
            : "";

        setResult(
          `
          <div class="homeToolResult__mapBlock">
            <div class="homeToolResult__title">Harita özeti</div>
            <div class="homeToolMapLegend">
              <span><i class="homeToolMapLegend__dot" style="background:#0b4d8f"></i>Merkez</span>
              <span><i class="homeToolMapLegend__dot" style="background:#16a34a"></i>Toplanma</span>
              <span><i class="homeToolMapLegend__dot" style="background:#7c3aed"></i>Hastane</span>
            </div>
            <div id="homeToolMap" class="homeToolMap" aria-label="Öneri haritası"></div>
            <a class="homeToolLink" href="/toplanma-alanlari">Tüm toplanma alanları →</a>
          </div>

          <div class="homeToolResult__block">
            <div class="homeToolResult__title">Risk özeti</div>
            <ul class="homeToolList">${top || "<li class='muted'>Risk verisi yok.</li>"}</ul>
            ${links ? `<div class="homeToolLinks">${links}</div>` : ""}
          </div>

          <div class="homeToolResult__block">
            <div class="homeToolResult__title">Toplanma alanları (yakın)</div>
            ${syncMsg}
            <ul class="homeToolList">${nearest || "<li class='muted'>Kayıt bulunamadı.</li>"}</ul>
          </div>

          <div class="homeToolResult__block">
            <div class="homeToolResult__title">Sağlık & trafik</div>
            <div class="muted">Trafik: <strong>${escapeHtml(json.traffic?.level || "—")}</strong></div>
            <ul class="homeToolList">${hosps || "<li class='muted'>—</li>"}</ul>
          </div>
        `,
          json
        );
      })
      .catch((err) => setResult(`<p class="muted">${escapeHtml(err?.message || err)}</p>`, null));
  });
})();
