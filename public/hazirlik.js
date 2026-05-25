(function () {
  const root = document.getElementById("hazirlikTest");
  if (!root) return;

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

  let data = null;
  let index = 0;
  const answers = [];
  let chart = null;

  function show(el) {
    introEl.hidden = el !== introEl;
    quizEl.hidden = el !== quizEl;
    resultEl.hidden = el !== resultEl;
  }

  function categoryById(id) {
    return data.categories.find((c) => c.id === id);
  }

  function renderQuestion() {
    const q = data.questions[index];
    const cat = categoryById(q.categoryId);
    progressEl.textContent = `Soru ${index + 1} / ${data.questions.length}`;
    categoryEl.textContent = cat ? cat.name : "";
    questionEl.textContent = q.text;
  }

  function computeCategoryScores() {
    const sums = {};
    const counts = {};
    for (const c of data.categories) {
      sums[c.id] = 0;
      counts[c.id] = 0;
    }
    data.questions.forEach((q, i) => {
      const val = answers[i];
      if (val == null) return;
      sums[q.categoryId] += val;
      counts[q.categoryId] += 1;
    });
    return data.categories.map((c) => {
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

  function renderResults() {
    const catScores = computeCategoryScores();
    const overall =
      Math.round(
        (catScores.reduce((a, c) => a + c.score, 0) / catScores.length) * 10
      ) / 10;
    const label = overallLabel(overall);

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

    const threshold = data.weakThreshold ?? 7;
    const weak = catScores.filter((c) => c.score < threshold);
    if (weak.length === 0) {
      recListEl.innerHTML =
        "<p class=\"muted\">Tüm kategorilerde güçlü görünüyorsunuz. Periyodik olarak kontrol etmeye devam edin.</p>";
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

    if (chart) chart.destroy();
    chart = new Chart(chartCanvas, {
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
        plugins: {
          legend: { display: false },
        },
      },
    });

    show(resultEl);
  }

  function answer(key) {
    if (!data) return;
    const pts = data.scores[key];
    if (pts == null) return;
    answers[index] = pts;
    index += 1;
    if (index >= data.questions.length) {
      renderResults();
      return;
    }
    renderQuestion();
  }

  function startQuiz() {
    if (!data?.questions?.length) return;
    index = 0;
    answers.length = 0;
    renderQuestion();
    show(quizEl);
  }

  function restart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    show(introEl);
  }

  root.querySelector("[data-action=start]")?.addEventListener("click", startQuiz);
  root.querySelector("[data-action=restart]")?.addEventListener("click", restart);
  root.querySelectorAll("[data-answer]").forEach((btn) => {
    btn.addEventListener("click", () => answer(btn.getAttribute("data-answer")));
  });

  fetch("/hazirlik-sorular.json")
    .then((r) => {
      if (!r.ok) throw new Error("Sorular yüklenemedi");
      return r.json();
    })
    .then((json) => {
      data = json;
      const startBtn = root.querySelector("[data-action=start]");
      if (startBtn) startBtn.disabled = false;
    })
    .catch(() => {
      questionEl.textContent =
        "Test verileri yüklenemedi. Sayfayı yenileyin veya daha sonra tekrar deneyin.";
    });
})();
