(function () {
  const root = document.getElementById("enkazQuiz");
  if (!root) return;

  const playEl = document.getElementById("enkazQuizPlay");
  const resultEl = document.getElementById("enkazQuizResult");
  const progressEl = document.getElementById("enkazQuizProgress");
  const promptEl = document.getElementById("enkazQuizPrompt");
  const optionsEl = document.getElementById("enkazQuizOptions");
  const feedbackEl = document.getElementById("enkazQuizFeedback");
  const nextBtn = document.getElementById("enkazQuizNext");
  const restartBtn = document.getElementById("enkazQuizRestart");
  const resultScoreEl = document.getElementById("enkazQuizResultScore");
  const resultTextEl = document.getElementById("enkazQuizResultText");

  let data = null;
  let index = 0;
  let answers = [];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showPlay() {
    playEl.hidden = false;
    resultEl.hidden = true;
  }

  function showResult() {
    playEl.hidden = true;
    resultEl.hidden = false;
    const correct = answers.filter((a) => a.correct).length;
    const total = answers.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;

    let label = "Geliştirilmeli";
    if (pct >= 90) label = "Çok iyi";
    else if (pct >= 70) label = "İyi";
    else if (pct >= 50) label = "Orta";

    resultScoreEl.innerHTML = `
      <span class="enkazQuizResult__pct">${pct}%</span>
      <span class="enkazQuizResult__label">${label}</span>
      <span class="muted">${correct} / ${total} doğru karar</span>
    `;

    resultTextEl.innerHTML =
      pct >= 70
        ? `<p>Enkaz altında doğru kararlar enerji, iletişim ve güvenliği korur. Rehberi tekrar gözden geçirebilirsiniz.</p>`
        : `<p>Bazı seçimler riskli olabilir. Yukarıdaki rehber bölümlerini ve deprem sayfasındaki önce/sıra/sonra adımlarını incelemeniz önerilir.</p>`;
  }

  function renderQuestion() {
    const scenario = data.scenarios[index];
    if (!scenario) {
      showResult();
      return;
    }

    progressEl.textContent = `Soru ${index + 1} / ${data.scenarios.length}`;
    promptEl.textContent = scenario.prompt;
    optionsEl.innerHTML = scenario.options
      .map(
        (opt, i) =>
          `<button type="button" class="enkazQuizOption" data-opt="${i}">${escapeHtml(opt.text)}</button>`
      )
      .join("");

    feedbackEl.hidden = true;
    feedbackEl.className = "enkazQuizFeedback";
    feedbackEl.innerHTML = "";
    nextBtn.hidden = true;

    optionsEl.querySelectorAll(".enkazQuizOption").forEach((btn) => {
      btn.addEventListener("click", () => pickOption(Number(btn.getAttribute("data-opt"))));
    });
  }

  function pickOption(optIdx) {
    const scenario = data.scenarios[index];
    const opt = scenario.options[optIdx];
    if (!opt) return;

    answers.push({ correct: !!opt.correct, id: scenario.id });

    optionsEl.querySelectorAll(".enkazQuizOption").forEach((btn, i) => {
      btn.disabled = true;
      if (i === optIdx) btn.classList.add(opt.correct ? "enkazQuizOption--ok" : "enkazQuizOption--bad");
      else if (scenario.options[i].correct) btn.classList.add("enkazQuizOption--ok");
    });

    feedbackEl.hidden = false;
    feedbackEl.className = `enkazQuizFeedback enkazQuizFeedback--${opt.correct ? "ok" : "bad"}`;
    feedbackEl.innerHTML = `
      <strong>${opt.correct ? "Doğru yaklaşım" : "Riskli veya verimsiz seçim"}</strong>
      <p>${escapeHtml(opt.feedback)}</p>
    `;

    nextBtn.hidden = false;
    nextBtn.textContent = index + 1 >= data.scenarios.length ? "Sonuçları gör" : "Sonraki soru";
  }

  nextBtn?.addEventListener("click", () => {
    index += 1;
    renderQuestion();
  });

  restartBtn?.addEventListener("click", () => {
    index = 0;
    answers = [];
    showPlay();
    renderQuestion();
  });

  fetch("/data/enkaz-mini-senaryo.json")
    .then((r) => {
      if (!r.ok) throw new Error("Veri yüklenemedi");
      return r.json();
    })
    .then((json) => {
      data = json;
      const lead = document.getElementById("enkazQuizLead");
      if (lead && json.lead) lead.textContent = json.lead;
      renderQuestion();
    })
    .catch(() => {
      promptEl.textContent = "Senaryo verisi yüklenemedi. Lütfen sayfayı yenileyin.";
    });
})();
