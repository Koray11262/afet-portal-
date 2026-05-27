(function () {
  const form = document.getElementById("planForm");
  const preview = document.getElementById("planPreview");
  const resetBtn = document.getElementById("planReset");
  const printBtn = document.getElementById("planPrint");
  if (!form || !preview) return;

  const STORAGE_KEY = "afet:ailePlan:v1";

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function setForm(data) {
    Array.from(form.elements).forEach((el) => {
      if (!el.name) return;
      if (el.type === "submit" || el.type === "button") return;
      el.value = data[el.name] || "";
    });
  }

  function renderPreview(data) {
    const fam = data.familyName || "—";
    const m1 = data.meeting1 || "—";
    const m2 = data.meeting2 || "—";
    const out = data.outContact || "—";
    const notes = data.notes || "—";
    preview.innerHTML = `
      <div class="planPreview__line"><strong>Aile:</strong> ${fam}</div>
      <div class="planPreview__line"><strong>Buluşma (1):</strong> ${m1}</div>
      <div class="planPreview__line"><strong>Buluşma (2):</strong> ${m2}</div>
      <div class="planPreview__line"><strong>Şehir dışı irtibat:</strong> ${out}</div>
      <div class="planPreview__line"><strong>Notlar:</strong> ${notes}</div>
    `;
  }

  const initial = load();
  setForm(initial);
  renderPreview(initial);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    save(data);
    renderPreview(data);
  });

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    setForm({});
    renderPreview({});
  });

  printBtn?.addEventListener("click", () => window.print());
})();

