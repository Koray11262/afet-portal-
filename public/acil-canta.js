(function () {
  const root = document.getElementById("cantaList");
  if (!root) return;
  const resetBtn = document.getElementById("cantaReset");
  const printBtn = document.getElementById("cantaPrint");

  const STORAGE_KEY = "afet:canta:v1";
  const items = [
    { id: "su", label: "Su (kişi başı en az 1–2 lt/gün, 3 gün)" },
    { id: "gida", label: "Dayanıklı gıda (konserve, bar, kuruyemiş)" },
    { id: "ilkYardim", label: "İlk yardım seti" },
    { id: "ilac", label: "Kişisel ilaçlar (en az 3 gün)" },
    { id: "fener", label: "Fener / kafa lambası + yedek pil" },
    { id: "powerbank", label: "Powerbank + kablolar" },
    { id: "radyo", label: "Pilli radyo" },
    { id: "battaniye", label: "Battaniye / termal battaniye" },
    { id: "yedekKiyafet", label: "Yedek kıyafet / yağmurluk" },
    { id: "hijyen", label: "Hijyen seti (ıslak mendil, sabun, maske)" },
    { id: "belge", label: "Önemli belgeler (fotokopi) + bir miktar nakit" },
    { id: "duuduk", label: "Düdük" },
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function render() {
    const state = loadState();
    root.innerHTML = items
      .map(
        (it) => `
        <label class="checkItem">
          <input type="checkbox" data-id="${it.id}" ${state[it.id] ? "checked" : ""} />
          <span>${it.label}</span>
        </label>
      `
      )
      .join("");

    root.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.getAttribute("data-id");
        const next = loadState();
        next[id] = cb.checked;
        saveState(next);
      });
    });
  }

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    render();
  });
  printBtn?.addEventListener("click", () => window.print());

  render();
})();

