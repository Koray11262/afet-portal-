(function () {
  const fab = document.getElementById("meteoFabBtn");
  const modal = document.getElementById("meteoModal");
  if (!fab || !modal) return;

  const badge = document.getElementById("meteoFabBadge");
  const meta = document.getElementById("meteoModalMeta");
  const legend = document.getElementById("meteoLegend");
  const mapEl = document.getElementById("meteoMap");
  const mapLoading = document.getElementById("meteoMapLoading");
  const tooltip = document.getElementById("meteoTooltip");
  const warnedList = document.getElementById("meteoWarnedList");
  const warnedEmpty = document.getElementById("meteoWarnedEmpty");
  const tabs = modal.querySelectorAll("[data-meteo-day]");

  let currentDay = 1;
  let svgLoaded = false;
  let provinceById = new Map();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setMapLoading(visible, message) {
    if (!mapLoading) return;
    if (message) mapLoading.textContent = message;
    mapLoading.hidden = !visible;
  }

  async function loadSvg() {
    if (svgLoaded) {
      setMapLoading(false);
      return;
    }
    setMapLoading(true, "Harita yükleniyor…");
    const res = await fetch("/maps/turkiye-meteouyari.svg");
    if (!res.ok) throw new Error("Harita yüklenemedi");
    const svgText = await res.text();
    mapEl.innerHTML = svgText;
    const svg = mapEl.querySelector("svg");
    if (svg) {
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
    }
    mapEl.querySelectorAll('g[id^="9"]').forEach((g) => {
      const id = g.id;
      const name = g.getAttribute("data-iladi") || id;
      provinceById.set(id, name);
      g.style.cursor = "pointer";
      g.addEventListener("mouseenter", () => showTooltip(name));
      g.addEventListener("mouseleave", hideTooltip);
      g.addEventListener("mousemove", moveTooltip);
    });
    svgLoaded = true;
    setMapLoading(false);
  }

  function showTooltip(text) {
    tooltip.textContent = text;
    tooltip.hidden = false;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function moveTooltip(e) {
    const wrap = mapEl.parentElement;
    const rect = wrap.getBoundingClientRect();
    tooltip.style.left = `${e.clientX - rect.left + 12}px`;
    tooltip.style.top = `${e.clientY - rect.top + 12}px`;
  }

  function paintMap(provinces) {
    const levelById = new Map(provinces.map((p) => [p.id, p]));
    mapEl.querySelectorAll('g[id^="9"]').forEach((g) => {
      const p = levelById.get(g.id);
      const color = p?.color || "#1DCE7D";
      g.style.fill = color;
      g.style.fillOpacity = "1";
    });
  }

  function renderLegend(items) {
    legend.innerHTML = (items || [])
      .map(
        (item) =>
          `<span class="meteoLegend__item"><span class="meteoLegend__swatch" style="background:${item.color}"></span>${escapeHtml(item.label)}</span>`
      )
      .join("");
  }

  function renderWarned(warned) {
    warnedList.innerHTML = "";
    if (!warned || !warned.length) {
      warnedEmpty.hidden = false;
      return;
    }
    warnedEmpty.hidden = true;
    warned.forEach((p) => {
      const li = document.createElement("li");
      li.className = "meteoWarned__item";
      const tags = (p.warningLabels || [])
        .map((w) => `<span class="meteoWarned__tag meteoWarned__tag--${w.level}">${escapeHtml(w.label)}</span>`)
        .join("");
      li.innerHTML = `<div class="meteoWarned__head"><span class="meteoWarned__dot" style="background:${p.color}"></span><strong>${escapeHtml(p.name)}</strong><span class="meteoWarned__level">${escapeHtml(p.levelLabel)}</span></div><div class="meteoWarned__tags">${tags}</div>`;
      warnedList.appendChild(li);
    });
  }

  async function fetchData(day) {
    const res = await fetch(`/api/mgm/meteouyari?gun=${day}`);
    if (!res.ok) throw new Error("Uyarı verisi alınamadı");
    return res.json();
  }

  async function refresh(day) {
    currentDay = day;
    meta.textContent = "Güncelleniyor…";
    try {
      const data = await fetchData(day);
      if (!data.ok) throw new Error(data.error || "Veri yok");
      meta.textContent = `${data.source} — ${data.dayLabel}${data.updatedAt ? ` · ${data.updatedAt}` : ""}${data.stale ? " (önbellek)" : ""}`;
      renderLegend(data.legend);
      paintMap(data.provinces);
      renderWarned(data.warned);
      if (day === 1 && badge) {
        if (data.warningCount > 0) {
          badge.textContent = String(data.warningCount);
          badge.hidden = false;
        } else {
          badge.hidden = true;
        }
      }
    } catch (err) {
      meta.textContent = `Veri yüklenemedi: ${err.message || err}`;
    }
  }

  function setActiveTab(day) {
    tabs.forEach((tab) => {
      const active = Number(tab.dataset.meteoDay) === day;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function openModal() {
    modal.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("meteoModalOpen");
    loadSvg()
      .then(() => refresh(currentDay))
      .catch((err) => {
        setMapLoading(true, err.message || "Harita yüklenemedi");
      });
  }

  function closeModal() {
    modal.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("meteoModalOpen");
    hideTooltip();
  }

  fab.addEventListener("click", openModal);
  modal.querySelectorAll("[data-meteo-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const day = Number(tab.dataset.meteoDay);
      setActiveTab(day);
      if (!modal.hidden && svgLoaded) refresh(day);
    });
  });

  fetchData(1)
    .then((data) => {
      if (data.ok && data.warningCount > 0 && badge) {
        badge.textContent = String(data.warningCount);
        badge.hidden = false;
      }
    })
    .catch(() => {});
})();
