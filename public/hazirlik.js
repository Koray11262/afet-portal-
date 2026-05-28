(function () {
  const hub = document.querySelector(".testHub");
  if (!hub) return;

  /* —— Sekmeler —— */
  const tabBtns = hub.querySelectorAll("[data-test-tab]");
  const panels = hub.querySelectorAll("[data-test-panel]");

  function switchTab(id) {
    tabBtns.forEach((btn) => {
      const on = btn.getAttribute("data-test-tab") === id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((p) => {
      const on = p.getAttribute("data-test-panel") === id;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-test-tab")));
  });

  /* —— Hazırlık testi —— */
  const hazirlikRoot = document.getElementById("hazirlikTest");
  const introEl = document.getElementById("hazirlikIntro");
  const quizEl = document.getElementById("hazirlikQuiz");
  const resultEl = document.getElementById("hazirlikResult");
  const progressEl = document.getElementById("hazirlikProgress");
  const categoryEl = document.getElementById("hazirlikCategory");
  const questionEl = document.getElementById("hazirlikQuestion");
  const chartCanvas = document.getElementById("hazirlikRadar");
  const overallEl = document.getElementById("hazirlikOverall");
  const recListEl = document.getElementById("hazirlikRecommendations");
  const categoryScoresEl = document.getElementById("hazirlikCategoryScores");

  let hazirlikData = null;
  let hazirlikIndex = 0;
  const hazirlikAnswers = [];
  let hazirlikChart = null;

  function showHazirlik(el) {
    introEl.hidden = el !== introEl;
    quizEl.hidden = el !== quizEl;
    resultEl.hidden = el !== resultEl;
  }

  function categoryById(data, id) {
    return data.categories.find((c) => c.id === id);
  }

  function renderHazirlikQuestion() {
    const q = hazirlikData.questions[hazirlikIndex];
    const cat = categoryById(hazirlikData, q.categoryId);
    progressEl.textContent = `Soru ${hazirlikIndex + 1} / ${hazirlikData.questions.length}`;
    categoryEl.textContent = cat ? cat.name : "";
    questionEl.textContent = q.text;
  }

  function computeHazirlikCategoryScores() {
    const sums = {};
    const counts = {};
    for (const c of hazirlikData.categories) {
      sums[c.id] = 0;
      counts[c.id] = 0;
    }
    hazirlikData.questions.forEach((q, i) => {
      const val = hazirlikAnswers[i];
      if (val == null) return;
      sums[q.categoryId] += val;
      counts[q.categoryId] += 1;
    });
    return hazirlikData.categories.map((c) => {
      const n = counts[c.id] || 1;
      return {
        id: c.id,
        name: c.name,
        score: Math.round((sums[c.id] / n) * 10) / 10,
        recommendations: c.recommendations,
      };
    });
  }

  function overallLabel(score) {
    if (score >= 8.5) return { text: "Çok iyi hazırlık", tone: "good" };
    if (score >= 6.5) return { text: "İyi, geliştirilebilir", tone: "mid" };
    if (score >= 4) return { text: "Orta düzey", tone: "warn" };
    return { text: "Güçlendirilmeli", tone: "low" };
  }

  const LS_HAZIRLIK_SCORES = "hazirlik_last_scores_v1";

  function saveHazirlikScores(catScores, overall) {
    try {
      localStorage.setItem(
        LS_HAZIRLIK_SCORES,
        JSON.stringify({
          at: Date.now(),
          overall,
          categoryScores: Object.fromEntries(catScores.map((c) => [c.id, c.score])),
        })
      );
    } catch {
      /* depolama dolu olabilir */
    }
  }

  function readHazirlikScores() {
    try {
      return JSON.parse(localStorage.getItem(LS_HAZIRLIK_SCORES) || "null");
    } catch {
      return null;
    }
  }

  function renderHazirlikResults() {
    const catScores = computeHazirlikCategoryScores();
    const overall =
      Math.round((catScores.reduce((a, c) => a + c.score, 0) / catScores.length) * 10) / 10;
    const label = overallLabel(overall);
    saveHazirlikScores(catScores, overall);

    overallEl.innerHTML = `
      <div class="hazirlikOverall__score">${overall}<span>/10</span></div>
      <p class="hazirlikOverall__label hazirlikOverall__label--${label.tone}">${label.text}</p>
      <p class="muted">Genel hazırlık; kategori ortalamalarının dengeli özeti.</p>
    `;

    categoryScoresEl.innerHTML = catScores
      .map(
        (c) => `
        <div class="hazirlikCatScore">
          <span class="hazirlikCatScore__name">${c.name}</span>
          <span class="hazirlikCatScore__val">${c.score}</span>
        </div>
      `
      )
      .join("");

    const threshold = hazirlikData.weakThreshold ?? 7;
    const weak = catScores.filter((c) => c.score < threshold);
    if (weak.length === 0) {
      recListEl.innerHTML =
        '<p class="muted">Tüm kategorilerde güçlü görünüyorsunuz. Periyodik olarak kontrol etmeye devam edin.</p>';
    } else {
      recListEl.innerHTML = weak
        .map(
          (c) => `
          <div class="hazirlikRec">
            <h4>${c.name} <span class="muted">(${c.score}/10)</span></h4>
            <ul>${c.recommendations.map((r) => `<li>${r}</li>`).join("")}</ul>
          </div>
        `
        )
        .join("");
    }

    if (hazirlikChart) hazirlikChart.destroy();
    hazirlikChart = new Chart(chartCanvas, {
      type: "radar",
      data: {
        labels: catScores.map((c) => c.name),
        datasets: [
          {
            label: "Kategori puanı",
            data: catScores.map((c) => c.score),
            backgroundColor: "rgba(11, 77, 143, 0.15)",
            borderColor: "#0b4d8f",
            pointBackgroundColor: "#0b4d8f",
            pointBorderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0,
            max: 10,
            ticks: { stepSize: 2, color: "#94a3b8" },
            grid: { color: "#e2e8f0" },
            angleLines: { color: "#e2e8f0" },
            pointLabels: { color: "#1e2d3d", font: { size: 12 } },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    showHazirlik(resultEl);
  }

  function hazirlikAnswer(key) {
    if (!hazirlikData) return;
    const pts = hazirlikData.scores[key];
    if (pts == null) return;
    hazirlikAnswers[hazirlikIndex] = pts;
    hazirlikIndex += 1;
    if (hazirlikIndex >= hazirlikData.questions.length) {
      renderHazirlikResults();
      return;
    }
    renderHazirlikQuestion();
  }

  function startHazirlikQuiz() {
    if (!hazirlikData?.questions?.length) return;
    hazirlikIndex = 0;
    hazirlikAnswers.length = 0;
    renderHazirlikQuestion();
    showHazirlik(quizEl);
  }

  function restartHazirlik() {
    if (hazirlikChart) {
      hazirlikChart.destroy();
      hazirlikChart = null;
    }
    showHazirlik(introEl);
  }

  hazirlikRoot?.querySelector("[data-action=start]")?.addEventListener("click", startHazirlikQuiz);
  hazirlikRoot?.querySelector("[data-action=restart]")?.addEventListener("click", restartHazirlik);
  hazirlikRoot?.querySelectorAll("[data-answer]").forEach((btn) => {
    btn.addEventListener("click", () => hazirlikAnswer(btn.getAttribute("data-answer")));
  });

  fetch("/hazirlik-sorular.json")
    .then((r) => {
      if (!r.ok) throw new Error("Sorular yüklenemedi");
      return r.json();
    })
    .then((json) => {
      hazirlikData = json;
      const startBtn = hazirlikRoot?.querySelector("[data-action=start]");
      if (startBtn) startBtn.disabled = false;
    })
    .catch(() => {
      if (questionEl) {
        questionEl.textContent =
          "Test verileri yüklenemedi. Sayfayı yenileyin veya daha sonra tekrar deneyin.";
      }
    });

  /* —— Afet bilgi testi —— */
  const bilgiRoot = document.getElementById("bilgiTest");
  const bilgiIntro = document.getElementById("bilgiIntro");
  const bilgiQuiz = document.getElementById("bilgiQuiz");
  const bilgiResult = document.getElementById("bilgiResult");
  const bilgiProgress = document.getElementById("bilgiProgress");
  const bilgiCategory = document.getElementById("bilgiCategory");
  const bilgiQuestion = document.getElementById("bilgiQuestion");
  const bilgiOptions = document.getElementById("bilgiOptions");
  const bilgiFeedback = document.getElementById("bilgiFeedback");
  const bilgiNext = document.getElementById("bilgiNext");
  const bilgiOverall = document.getElementById("bilgiOverall");
  const bilgiCategoryScores = document.getElementById("bilgiCategoryScores");
  const bilgiRecommendations = document.getElementById("bilgiRecommendations");

  let bilgiData = null;
  let bilgiIndex = 0;
  const bilgiChosen = [];
  let bilgiAnswered = false;

  function showBilgi(el) {
    bilgiIntro.hidden = el !== bilgiIntro;
    bilgiQuiz.hidden = el !== bilgiQuiz;
    bilgiResult.hidden = el !== bilgiResult;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBilgiQuestion() {
    bilgiAnswered = false;
    bilgiFeedback.hidden = true;
    bilgiNext.hidden = true;
    const q = bilgiData.questions[bilgiIndex];
    const cat = categoryById(bilgiData, q.categoryId);
    bilgiProgress.textContent = `Soru ${bilgiIndex + 1} / ${bilgiData.questions.length}`;
    bilgiCategory.textContent = cat ? cat.name : "";
    bilgiQuestion.textContent = q.text;
    bilgiOptions.innerHTML = q.options
      .map(
        (opt, i) =>
          `<button type="button" class="bilgiOption" data-option="${i}">${escapeHtml(opt)}</button>`
      )
      .join("");
    bilgiOptions.querySelectorAll(".bilgiOption").forEach((btn) => {
      btn.addEventListener("click", () => pickBilgiOption(Number(btn.getAttribute("data-option"))));
    });
  }

  function pickBilgiOption(idx) {
    if (bilgiAnswered || !bilgiData) return;
    bilgiAnswered = true;
    bilgiChosen[bilgiIndex] = idx;
    const q = bilgiData.questions[bilgiIndex];
    const correct = q.correct === idx;

    bilgiOptions.querySelectorAll(".bilgiOption").forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correct) btn.classList.add("bilgiOption--correct");
      else if (i === idx && !correct) btn.classList.add("bilgiOption--wrong");
    });

    bilgiFeedback.hidden = false;
    bilgiFeedback.className = `bilgiFeedback bilgiFeedback--${correct ? "ok" : "fail"}`;
    bilgiFeedback.innerHTML = `
      <strong>${correct ? "Doğru" : "Yanlış"}</strong>
      <p>${escapeHtml(q.explanation)}</p>
    `;
    bilgiNext.hidden = false;
    bilgiNext.textContent =
      bilgiIndex + 1 >= bilgiData.questions.length ? "Sonuçları gör" : "Sonraki soru";
  }

  function computeBilgiStats() {
    const byCat = {};
    for (const c of bilgiData.categories) {
      byCat[c.id] = { correct: 0, total: 0, cat: c };
    }
    let correct = 0;
    bilgiData.questions.forEach((q, i) => {
      byCat[q.categoryId].total += 1;
      if (bilgiChosen[i] === q.correct) {
        correct += 1;
        byCat[q.categoryId].correct += 1;
      }
    });
    const categories = bilgiData.categories.map((c) => {
      const s = byCat[c.id];
      const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
      return { ...c, correct: s.correct, total: s.total, percent: pct };
    });
    const percent = Math.round((correct / bilgiData.questions.length) * 100);
    return { correct, total: bilgiData.questions.length, percent, categories };
  }

  function bilgiLabel(percent) {
    const pass = bilgiData.passPercent ?? 70;
    if (percent >= 90) return { text: "Mükemmel", tone: "good" };
    if (percent >= pass) return { text: "Başarılı", tone: "good" };
    if (percent >= 50) return { text: "Geliştirilmeli", tone: "warn" };
    return { text: "Tekrar çalışın", tone: "low" };
  }

  function renderBilgiResults() {
    const stats = computeBilgiStats();
    const label = bilgiLabel(stats.percent);
    const pass = bilgiData.passPercent ?? 70;

    bilgiOverall.innerHTML = `
      <div class="hazirlikOverall__score">${stats.correct}<span>/${stats.total}</span></div>
      <p class="hazirlikOverall__label hazirlikOverall__label--${label.tone}">${label.text} · %${stats.percent}</p>
      <p class="muted">${stats.percent >= pass ? "Geçme barajını aştınız." : `Geçme barajı: %${pass}. Konu rehberlerini inceleyebilirsiniz.`}</p>
    `;

    bilgiCategoryScores.innerHTML = stats.categories
      .map(
        (c) => `
        <div class="hazirlikCatScore">
          <span class="hazirlikCatScore__name">${escapeHtml(c.name)}</span>
          <span class="hazirlikCatScore__val">${c.correct}/${c.total} (%${c.percent})</span>
        </div>
      `
      )
      .join("");

    const weak = stats.categories.filter((c) => c.percent < pass);
    if (weak.length === 0) {
      bilgiRecommendations.innerHTML =
        '<p class="muted">Tüm konularda iyi performans. Bilginizi güncel tutmak için AFAD rehberlerine göz atabilirsiniz.</p>';
    } else {
      bilgiRecommendations.innerHTML = weak
        .map(
          (c) => `
          <div class="hazirlikRec">
            <h4>${escapeHtml(c.name)} <span class="muted">(%${c.percent})</span></h4>
            <ul>${c.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
            ${c.slug ? `<a class="btn btn--ghost btn--sm" href="/afet/${c.slug}">Rehberi oku →</a>` : ""}
          </div>
        `
        )
        .join("");
    }

    showBilgi(bilgiResult);
  }

  function startBilgiQuiz() {
    if (!bilgiData?.questions?.length) return;
    bilgiIndex = 0;
    bilgiChosen.length = 0;
    renderBilgiQuestion();
    showBilgi(bilgiQuiz);
  }

  function restartBilgi() {
    showBilgi(bilgiIntro);
  }

  bilgiNext?.addEventListener("click", () => {
    bilgiIndex += 1;
    if (bilgiIndex >= bilgiData.questions.length) {
      renderBilgiResults();
      return;
    }
    renderBilgiQuestion();
  });

  bilgiRoot?.querySelector("[data-bilgi-action=start]")?.addEventListener("click", startBilgiQuiz);
  bilgiRoot?.querySelector("[data-bilgi-action=restart]")?.addEventListener("click", restartBilgi);

  fetch("/afet-bilgi-sorular.json")
    .then((r) => {
      if (!r.ok) throw new Error("Sorular yüklenemedi");
      return r.json();
    })
    .then((json) => {
      bilgiData = json;
      const startBtn = bilgiRoot?.querySelector("[data-bilgi-action=start]");
      if (startBtn) startBtn.disabled = false;
    })
    .catch(() => {
      if (bilgiQuestion) {
        bilgiQuestion.textContent =
          "Test verileri yüklenemedi. Sayfayı yenileyin veya daha sonra tekrar deneyin.";
      }
    });

  /* URL hash ile sekme: #bilgi */
  if (window.location.hash === "#bilgi") {
    switchTab("bilgi");
  }

  /* —— Yapay zeka destekli bölgesel öneriler —— */
  const aiForm = document.getElementById("hazirlikAiForm");
  const aiIl = document.getElementById("hazirlikAiIl");
  const aiIlce = document.getElementById("hazirlikAiIlce");
  const aiStatus = document.getElementById("hazirlikAiStatus");
  const aiResults = document.getElementById("hazirlikAiResults");
  const aiSubmit = document.getElementById("hazirlikAiSubmit");

  function aiEscape(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAiBlock(title, items, tagClass, tagLabel) {
    if (!items?.length) return "";
    const lis = items.map((t) => `<li>${aiEscape(t)}</li>`).join("");
    const tag = tagLabel
      ? `<span class="hazirlikAi__tag hazirlikAi__tag--${tagClass}">${aiEscape(tagLabel)}</span>`
      : "";
    return `<section class="hazirlikAiBlock"><h3>${tag}${aiEscape(title)}</h3><ul class="hazirlikAiList">${lis}</ul></section>`;
  }

  function renderAiLiveAlerts(alerts) {
    if (!alerts?.length) {
      return `<div class="hazirlikAiLive hazirlikAiLive--ok panel">
        <p class="muted" style="margin:0">Bu il için şu an MGM veya yangın haritasında öne çıkan aktif uyarı yok. Genel risk ve hazırlık önerileri aşağıda.</p>
      </div>`;
    }
    return `<div class="hazirlikAiLive">
      <h3 class="hazirlikAiCol__title">Canlı uyarılar (MGM + yangın haritası)</h3>
      <div class="hazirlikAiLiveGrid">
        ${alerts
          .map((a) => {
            const sev = a.severity || "info";
            const prepLis = (a.prep || [])
              .map((p) => `<li>${aiEscape(p)}</li>`)
              .join("");
            const link =
              a.href && a.source === "mgm"
                ? `<a class="refLink" href="${aiEscape(a.href)}" target="_blank" rel="noopener noreferrer">MGM MeteoUyarı →</a>`
                : a.source === "yangin"
                  ? `<span class="muted small">${aiEscape(a.note || "")}</span>`
                  : "";
            return `<article class="hazirlikAiLiveCard hazirlikAiLiveCard--${sev}">
              <div class="hazirlikAiLiveCard__badge">${a.source === "mgm" ? "Hava" : "Yangın"}</div>
              <h4>${aiEscape(a.title)}</h4>
              <p class="hazirlikAiLiveCard__summary">${aiEscape(a.summary)}</p>
              <ul class="hazirlikAiList">${prepLis}</ul>
              ${link}
            </article>`;
          })
          .join("")}
      </div>
    </div>`;
  }

  function renderAiResults(data) {
    if (!aiResults) return;

    const liveHtml = renderAiLiveAlerts(data.liveAlerts);

    const riskCards = (data.riskyDisasters || [])
      .map((r) => {
        const levelClass =
          r.level === "high" ? "high" : r.level === "medium" ? "mid" : "low";
        const link = r.href
          ? `<a class="refLink" href="${aiEscape(r.href)}">Rehberi oku →</a>`
          : "";
        return `<article class="hazirlikAiRisk hazirlikAiRisk--${levelClass}">
          <div class="hazirlikAiRisk__top">
            <strong>${aiEscape(r.label)}</strong>
            <span class="hazirlikAiRisk__score">${r.score}/10 · ${aiEscape(r.levelLabel)}</span>
          </div>
          <p class="muted small">${aiEscape(r.intro)}</p>
          ${link}
        </article>`;
      })
      .join("");

    const prepBlocks = (data.preparation || [])
      .map((s) => renderAiBlock(s.title, s.items, "prep", "Hazırlık"))
      .join("");
    const equipBlocks = (data.equipment || [])
      .map((s) => renderAiBlock(s.title, s.items, "equip", "Ekipman"))
      .join("");
    const personalBlocks = (data.personalized || [])
      .map((s) => renderAiBlock(s.title, s.items, "you", "Size özel"))
      .join("");
    const extraBlocks = (data.regionalExtras || [])
      .map((s) => renderAiBlock(s.title, s.items, "info", ""))
      .join("");

    aiResults.innerHTML = `
      <div class="hazirlikAiSummary panel">
        <p class="hazirlikAiSummary__text">${aiEscape(data.summary)}</p>
        <p class="muted small">${data.totalRecommendations || 0} öneri maddesi · ${aiEscape(data.disclaimer || "")}</p>
      </div>
      ${liveHtml}
      <div class="hazirlikAiGrid">
        <div class="hazirlikAiCol">
          <h3 class="hazirlikAiCol__title">Hangi afetler riskli?</h3>
          <div class="hazirlikAiRiskGrid">${riskCards || "<p class='muted'>Risk verisi yok.</p>"}</div>
        </div>
        <div class="hazirlikAiCol hazirlikAiCol--wide">
          <h3 class="hazirlikAiCol__title">Nasıl hazırlanmalı?</h3>
          ${prepBlocks}
          ${extraBlocks}
        </div>
        <div class="hazirlikAiCol">
          <h3 class="hazirlikAiCol__title">Hangi ekipman gerekli?</h3>
          ${equipBlocks}
          ${personalBlocks}
        </div>
      </div>
      <div class="hazirlikAiLinks">
        <a class="btn btn--ghost btn--sm" href="/il-riskleri?il=${encodeURIComponent(data.location?.il || "")}">İl risk haritası</a>
        <a class="btn btn--ghost btn--sm" href="/acil-canta">Acil çanta planlayıcı</a>
        <a class="btn btn--ghost btn--sm" href="/aile-afet-plani">Aile afet planı</a>
        <a class="btn btn--ghost btn--sm" href="/kaynaklar">Farkındalık Merkezi</a>
      </div>
    `;
    aiResults.hidden = false;
    aiResults.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function loadAiIller() {
    if (!aiIl) return;
    try {
      const res = await fetch("/api/yerlesim/iller");
      const json = await res.json();
      if (!json.ok) return;
      const names = (json.iller || []).slice().sort((a, b) => String(a).localeCompare(String(b), "tr"));
      aiIl.innerHTML = `<option value="">İl seçin…</option>${names
        .map((n) => `<option value="${aiEscape(n)}">${aiEscape(n)}</option>`)
        .join("")}`;
    } catch {
      aiIl.innerHTML = `<option value="">İller yüklenemedi</option>`;
    }
  }

  async function loadAiIlceler(il) {
    if (!aiIlce) return;
    aiIlce.disabled = true;
    aiIlce.innerHTML = `<option value="">Yükleniyor…</option>`;
    try {
      const res = await fetch(`/api/yerlesim/ilceler?il=${encodeURIComponent(il)}`);
      const json = await res.json();
      const list = (json.ilceler || []).filter(Boolean);
      aiIlce.innerHTML = `<option value="">İlçe seçmeyebilirsiniz</option>${list
        .map((n) => `<option value="${aiEscape(n)}">${aiEscape(n)}</option>`)
        .join("")}`;
      aiIlce.disabled = false;
    } catch {
      aiIlce.innerHTML = `<option value="">İlçe yüklenemedi</option>`;
    }
  }

  if (aiIl) {
    aiIl.addEventListener("change", () => {
      const il = aiIl.value;
      if (!il) {
        aiIlce.innerHTML = `<option value="">Önce il seçin</option>`;
        aiIlce.disabled = true;
        return;
      }
      loadAiIlceler(il);
    });
  }

  aiForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const il = aiIl?.value?.trim();
    const ilce = aiIlce?.value?.trim() || "";
    if (!il) return;

    const saved = readHazirlikScores();
    if (aiStatus) {
      aiStatus.textContent = saved
        ? "Analiz ediliyor… MGM hava uyarıları, yangın haritası ve hazırlık testi skorlarınız birleştiriliyor."
        : "Analiz ediliyor… MGM hava uyarıları ve yangın haritası kontrol ediliyor.";
    }
    if (aiSubmit) aiSubmit.disabled = true;
    if (aiResults) aiResults.hidden = true;

    try {
      const res = await fetch("/api/hazirlik/akilli-oneri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          il,
          ilce,
          categoryScores: saved?.categoryScores || null,
          weakThreshold: hazirlikData?.weakThreshold ?? 7,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Öneriler alınamadı");
      renderAiResults(json);
      if (aiStatus) {
        aiStatus.textContent = `${json.location?.il}${
          json.location?.ilce ? ` / ${json.location.ilce}` : ""
        } için ${json.totalRecommendations || 0} öneri oluşturuldu.`;
      }
    } catch (err) {
      if (aiStatus) aiStatus.textContent = err?.message || "Öneriler alınamadı.";
    } finally {
      if (aiSubmit) aiSubmit.disabled = false;
    }
  });

  loadAiIller();

  const params = new URLSearchParams(window.location.search);
  const qIl = params.get("il");
  if (qIl && aiIl) {
    aiIl.value = qIl;
    loadAiIlceler(qIl).then(() => {
      const qIlce = params.get("ilce");
      if (qIlce && aiIlce) aiIlce.value = qIlce;
    });
  }
})();
