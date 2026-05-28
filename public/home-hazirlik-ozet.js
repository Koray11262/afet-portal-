(function () {
  const Lib = window.HazirlikOzet;
  if (!Lib) return;

  const fab = document.getElementById("hazirlikOzetFabBtn");
  const modal = document.getElementById("hazirlikOzetModal");
  const inline = document.getElementById("hazirlikOzetInline");

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBreakdown(summary, target) {
    if (!target) return;
    const rows = [
      { label: "Hazırlık testi", val: summary.hazirlikPts, max: 35, done: !!summary.snapshot.hazirlik },
      { label: "Afet bilgi testi", val: summary.bilgiPts, max: 25, done: !!summary.snapshot.bilgi },
      { label: "Acil çanta", val: summary.cantaPts, max: 25, done: summary.canta.done > 0 },
      { label: "Ev güvenlik kontrolü", val: summary.homePts, max: 15, done: summary.home.done > 0 },
    ];
    target.innerHTML = rows
      .map((r) => {
        const pct = r.max ? Math.round((r.val / r.max) * 100) : 0;
        return `<div class="hazirlikOzetBar">
          <div class="hazirlikOzetBar__head">
            <span>${escapeHtml(r.label)}</span>
            <span class="muted">${r.val}/${r.max}${r.done ? "" : " · henüz yok"}</span>
          </div>
          <div class="hazirlikOzetBar__track"><div class="hazirlikOzetBar__fill" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join("");
  }

  async function renderSteps(summary, target) {
    if (!target) return;
    let steps = Lib.pickWeeklySteps(summary);

    const il = summary.snapshot.profile?.il;
    if (il) {
      const risk = await Lib.fetchTopRiskForIl(il);
      if (risk) {
        const riskStep = {
          text: `${il} için öncelikli risk: ${risk.label} (${risk.puan}/10). Rehberi okuyun.`,
          href: risk.href,
        };
        steps = [riskStep, ...steps.filter((s) => !s.riskIl)].slice(0, 3);
      }
    }

    target.innerHTML = steps
      .map(
        (s, i) =>
          `<li class="hazirlikOzetStep">
            <span class="hazirlikOzetStep__n">${i + 1}</span>
            ${
              s.href
                ? `<a href="${escapeHtml(s.href)}">${escapeHtml(s.text)}</a>`
                : `<span>${escapeHtml(s.text)}</span>`
            }
          </li>`
      )
      .join("");
  }

  function updateFabBadge(summary) {
    const badge = document.getElementById("hazirlikOzetFabBadge");
    if (!badge) return;
    if (!summary.hasData) {
      badge.hidden = true;
      return;
    }
    badge.hidden = false;
    badge.textContent = String(summary.score);
    badge.title = `Hazırlık skoru: ${summary.score}`;
  }

  async function renderSummary() {
    const snapshot = Lib.readSnapshot();
    const summary = Lib.computeSummary(snapshot);

    const scoreVal = document.getElementById("hazirlikOzetScoreVal");
    const badgeEmoji = document.getElementById("hazirlikOzetBadgeEmoji");
    const badgeLabel = document.getElementById("hazirlikOzetBadgeLabel");
    const meta = document.getElementById("hazirlikOzetMeta");
    const scoreRing = document.getElementById("hazirlikOzetScoreRing");
    const breakdown = document.getElementById("hazirlikOzetBreakdown");
    const steps = document.getElementById("hazirlikOzetSteps");

    const inlineScore = document.getElementById("hazirlikOzetInlineScore");
    const inlineBadge = document.getElementById("hazirlikOzetInlineBadge");
    const inlineSteps = document.getElementById("hazirlikOzetInlineSteps");
    const inlineBreakdown = document.getElementById("hazirlikOzetInlineBreakdown");
    const inlineMeta = document.getElementById("hazirlikOzetInlineMeta");

    if (!summary.hasData) {
      const emptyMsg =
        "Henüz kayıtlı veri yok. Acil çanta listesini işaretleyin, hazırlık testini çözün veya ev kontrol listesini doldurun.";
      if (scoreVal) scoreVal.textContent = "—";
      if (badgeEmoji) badgeEmoji.textContent = "🌱";
      if (badgeLabel) badgeLabel.textContent = "Başlayın";
      if (meta) meta.textContent = emptyMsg;
      if (inlineMeta) inlineMeta.textContent = emptyMsg;
      renderBreakdown(summary, breakdown || inlineBreakdown);
      renderBreakdown(summary, inlineBreakdown);
      const emptySteps = [
        { text: "Hazırlık testine başlayın.", href: "/hazirlik-skoru" },
        { text: "Acil çanta checklist’ini açın.", href: "/acil-canta" },
        { text: "Ev güvenlik kontrolünü yapın.", href: "/kaynaklar#yas-40-plus" },
      ];
      const stepHtml = emptySteps
        .map(
          (s, i) =>
            `<li class="hazirlikOzetStep"><span class="hazirlikOzetStep__n">${i + 1}</span><a href="${s.href}">${escapeHtml(s.text)}</a></li>`
        )
        .join("");
      if (steps) steps.innerHTML = stepHtml;
      if (inlineSteps) inlineSteps.innerHTML = stepHtml;
      updateFabBadge(summary);
      return;
    }

    if (scoreVal) scoreVal.textContent = String(summary.score);
    if (inlineScore) inlineScore.textContent = String(summary.score);
    if (badgeEmoji) badgeEmoji.textContent = summary.badge.emoji;
    if (badgeLabel) badgeLabel.textContent = summary.badge.label;
    if (inlineBadge) {
      inlineBadge.textContent = `${summary.badge.emoji} ${summary.badge.label}`;
    }
    const metaText = `Genel skor ${summary.score}/100 · Çanta ${summary.canta.done}/${summary.canta.total} · Ev kontrolü ${summary.home.done}/${summary.home.total}`;
    if (meta) meta.textContent = metaText;
    if (inlineMeta) inlineMeta.textContent = metaText;

    if (scoreRing) {
      scoreRing.style.setProperty("--hazirlik-score", String(summary.score));
    }

    renderBreakdown(summary, breakdown);
    renderBreakdown(summary, inlineBreakdown);
    await renderSteps(summary, steps);
    await renderSteps(summary, inlineSteps);
    updateFabBadge(summary);
  }

  function openModal() {
    if (!modal || !fab) return;
    modal.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("hazirlikOzetModalOpen");
    renderSummary();
  }

  function closeModal() {
    if (!modal || !fab) return;
    modal.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("hazirlikOzetModalOpen");
  }

  if (fab && modal) {
    fab.addEventListener("click", () => {
      if (modal.hidden) openModal();
      else closeModal();
    });
    modal.querySelectorAll("[data-hazirlik-ozet-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  document.getElementById("hazirlikOzetRefresh")?.addEventListener("click", () => renderSummary());

  window.addEventListener("storage", (e) => {
    if (!e.key || !Object.values(Lib.KEYS).includes(e.key)) return;
    renderSummary();
  });

  window.addEventListener("pageshow", () => renderSummary());
  window.addEventListener("hazirlik-ozet-update", () => renderSummary());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderSummary();
  });

  renderSummary();
})();
