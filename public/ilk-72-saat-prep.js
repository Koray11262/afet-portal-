(function (global) {
  const CANTA_KEY = "afet:canta:v1";
  const PLAN_KEY = "afet:ailePlan:v1";

  const CANTA_LABELS = {
    su: "Su stoğu",
    gida: "Dayanıklı gıda",
    ilkYardim: "İlk yardım seti",
    ilac: "Kişisel ilaçlar",
    fener: "Fener / pil",
    powerbank: "Powerbank",
    radyo: "Pilli radyo",
    battaniye: "Battaniye",
    yedekKiyafet: "Yedek kıyafet",
    hijyen: "Hijyen seti",
    belge: "Belge kopyaları",
    duuduk: "Düdük",
  };

  const PLAN_LABELS = {
    meeting1: "Buluşma noktası (1)",
    meeting2: "Buluşma noktası (2)",
    outContact: "Şehir dışı irtibat kişisi",
    familyName: "Aile afet planı",
    notes: "Plan notları",
  };

  function readCanta() {
    try {
      return JSON.parse(localStorage.getItem(CANTA_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function readPlan() {
    try {
      return JSON.parse(localStorage.getItem(PLAN_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function cantaMissingCount() {
    const state = readCanta();
    return Object.keys(CANTA_LABELS).filter((id) => !state[id]).length;
  }

  function planMissingFields() {
    const plan = readPlan();
    return ["meeting1", "meeting2", "outContact"].filter((k) => !String(plan[k] || "").trim());
  }

  /**
   * @param {string[]} hooks e.g. ["canta:su", "plan:meeting1"]
   * @param {Record<string,string>} prepLabels from JSON
   */
  function evaluatePrepHooks(hooks, prepLabels) {
    const canta = readCanta();
    const plan = readPlan();
    const messages = [];

    for (const hook of hooks || []) {
      if (hook.startsWith("canta:")) {
        const id = hook.slice(6);
        if (canta[id]) continue;
        const label = prepLabels?.[hook] || CANTA_LABELS[id] || id;
        messages.push({
          type: "canta",
          label,
          text: `Acil çantanızda "${label}" eksik — bu aşamada zorlanabilirsiniz.`,
          href: "/acil-canta",
          action: "Çantayı tamamla →",
        });
      } else if (hook.startsWith("plan:")) {
        const field = hook.slice(5);
        if (String(plan[field] || "").trim()) continue;
        const label = prepLabels?.[hook] || PLAN_LABELS[field] || field;
        messages.push({
          type: "plan",
          label,
          text: `Aile afet planınızda "${label}" tanımlı değil — koordinasyon zorlaşır.`,
          href: "/aile-afet-plani",
          action: "Plan oluştur →",
        });
      }
    }
    return messages;
  }

  function prepSummary() {
    const cantaDone = Object.keys(CANTA_LABELS).length - cantaMissingCount();
    const cantaTotal = Object.keys(CANTA_LABELS).length;
    const planMissing = planMissingFields();
    return { cantaDone, cantaTotal, planMissing, hasPlan: planMissing.length < 3 };
  }

  global.Ilk72SaatPrep = {
    readCanta,
    readPlan,
    evaluatePrepHooks,
    prepSummary,
    CANTA_LABELS,
    PLAN_LABELS,
  };
})(typeof window !== "undefined" ? window : global);
