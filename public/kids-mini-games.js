(function () {
  const root = document.querySelector("[data-kids-games-daily]");
  if (!root) return;

  const metaEl = root.querySelector("[data-kids-games-meta]");
  const listEl = root.querySelector("[data-kids-games-list]");

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function daySeed() {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickForToday(games, count) {
    const arr = [...games];
    let seed = daySeed();
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(count, arr.length));
  }

  function formatDateTr() {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }

  function renderGame(game) {
    const correct = game.correct || [];
    const traps = game.traps || [];
    const allItems = [
      ...correct.map((x) => ({ ...x, correct: true })),
      ...traps.map((x) => ({ ...x, correct: false })),
    ];
    let seed = daySeed() ^ game.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = allItems.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const j = seed % (i + 1);
      [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }

    const itemsHtml = allItems
      .map(
        (item) =>
          `<button type="button" class="kidsItem${item.correct ? "" : " kidsItem--trap"}" data-kids-item="${escapeHtml(item.id)}" data-kids-correct="${item.correct ? "1" : "0"}">${escapeHtml(item.label)}</button>`
      )
      .join("");

    const linkHtml = game.link
      ? `<a class="btn btn--ghost btn--sm" href="${escapeHtml(game.link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(game.link.label)}</a>`
      : "";

    return `
      <div class="kidsGame" data-kids-game="${escapeHtml(game.id)}" data-kids-min-pass="${game.minToPass || 3}" data-kids-correct-count="${game.correctCount || correct.length}">
        <div class="kidsGame__head">
          <strong>${escapeHtml(game.title)}</strong>
          <span class="muted small" data-kids-score>0 / ${game.correctCount || correct.length}</span>
        </div>
        <p class="muted small kidsGame__goal">${escapeHtml(game.goal)}</p>
        <div class="kidsGame__grid" aria-label="${escapeHtml(game.title)}">
          <div class="kidsGame__bag" aria-label="Seçim alanı">
            <div class="kidsGame__bagTop">
              <span class="kidsGame__bagIcon" aria-hidden="true">🎒</span>
              <span><strong>Seçtiklerin</strong> <span class="muted small">(geri almak için tıkla)</span></span>
            </div>
            <div class="kidsGame__drop" data-kids-drop></div>
            <div class="kidsGame__actions">
              <button type="button" class="btn btn--primary btn--sm" data-kids-action="check">Kontrol et</button>
              <button type="button" class="btn btn--ghost btn--sm" data-kids-action="reset">Sıfırla</button>
            </div>
            <div class="kidsGame__feedback" data-kids-feedback hidden></div>
          </div>
          <div class="kidsGame__items" aria-label="Seçenekler">
            <p class="muted small">Tıkla veya sürükle-bırak ile ekle:</p>
            <div class="kidsGame__itemGrid" data-kids-items>${itemsHtml}</div>
            ${game.tip ? `<p class="muted small">${escapeHtml(game.tip)}</p>` : ""}
            ${linkHtml}
          </div>
        </div>
      </div>
    `;
  }

  function initGame(kidsGame) {
    const scoreEl = kidsGame.querySelector("[data-kids-score]");
    const itemsWrap = kidsGame.querySelector("[data-kids-items]");
    const drop = kidsGame.querySelector("[data-kids-drop]");
    const feedback = kidsGame.querySelector("[data-kids-feedback]");
    const btnCheck = kidsGame.querySelector('[data-kids-action="check"]');
    const btnReset = kidsGame.querySelector('[data-kids-action="reset"]');

    const maxCorrect = Number(kidsGame.getAttribute("data-kids-correct-count")) || 6;
    const minToPass = Number(kidsGame.getAttribute("data-kids-min-pass")) || 3;

    const picked = new Map();

    function setScore() {
      if (scoreEl) scoreEl.textContent = `${Math.min(picked.size, maxCorrect)} / ${maxCorrect}`;
    }

    function showFeedback(kind, html) {
      feedback.hidden = false;
      feedback.className = `kidsGame__feedback kidsGame__feedback--${kind}`;
      feedback.innerHTML = html;
    }

    function reset() {
      picked.clear();
      drop.innerHTML = "";
      feedback.hidden = true;
      itemsWrap.querySelectorAll(".kidsItem").forEach((b) => {
        b.disabled = false;
        b.classList.remove("is-picked");
      });
      setScore();
    }

    function addToBag(btn) {
      const key = btn.getAttribute("data-kids-item");
      if (!key || picked.has(key)) return;
      picked.set(key, btn);
      btn.disabled = true;
      btn.classList.add("is-picked");
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "kidsPick";
      pill.textContent = btn.textContent.trim();
      pill.setAttribute("data-kids-picked", key);
      pill.addEventListener("click", () => {
        picked.delete(key);
        pill.remove();
        btn.disabled = false;
        btn.classList.remove("is-picked");
        feedback.hidden = true;
        setScore();
      });
      drop.appendChild(pill);
      setScore();
    }

    itemsWrap.querySelectorAll(".kidsItem").forEach((btn) => {
      btn.addEventListener("click", () => addToBag(btn));
      btn.setAttribute("draggable", "true");
      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData("text/plain", btn.getAttribute("data-kids-item") || "");
      });
    });

    drop.addEventListener("dragover", (e) => e.preventDefault());
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      const key = e.dataTransfer?.getData("text/plain");
      const btn = key ? itemsWrap.querySelector(`[data-kids-item="${CSS.escape(key)}"]`) : null;
      if (btn) addToBag(btn);
    });

    btnCheck?.addEventListener("click", () => {
      let correct = 0;
      let wrong = 0;
      for (const [, btn] of picked) {
        if (btn.getAttribute("data-kids-correct") === "1") correct += 1;
        else wrong += 1;
      }

      if (picked.size === 0) {
        showFeedback("warn", "<strong>Hadi başlayalım.</strong><p>Birkaç seçenek ekleyip tekrar kontrol et.</p>");
        return;
      }

      if (wrong === 0 && correct >= minToPass) {
        showFeedback(
          "ok",
          `<strong>Harika!</strong><p>${correct} doğru seçim. Birlikte neden doğru olduklarını konuşun.</p>`
        );
        return;
      }

      showFeedback(
        "fail",
        `<strong>Birlikte tekrar deneyelim.</strong><p>${correct} doğru, ${wrong} yanlış veya gereksiz seçim var.</p>`
      );
    });

    btnReset?.addEventListener("click", reset);
    reset();
  }

  fetch("/data/kids-mini-games.json")
    .then((r) => {
      if (!r.ok) throw new Error("Veri yüklenemedi");
      return r.json();
    })
    .then((data) => {
      const perDay = data.perDay || 3;
      const todayGames = pickForToday(data.games || [], perDay);
      if (metaEl) {
        metaEl.textContent = `Bugünün oyunları (${formatDateTr()}) — her gün yenilenir.`;
      }
      listEl.innerHTML = todayGames.map((g) => renderGame(g)).join("");
      listEl.querySelectorAll("[data-kids-game]").forEach(initGame);
    })
    .catch(() => {
      if (metaEl) metaEl.textContent = "Oyunlar yüklenemedi. Sayfayı yenileyin.";
    });
})();
