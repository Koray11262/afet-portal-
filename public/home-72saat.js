(function () {
  const fab = document.getElementById("saat72FabBtn");
  const modal = document.getElementById("saat72Modal");
  if (!fab || !modal) return;

  const Prep = window.Ilk72SaatPrep;
  const setupEl = document.getElementById("saat72Setup");
  const playEl = document.getElementById("saat72Play");
  const resultEl = document.getElementById("saat72Result");
  const setupForm = document.getElementById("saat72SetupForm");
  const prepHintEl = document.getElementById("saat72PrepHint");
  const disasterSel = document.getElementById("saat72Disaster");
  const characterSel = document.getElementById("saat72Character");
  const environmentSel = document.getElementById("saat72Environment");
  const timelineEl = document.getElementById("saat72Timeline");
  const eventEl = document.getElementById("saat72Event");
  const questionEl = document.getElementById("saat72Question");
  const optionsEl = document.getElementById("saat72Options");
  const feedbackEl = document.getElementById("saat72Feedback");
  const prepNotesEl = document.getElementById("saat72PrepNotes");
  const playActionsEl = document.getElementById("saat72PlayActions");
  const nextBtn = document.getElementById("saat72NextBtn");
  const resultScoreEl = document.getElementById("saat72ResultScore");
  const resultSummaryEl = document.getElementById("saat72ResultSummary");
  const resultPrepEl = document.getElementById("saat72ResultPrep");
  const restartBtn = document.getElementById("saat72RestartBtn");
  const metaEl = document.getElementById("saat72ModalMeta");

  let data = null;
  let state = null;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("saat72ModalOpen");
    fab.setAttribute("aria-expanded", "true");
    renderPrepHint();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("saat72ModalOpen");
    fab.setAttribute("aria-expanded", "false");
  }

  function renderPrepHint() {
    if (!prepHintEl || !Prep) return;
    const s = Prep.prepSummary();
    const planOk = s.planMissing.length === 0;
    prepHintEl.innerHTML = `
      <div class="saat72PrepHint__row">
        <span>Acil çanta: <strong>${s.cantaDone}/${s.cantaTotal}</strong> madde</span>
        <span>Aile planı: <strong>${planOk ? "Hazır" : s.planMissing.length + " eksik alan"}</strong></span>
      </div>
      <p class="muted small">Eksikler simülasyon sırasında karşınıza çıkar.</p>
    `;
  }

  function fillSetupForm() {
    if (!data) return;
    disasterSel.innerHTML = Object.entries(data.disasters)
      .map(([id, d]) => `<option value="${escapeHtml(id)}">${escapeHtml(d.label)}</option>`)
      .join("");
    characterSel.innerHTML = data.characters
      .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
      .join("");
    environmentSel.innerHTML = data.environments
      .map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.label)}</option>`)
      .join("");
  }

  function characterNote(id) {
    const notes = {
      yetiskin: "Tek başına hızlı karar vermeniz beklenir.",
      aile: "Çocukların güvenliği ve sakinlik önceliğinizdir.",
      yasli: "Hareket kısıtı ve ilaç ihtiyacı ekstra dikkat gerektirir.",
      ogrenci: "Yurt/okul tahliye kurallarına uyun.",
    };
    return notes[id] || "";
  }

  function environmentNote(id) {
    const notes = {
      apartman: "Asansör ve merdiven boşluğu riskleri yüksektir.",
      mustakil: "Gaz vanası ve bahçe eşyaları kontrol edilmelidir.",
      kirsal: "Ulaşım ve iletişim gecikebilir; stok kritiktir.",
      isyeri: "İş yeri acil planı ve toplanma noktası önceliklidir.",
    };
    return notes[id] || "";
  }

  function buildQuestionQueue(disasterId) {
    const disaster = data.disasters[disasterId];
    const queue = [];
    for (const phase of data.phases) {
      const questions = disaster.phases[phase.id] || [];
      for (const q of questions) {
        queue.push({ phase, question: q });
      }
    }
    return queue;
  }

  function showScreen(name) {
    setupEl.hidden = name !== "setup";
    playEl.hidden = name !== "play";
    resultEl.hidden = name !== "result";
  }

  function renderTimeline(activePhaseId, currentIdx, total) {
    timelineEl.innerHTML = data.phases
      .map((p) => {
        const active = p.id === activePhaseId ? " is-active" : "";
        const done = data.phases.findIndex((x) => x.id === activePhaseId) > data.phases.findIndex((x) => x.id === p.id);
        return `<div class="saat72Phase${active}${done ? " is-done" : ""}">
          <span class="saat72Phase__label">${escapeHtml(p.label)}</span>
          <span class="saat72Phase__sub">${escapeHtml(p.subtitle)}</span>
        </div>`;
      })
      .join("");
    if (metaEl) metaEl.textContent = `Adım ${currentIdx + 1} / ${total}`;
  }

  function renderQuestion() {
    const item = state.queue[state.index];
    if (!item) {
      finishSimulation();
      return;
    }

    const { phase, question } = item;
    const disaster = data.disasters[state.disasterId];
    const eventTime = question.clock || "—";
    const intro = (disaster.eventIntro || "").replace("{time}", eventTime);

    renderTimeline(phase.id, state.index, state.queue.length);

    eventEl.innerHTML = `
      <span class="saat72Event__clock">${escapeHtml(eventTime)}</span>
      <p class="saat72Event__intro">${escapeHtml(intro)}</p>
      <p class="saat72Event__ctx muted small">${escapeHtml(characterNote(state.characterId))} ${escapeHtml(environmentNote(state.environmentId))}</p>
    `;

    questionEl.innerHTML = `<h3 class="saat72Question__text">${escapeHtml(question.prompt)}</h3>`;

    optionsEl.innerHTML = question.options
      .map(
        (opt, i) =>
          `<button type="button" class="saat72Option" data-opt="${i}">${escapeHtml(opt.text)}</button>`
      )
      .join("");

    feedbackEl.hidden = true;
    prepNotesEl.hidden = true;
    playActionsEl.hidden = true;

    optionsEl.querySelectorAll(".saat72Option").forEach((btn) => {
      btn.addEventListener("click", () => pickOption(Number(btn.getAttribute("data-opt"))));
    });
  }

  function pickOption(idx) {
    const item = state.queue[state.index];
    const opt = item.question.options[idx];
    if (!opt) return;

    state.answers.push({ correct: !!opt.correct, phase: item.phase.id });

    optionsEl.querySelectorAll(".saat72Option").forEach((btn, i) => {
      btn.disabled = true;
      if (i === idx) btn.classList.add(opt.correct ? "saat72Option--ok" : "saat72Option--bad");
      else if (item.question.options[i].correct) btn.classList.add("saat72Option--ok");
    });

    feedbackEl.hidden = false;
    feedbackEl.className = `saat72Feedback saat72Feedback--${opt.correct ? "ok" : "bad"}`;
    feedbackEl.innerHTML = `
      <strong>${opt.correct ? "Doğru yaklaşım" : "Riskli seçim"}</strong>
      <p>${escapeHtml(opt.feedback)}</p>
    `;

    const prepMsgs = Prep?.evaluatePrepHooks(item.question.prepHooks, data.prepLabels) || [];
    if (prepMsgs.length) {
      prepNotesEl.hidden = false;
      prepNotesEl.innerHTML = `
        <h4 class="saat72PrepNotes__title">Hazırlık durumunuz</h4>
        <ul class="saat72PrepNotes__list">
          ${prepMsgs
            .map(
              (m) =>
                `<li class="saat72PrepNotes__item saat72PrepNotes__item--${m.type}">
                  <p>${escapeHtml(m.text)}</p>
                  <a href="${escapeHtml(m.href)}">${escapeHtml(m.action)}</a>
                </li>`
            )
            .join("")}
        </ul>
      `;
      state.prepIssues.push(...prepMsgs);
    }

    playActionsEl.hidden = false;
    nextBtn.textContent = state.index + 1 >= state.queue.length ? "Sonuçları gör" : "Sonraki adım";
  }

  function finishSimulation() {
    const correct = state.answers.filter((a) => a.correct).length;
    const total = state.answers.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;

    let label = "Geliştirilmeli";
    let emoji = "📋";
    if (pct >= 90) {
      label = "Mükemmel";
      emoji = "⭐";
    } else if (pct >= 70) {
      label = "İyi";
      emoji = "🛡️";
    } else if (pct >= 50) {
      label = "Orta";
      emoji = "⚠️";
    }

    resultScoreEl.innerHTML = `
      <span class="saat72Result__emoji">${emoji}</span>
      <span class="saat72Result__pct">${pct}%</span>
      <span class="saat72Result__label">${label}</span>
      <span class="muted">${correct}/${total} doğru karar</span>
    `;

    const disaster = data.disasters[state.disasterId];
    resultSummaryEl.innerHTML = `
      <p><strong>${escapeHtml(disaster.label)}</strong> simülasyonunu tamamladınız.</p>
      <p class="muted">72 saatlik süreçte doğru kararlar hayat kurtarır; yanlış seçimlerin geri bildirimlerini tekrar okuyun.</p>
    `;

    const uniquePrep = [];
    const seen = new Set();
    for (const m of state.prepIssues) {
      const key = m.type + m.label;
      if (seen.has(key)) continue;
      seen.add(key);
      uniquePrep.push(m);
    }

    if (uniquePrep.length) {
      resultPrepEl.innerHTML = `
        <h4>Simülasyonda öne çıkan hazırlık eksikleri</h4>
        <ul>${uniquePrep
          .map(
            (m) =>
              `<li>${escapeHtml(m.text)} <a href="${escapeHtml(m.href)}">${escapeHtml(m.action)}</a></li>`
          )
          .join("")}</ul>
      `;
    } else {
      const s = Prep?.prepSummary();
      resultPrepEl.innerHTML =
        s && s.cantaDone === s.cantaTotal && s.planMissing.length === 0
          ? `<p class="muted">Acil çanta ve aile planı verileriniz simülasyonda eksik olarak yansımadı. Harika!</p>`
          : `<p class="muted">Genel hazırlığınızı güçlendirmek için <a href="/acil-canta">acil çanta</a> ve <a href="/aile-afet-plani">aile planı</a> araçlarını kullanın.</p>`;
    }

    showScreen("result");
    if (metaEl) metaEl.textContent = "Simülasyon tamamlandı";
  }

  function startSimulation(disasterId, characterId, environmentId) {
    state = {
      disasterId,
      characterId,
      environmentId,
      queue: buildQuestionQueue(disasterId),
      index: 0,
      answers: [],
      prepIssues: [],
    };
    showScreen("play");
    renderQuestion();
  }

  function resetToSetup() {
    state = null;
    showScreen("setup");
    renderPrepHint();
    if (metaEl) metaEl.textContent = "Saat saat karar verin; sonuçları öğrenin.";
  }

  fab.addEventListener("click", openModal);
  modal.querySelectorAll("[data-saat72-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") closeModal();
  });

  setupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    startSimulation(disasterSel.value, characterSel.value, environmentSel.value);
  });

  nextBtn?.addEventListener("click", () => {
    state.index += 1;
    renderQuestion();
  });

  restartBtn?.addEventListener("click", resetToSetup);

  fetch("/data/ilk-72-saat.json")
    .then((r) => {
      if (!r.ok) throw new Error("Veri yüklenemedi");
      return r.json();
    })
    .then((json) => {
      data = json;
      fillSetupForm();
    })
    .catch(() => {
      if (prepHintEl) {
        prepHintEl.innerHTML = `<p class="muted">Simülasyon verisi yüklenemedi.</p>`;
      }
    });

  const params = new URLSearchParams(window.location.search);
  if (params.get("sim72") === "1") {
    setTimeout(openModal, 400);
  }

  window.Afet72Saat = { openModal, closeModal, resetToSetup };
})();
