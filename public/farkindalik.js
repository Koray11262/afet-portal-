(function () {
  const root = document.querySelector(".awareness");
  if (!root) return;

  /* —— 2–10 Animasyonlar: çok sahneli (SVG + JS) —— */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sceneEls = Array.from(root.querySelectorAll("[data-kids-scene]"));
  const SCENE_STEP_MS = 2600;

  function mountKidsScene(sceneEl) {
    const poses = Array.from(sceneEl.querySelectorAll("[data-scene-pose]"));
    if (!poses.length) return null;

    const labelOut = sceneEl.querySelector("[data-scene-label]");
    const descOut = sceneEl.querySelector("[data-scene-desc]");
    const dots = Array.from(sceneEl.querySelectorAll(".kidsScene__dot"));

    let idx = 0;
    let timer = null;

    const show = (i) => {
      idx = i;
      poses.forEach((p) => p.classList.toggle("is-active", Number(p.getAttribute("data-scene-pose")) === i));
      dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
      const pose = poses.find((p) => Number(p.getAttribute("data-scene-pose")) === i) || poses[0];
      if (labelOut && pose?.dataset?.sceneLabel) labelOut.textContent = pose.dataset.sceneLabel;
      if (descOut && pose?.dataset?.sceneDesc) descOut.textContent = pose.dataset.sceneDesc;
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const play = () => {
      stop();
      show(0);
      if (reduceMotion) return;
      timer = setInterval(() => show((idx + 1) % poses.length), SCENE_STEP_MS);
    };

    // Başlangıç
    show(0);
    play();

    return { sceneEl, play, stop };
  }

  const mountedScenes = sceneEls.map(mountKidsScene).filter(Boolean);
  if (mountedScenes.length) {
    if (typeof IntersectionObserver === "function") {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const m = mountedScenes.find((x) => x.sceneEl === entry.target);
            if (!m) return;
            if (entry.isIntersecting) m.play();
            else m.stop();
          });
        },
        { threshold: 0.25 }
      );
      mountedScenes.forEach((m) => io.observe(m.sceneEl));
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) mountedScenes.forEach((m) => m.stop());
      else mountedScenes.forEach((m) => m.play());
    });
  }

  // Büyütme (modal): karttaki sahneyi klonlayıp daha büyük göster.
  const kidsAnimModal = document.getElementById("kidsAnimModal");
  const kidsAnimModalHost = document.getElementById("kidsAnimModalHost");
  const kidsAnimModalTitle = document.getElementById("kidsAnimModalTitle");
  let modalSceneCtrl = null;

  function openKidsAnimModal(fromCard) {
    if (!kidsAnimModal || !kidsAnimModalHost || !fromCard) return;
    const scene = fromCard.querySelector("[data-kids-scene]");
    if (!scene) return;

    const title = fromCard.querySelector(".kidsAnimCard__meta strong")?.textContent?.trim();
    if (kidsAnimModalTitle) kidsAnimModalTitle.textContent = title || "Animasyon";

    kidsAnimModalHost.innerHTML = "";
    const clone = scene.cloneNode(true);
    clone.removeAttribute("aria-label");
    kidsAnimModalHost.appendChild(clone);

    // Modal içindeki klonu ayrı oynat.
    modalSceneCtrl = mountKidsScene(clone);

    const onClose = () => {
      modalSceneCtrl?.stop?.();
      modalSceneCtrl = null;
      kidsAnimModal.removeEventListener("close", onClose);
    };
    kidsAnimModal.addEventListener("close", onClose);
    if (typeof kidsAnimModal.showModal === "function") kidsAnimModal.showModal();
  }

  root.addEventListener("click", (e) => {
    const zoomBtn = e.target.closest?.("[data-kids-anim-zoom]");
    const frame = e.target.closest?.(".kidsAnimCard__frame");
    const card = (zoomBtn || frame)?.closest?.(".kidsAnimCard");
    if (!card) return;
    openKidsAnimModal(card);
  });

  /* —— 10–18 Afet senaryoları (puanlı) —— */
  const scenarioRoot = root.querySelector('[data-scenario="teen"]');
  if (scenarioRoot) {
    const LS_TOTAL_KEY = "teen_scenario_total_v1";
    const btnStart = scenarioRoot.querySelector('[data-scn-action="start"]');
    const btnNext = scenarioRoot.querySelector('[data-scn-action="next"]');
    const btnRestart = scenarioRoot.querySelector('[data-scn-action="restart"]');
    const btnReplay = scenarioRoot.querySelector('[data-scn-action="replay"]');
    const btnResetTotal = scenarioRoot.querySelector('[data-scn-action="resetTotal"]');
    const sel = scenarioRoot.querySelector("[data-scn-select]");
    const meta = scenarioRoot.querySelector("[data-scn-meta]");
    const qWrap = scenarioRoot.querySelector(".scenario__q");
    const resultWrap = scenarioRoot.querySelector(".scenario__result");
    const promptEl = scenarioRoot.querySelector("[data-scn-prompt]");
    const progressEl = scenarioRoot.querySelector("[data-scn-progress]");
    const optionsEl = scenarioRoot.querySelector("[data-scn-options]");
    const feedbackEl = scenarioRoot.querySelector("[data-scn-feedback]");
    const scoreEl = scenarioRoot.querySelector("[data-scn-score]");
    const totalEl = scenarioRoot.querySelector("[data-scn-total]");
    const scnBadgesEl = scenarioRoot.querySelector("[data-scn-badges]");
    const pathEl = scenarioRoot.querySelector("[data-scn-path]");

    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

    const BADGES_KEY = "awareness_badges_v1";
    const LS_DONE_KEY = "teen_scenario_done_v1";

    function readBadgesLocal() {
      try {
        return JSON.parse(localStorage.getItem(BADGES_KEY) || "[]");
      } catch {
        return [];
      }
    }

    function writeBadgesLocal(list) {
      localStorage.setItem(BADGES_KEY, JSON.stringify(list));
    }

    function readDoneSet() {
      try {
        return new Set(JSON.parse(localStorage.getItem(LS_DONE_KEY) || "[]"));
      } catch {
        return new Set();
      }
    }

    function writeDoneSet(set) {
      localStorage.setItem(LS_DONE_KEY, JSON.stringify(Array.from(set)));
    }

    // Havuzdan 5 soru seçilen mini test
    const LS_RECENT_PREFIX = "teen_scenario_recent_v1_";
    const TEST_LEN = 5;

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function readRecent(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        return [];
      }
    }

    function writeRecent(key, list) {
      localStorage.setItem(key, JSON.stringify(list.slice(0, 18)));
    }

    const pools = {
      "okul-deprem": {
        title: "Deprem (okul)",
        questions: [
          {
            id: "d1",
            prompt: "Sınıftasın ve deprem başladı. İlk ne yaparsın?",
            choices: [
              { text: "Sıranın altına gir (çök-kapan-tutun)", score: 10, feedback: "Doğru. Baş-boyun korunur, düşen parçalardan etkilenme azalır." },
              { text: "Koşup kapıya yönelirim", score: -8, feedback: "Riskli. Düşme/çarpma ve panik artar; sarsıntı bitene kadar güvenli pozisyon." },
              { text: "Pencere kenarında beklerim", score: -10, feedback: "Yanlış. Cam kırığı riski yüksek; pencerelerden uzak dur." }
            ]
          },
          {
            id: "d2",
            prompt: "Sarsıntı sırasında nereden uzak durmalısın?",
            choices: [
              { text: "Cam, dolap, raf gibi devrilebilir yerler", score: 10, feedback: "Doğru. Kırılma/devrilme riski olan yerlerden uzak dur." },
              { text: "Sınıfın ortası", score: -2, feedback: "Tek başına kriter değil. Önemli olan düşen/parça riski olan yerlerden kaçınmak." },
              { text: "Sıranın altı", score: -6, feedback: "Yanlış. Sıranın altı çoğu durumda koruyucu bir alandır." }
            ]
          },
          {
            id: "d3",
            prompt: "Deprem sonrası tahliyede hangisi doğru?",
            choices: [
              { text: "Sırayla, itişmeden merdivenle çıkmak", score: 10, feedback: "Doğru. Panik ve yaralanma riski azalır." },
              { text: "Asansörle hızlıca inmek", score: -10, feedback: "Yanlış. Asansör arızalanabilir." },
              { text: "Önce eşyalarımı toplamak", score: -8, feedback: "Riskli. Öncelik can güvenliği, sonra talimatlar." }
            ]
          },
          {
            id: "d4",
            prompt: "Toplanma alanına giderken hangisi daha güvenli?",
            choices: [
              { text: "Bina/duvar/direklerden uzak açık alandan yürümek", score: 10, feedback: "Doğru. Artçılarda düşebilecek parçalardan uzak kalırsın." },
              { text: "Bina dibinden gitmek (yağmurdan korunmak)", score: -8, feedback: "Yanlış. Düşen parça riski artar." },
              { text: "Kısa diye dar sokaktan koşmak", score: -6, feedback: "Riskli. Dar alanda panik ve düşen parça riski artar." }
            ]
          },
          {
            id: "d5",
            prompt: "Sarsıntı bitti ama artçı olabilir. Ne yaparsın?",
            choices: [
              { text: "Toplanma alanında bekler, resmi talimatları dinlerim", score: 10, feedback: "Doğru. Artçılar olabilir; güvenli alanda kal." },
              { text: "Hemen binaya geri girerim", score: -10, feedback: "Yanlış. Artçı riski yüksek; içeri dönme." },
              { text: "Arkadaşları bulmak için binanın çevresinde dolaşırım", score: -6, feedback: "Riskli. Bina çevresi tehlikeli olabilir." }
            ]
          },
          {
            id: "d6",
            prompt: "Deprem anında telefonla ne yapmalısın?",
            choices: [
              { text: "Sadece acil durumlarda kısa mesajla haber veririm", score: 8, feedback: "Doğru. Hatlar yoğun olur; kısa iletişim daha etkilidir." },
              { text: "Uzun uzun arayıp konuşurum", score: -6, feedback: "Riskli. Hatları meşgul edersin." },
              { text: "Hiç kimseyle iletişim kurmam", score: -2, feedback: "Duruma göre değişir; güvenli olduktan sonra kısa bilgi vermek faydalı olabilir." }
            ]
          },
          {
            id: "d7",
            prompt: "Okulda deprem tatbikatı yapılırken amaç nedir?",
            choices: [
              { text: "Doğru davranışı otomatik hale getirmek", score: 10, feedback: "Doğru. Krizde doğru karar, tekrar ile güçlenir." },
              { text: "Sadece zaman geçirmek", score: -8, feedback: "Yanlış. Tatbikat gerçek olaya hazırlık içindir." },
              { text: "Kimin daha hızlı koştuğunu görmek", score: -10, feedback: "Yanlış. Koşmak tehlike yaratır." }
            ]
          },
          {
            id: "d8",
            prompt: "Deprem sırasında sınıfta en güvenli yaklaşım hangisi?",
            choices: [
              { text: "Çök–kapan–tutun yapıp pencerelerden uzak durmak", score: 10, feedback: "Doğru. Baş-boyun korunur, cam kırıklarından uzak kalınır." },
              { text: "Sıranın üstüne çıkıp yüksekten atlamak", score: -10, feedback: "Yanlış. Düşme/yaralanma riski artar." },
              { text: "Kapıya yığılmak", score: -8, feedback: "Riskli. İtiş-kakış ve düşme olabilir." }
            ]
          },
          {
            id: "d9",
            prompt: "Deprem sonrası sınıftan çıkarken hangisi önemli?",
            choices: [
              { text: "Öğretmenin talimatını dinlemek ve sakin kalmak", score: 10, feedback: "Doğru. Düzenli tahliye kazaları azaltır." },
              { text: "Herkesi geçip ilk ben çıkmak", score: -6, feedback: "Riskli. Panik artar; düşme/çarpma olur." },
              { text: "Kalabalıkta bağırıp koşmak", score: -10, feedback: "Yanlış. Panik ve yaralanma riskini büyütür." }
            ]
          },
          {
            id: "d10",
            prompt: "Merdivenlerde tahliye olurken doğru davranış hangisi?",
            choices: [
              { text: "Korkuluklardan tutup sırayla inmek", score: 10, feedback: "Doğru. Düşme riskini azaltır." },
              { text: "2’şer 3’er basamak atlayarak inmek", score: -8, feedback: "Riskli. Kayma/düşme olabilir." },
              { text: "Ters yönden yukarı çıkanlarla itişmek", score: -10, feedback: "Yanlış. Çarpışma ve yığılma riski." }
            ]
          },
          {
            id: "d11",
            prompt: "Deprem sonrası toplanma alanında doğru olan hangisi?",
            choices: [
              { text: "Yoklama için sınıf/rehber öğretmen grubunda kalmak", score: 8, feedback: "Doğru. Eksik kişiler hızlı fark edilir." },
              { text: "Kalabalıktan ayrılıp tek başıma dolaşmak", score: -6, feedback: "Riskli. Kayıp/iletişim sorunu olur." },
              { text: "Binaya yaklaşmak", score: -10, feedback: "Yanlış. Düşen parçalar tehlikelidir." }
            ]
          },
          {
            id: "d12",
            prompt: "Artçı deprem olursa ne yaparsın?",
            choices: [
              { text: "Açık alanda kalıp binalardan uzak dururum", score: 10, feedback: "Doğru. Artçılar yıkıntı riskini artırır." },
              { text: "Hemen sınıfa geri koşarım", score: -10, feedback: "Yanlış. İçeri dönmek tehlikelidir." },
              { text: "Duvar dibinde beklerim", score: -8, feedback: "Riskli. Duvar/parça düşebilir." }
            ]
          },
          {
            id: "d13",
            prompt: "Deprem anında dolap/raf yanında olmak neden tehlikeli?",
            choices: [
              { text: "Devrilip üzerime düşebilir", score: 10, feedback: "Doğru. Devrilen eşyalar ciddi yaralanma yapabilir." },
              { text: "Çünkü ışığı keser", score: -2, feedback: "Asıl risk devrilme ve düşen parçalardır." },
              { text: "Çünkü sesi artırır", score: -2, feedback: "Asıl risk devrilme ve düşen parçalardır." }
            ]
          },
          {
            id: "d14",
            prompt: "Deprem sonrası iletişim için en doğru yaklaşım hangisi?",
            choices: [
              { text: "Kısa mesajla 'iyiyim' bilgisi vermek", score: 8, feedback: "Doğru. Hatları daha az meşgul eder." },
              { text: "Aynı anda herkesi arayıp uzun konuşmak", score: -6, feedback: "Riskli. Hatlar yoğunlaşır." },
              { text: "Sosyal medyada konum paylaşmak", score: -4, feedback: "Duruma göre riskli olabilir; öncelik güvenlik ve resmi kanallar." }
            ]
          },
          {
            id: "d15",
            prompt: "Tahliye sırasında geri dönüp eşyalarını almak neden yanlış?",
            choices: [
              { text: "Artçı/tehlike olabilir; zaman kaybı ve risk artar", score: 10, feedback: "Doğru. Can güvenliği önceliklidir." },
              { text: "Çünkü öğretmen kızar", score: -2, feedback: "Asıl sebep güvenlik ve artçı riskidir." },
              { text: "Çünkü eşyalar ağır", score: -2, feedback: "Asıl sebep güvenlik ve artçı riskidir." }
            ]
          },
          {
            id: "d16",
            prompt: "Sarsıntı sırasında sınıf kapısını açmaya çalışmak çoğu zaman neden doğru değildir?",
            choices: [
              { text: "Kapı sıkışabilir; güvenli pozisyona geçmek daha önemli", score: 8, feedback: "Doğru. Önce kendini koru, sarsıntı bitsin." },
              { text: "Çünkü kapı gürültü yapar", score: -2, feedback: "Asıl risk kapının sıkışması ve zaman kaybıdır." },
              { text: "Çünkü hava girer", score: -2, feedback: "Asıl risk kapının sıkışması ve zaman kaybıdır." }
            ]
          },
          {
            id: "d17",
            prompt: "Okul bahçesinde toplanırken elektrik hatları için doğru davranış?",
            choices: [
              { text: "Direk ve kablolardan uzak durmak", score: 10, feedback: "Doğru. Kopmuş hatlar elektrik çarpması riski taşır." },
              { text: "Direğe yaslanmak", score: -10, feedback: "Yanlış. Elektrik riski olabilir." },
              { text: "Kablolara yaklaşmak", score: -10, feedback: "Yanlış. Hayati tehlike." }
            ]
          },
          {
            id: "d18",
            prompt: "Deprem sırasında 'çök-kapan-tutun' neden işe yarar?",
            choices: [
              { text: "Baş-boynu korur ve düşen parçalardan etkilenmeyi azaltır", score: 10, feedback: "Doğru. Temel amaç korunma ve devrilme riskini azaltmaktır." },
              { text: "Daha hızlı koşmayı sağlar", score: -10, feedback: "Yanlış. Koşmak amaç değildir." },
              { text: "Sarsıntıyı durdurur", score: -10, feedback: "Yanlış. Davranış sarsıntıyı durdurmaz, riski azaltır." }
            ]
          },
          {
            id: "d19",
            prompt: "Tahliye sonrası 'toplanma alanı' neden önemlidir?",
            choices: [
              { text: "Yoklama ve koordinasyon için", score: 10, feedback: "Doğru. Kimin nerede olduğu hızlıca anlaşılır." },
              { text: "Sadece sohbet etmek için", score: -8, feedback: "Yanlış. Amaç güvenlik ve koordinasyondur." },
              { text: "Bina yakınına toplanmak için", score: -10, feedback: "Yanlış. Açık ve güvenli alan seçilir." }
            ]
          },
          {
            id: "d20",
            prompt: "Deprem sonrası söylenti/panik yayılınca ne yaparsın?",
            choices: [
              { text: "Resmi kaynakları (öğretmen/AFAD) dinlerim", score: 8, feedback: "Doğru. Doğrulanmamış bilgi paniği artırır." },
              { text: "Hemen paylaşırım", score: -8, feedback: "Riskli. Yanlış bilgi paniği büyütür." },
              { text: "Bağırıp kalabalığı yönlendiririm (talimat olmadan)", score: -6, feedback: "Riskli. Yetkili talimatı dışında yönlendirme karmaşa yaratır." }
            ]
          }
        ]
      },
      "sel-ulasim": {
        title: "Sel/taşkın",
        questions: [
          { id: "s1", prompt: "Sel uyarısı geldi. Hangi güzergâh daha riskli?", choices: [
            { text: "Alt geçit, dere yatağı, düşük kot", score: 10, feedback: "Doğru. Su buralarda hızlı yükselir." },
            { text: "Yüksek kaldırım ve güvenli ana yol", score: -4, feedback: "Genelde daha güvenli seçenek budur." },
            { text: "Açık, yüksek bir tepe yolu", score: -2, feedback: "Genelde daha güvenlidir." }
          ]},
          { id: "s2", prompt: "Su birikintisi gördün. Ne yaparsın?", choices: [
            { text: "Geçmem, alternatif yol ararım", score: 10, feedback: "Doğru. Akıntı/su derinliği görünmeyebilir." },
            { text: "Ayakkabım ıslanmasın diye koşarak geçerim", score: -8, feedback: "Riskli. Düşme/akıntı riski var." },
            { text: "Suya girip derinliği denerim", score: -10, feedback: "Yanlış. Su sürükleyebilir." }
          ]},
          { id: "s3", prompt: "Sel sırasında araç kullanımıyla ilgili hangisi doğru?", choices: [
            { text: "Su basmış yoldan araçla geçmem", score: 10, feedback: "Doğru. Araç bile sürüklenebilir." },
            { text: "Az su var gibi görünüyorsa geçerim", score: -8, feedback: "Riskli. Derinlik/akıntı yanıltır." },
            { text: "Köprü altına park eder beklerim", score: -10, feedback: "Yanlış. Su hızla yükselebilir." }
          ]},
          { id: "s4", prompt: "Selde en güvenli ilk hamle hangisi?", choices: [
            { text: "Güvenli-yüksek yere çıkmak", score: 10, feedback: "Doğru. Akıntıdan uzaklaş." },
            { text: "Dere kenarına gidip izlemek", score: -8, feedback: "Riskli. Yaklaşma." },
            { text: "Alt geçitte beklemek", score: -10, feedback: "Yanlış. Tuzağa dönüşebilir." }
          ]},
          { id: "s5", prompt: "Elektrik hattı/suya temas riski görürsen?", choices: [
            { text: "Uzak durur, yetişkin/112’ye haber veririm", score: 10, feedback: "Doğru. Elektrik çarpması riski var." },
            { text: "Yaklaşıp bakarım", score: -10, feedback: "Yanlış. Hayati tehlike." },
            { text: "Arkadaşları çağırıp gösteririm", score: -8, feedback: "Riskli. Uzaklaştırmak gerekir." }
          ]},
          { id: "s6", prompt: "Sel sonrası eve dönerken doğru davranış?", choices: [
            { text: "Resmi 'güvenli' bilgisi gelince dönerim", score: 8, feedback: "Doğru. Yapısal/elektrik riskleri olabilir." },
            { text: "Hemen dönerim, kontrol ederim", score: -6, feedback: "Riskli. Güvenlik teyidi önemli." },
            { text: "Su hâlâ varken içeri girerim", score: -10, feedback: "Yanlış. Akıntı/elektrik riski." }
          ]},
          { id: "s7", prompt: "Sel sırasında dere yatağına yaklaşmak neden tehlikeli?", choices: [
            { text: "Akıntı aniden artabilir ve sürükleyebilir", score: 10, feedback: "Doğru. Sel çok hızlı yükselir." },
            { text: "Çünkü hava soğuk olur", score: -2, feedback: "Asıl tehlike akıntı ve ani su yükselmesidir." },
            { text: "Çünkü telefon çekmez", score: -2, feedback: "Asıl tehlike akıntı ve ani su yükselmesidir." }
          ]},
          { id: "s8", prompt: "Sel uyarısında dışarı çıkman gerekiyorsa neye dikkat edersin?", choices: [
            { text: "Yüksek güzergâh + resmi uyarıları takip", score: 8, feedback: "Doğru. Riskli bölgelerden kaçın." },
            { text: "Kısa diye alt geçidi seçmek", score: -10, feedback: "Yanlış. Alt geçitler hızla suyla dolabilir." },
            { text: "Dere kenarından yürümek", score: -8, feedback: "Riskli. Taşkın olabilir." }
          ]},
          { id: "s9", prompt: "Selde su basmış yerde yürümek neden riskli?", choices: [
            { text: "Rögar kapağı açık olabilir / akıntı sürükleyebilir", score: 10, feedback: "Doğru. Görünmeyen tehlikeler var." },
            { text: "Sadece ayakkabı ıslanır", score: -8, feedback: "Yanlış. Hayati tehlike olabilir." },
            { text: "Çünkü yürümek yasak", score: -2, feedback: "Asıl risk görünmeyen çukur/akıntıdır." }
          ]},
          { id: "s10", prompt: "Sel sırasında elektrikle ilgili doğru davranış?", choices: [
            { text: "Su birikintisine yakın priz/cihazlara dokunmamak", score: 10, feedback: "Doğru. Elektrik çarpması riski." },
            { text: "Islak elle prize dokunmak", score: -10, feedback: "Yanlış. Hayati tehlike." },
            { text: "Kabloyu sudan çekmek", score: -10, feedback: "Yanlış. Uzmanlar müdahale etmeli." }
          ]},
          { id: "s11", prompt: "Sel uyarısında sosyal medya/mesajlaşmada doğru yaklaşım?", choices: [
            { text: "Resmi kaynak bilgisini paylaşmak", score: 6, feedback: "Doğru. Yanlış bilgi paniği büyütür." },
            { text: "Doğrulanmamış söylentiyi yaymak", score: -8, feedback: "Riskli. Panik yaratır." },
            { text: "Konum/özel bilgileri herkese açık paylaşmak", score: -4, feedback: "Riskli. Güvenlik ve mahremiyet." }
          ]},
          { id: "s12", prompt: "Sel sırasında güvenli bir yerde mahsur kaldın. Ne yaparsın?", choices: [
            { text: "Yetişkine/112’ye haber verip beklerim", score: 8, feedback: "Doğru. Güvenli yerde kal, yardım iste." },
            { text: "Akıntıdan karşıya geçmeye çalışırım", score: -10, feedback: "Yanlış. Sürüklenebilirsin." },
            { text: "Köprü altına inerim", score: -8, feedback: "Riskli. Su yükselir." }
          ]},
          { id: "s13", prompt: "Sel sonrası yol kenarında çamur/kaygan zemin görürsen?", choices: [
            { text: "Kayma/çökme riskine karşı yavaş ve dikkatli ilerlerim", score: 6, feedback: "Doğru. Zemin zayıflamış olabilir." },
            { text: "Hızlı koşarım", score: -6, feedback: "Riskli. Kayabilirsin." },
            { text: "Merak edip çamura basarım", score: -4, feedback: "Riskli. Zemin çökebilir." }
          ]},
          { id: "s14", prompt: "Sel uyarısında okul/kurum talimatı gelirse?", choices: [
            { text: "Talimatı uygularım (bekle/çıkış/servis)", score: 8, feedback: "Doğru. Kurumsal planlar güvenlik için." },
            { text: "Kimseyi dinlemeden kendi başıma giderim", score: -6, feedback: "Riskli. Koordinasyon bozulur." },
            { text: "Arkadaşlarla farklı yola saparım", score: -6, feedback: "Riskli. Bilinmeyen güzergâh tehlikeli olabilir." }
          ]},
          { id: "s15", prompt: "Sel sırasında evdeysen ilk kontrol etmen gerekenlerden biri?", choices: [
            { text: "Su seviyesi/elektrik ve güvenli çıkış", score: 6, feedback: "Doğru. Elektrik riski ve çıkış planı önemli." },
            { text: "Fotoğraf çekmek", score: -8, feedback: "Yanlış. Öncelik güvenlik." },
            { text: "Kapıyı kilitleyip beklemek", score: -4, feedback: "Tek başına yeterli değil; güvenliğe göre hareket." }
          ]},
          { id: "s16", prompt: "Sel sırasında bodrum kat neden risklidir?", choices: [
            { text: "Hızla suyla dolup kaçışı kapatabilir", score: 10, feedback: "Doğru. Düşük kotlar tehlikelidir." },
            { text: "Çünkü karanlıktır", score: -2, feedback: "Asıl risk hızlı su dolmasıdır." },
            { text: "Çünkü sessizdir", score: -2, feedback: "Asıl risk hızlı su dolmasıdır." }
          ]},
          { id: "s17", prompt: "Sel sırasında köprü üstü/kenarı için doğru yaklaşım?", choices: [
            { text: "Güvenli değilse yaklaşmam, uzak dururum", score: 8, feedback: "Doğru. Akıntı ve çökme riski olabilir." },
            { text: "Köprü altına sığınırım", score: -10, feedback: "Yanlış. Su seviyesi hızla yükselir." },
            { text: "Fotoğraf için en uçta dururum", score: -8, feedback: "Riskli. Düşme/sürüklenme." }
          ]},
          { id: "s18", prompt: "Sel uyarısında servis/arabayla yola çıkmak konusunda hangisi doğru?", choices: [
            { text: "Gerekmiyorsa yola çıkmam; talimatı beklerim", score: 8, feedback: "Doğru. Yolda mahsur kalma riski." },
            { text: "Ne olursa olsun çıkarım", score: -8, feedback: "Riskli." },
            { text: "Su basmış yoldan geçerim", score: -10, feedback: "Yanlış." }
          ]},
          { id: "s19", prompt: "Sel sırasında suyun rengi/kokusu değiştiyse?", choices: [
            { text: "Kirli/atık su olabilir; temas etmem", score: 6, feedback: "Doğru. Sağlık riski olabilir." },
            { text: "Elimi yıkarım", score: -6, feedback: "Riskli. Temas etme." },
            { text: "Şaka olsun diye suyla oynarım", score: -10, feedback: "Yanlış. Sağlık ve akıntı riski." }
          ]},
          { id: "s20", prompt: "Sel sonrası hangi bilgi kaynağına öncelik verirsin?", choices: [
            { text: "Resmi kurum duyuruları (AFAD/valilik/okul)", score: 8, feedback: "Doğru. Doğrulanmış bilgi." },
            { text: "Dedikodu grupları", score: -8, feedback: "Riskli. Yanlış bilgi." },
            { text: "Rastgele yorumlar", score: -6, feedback: "Riskli." }
          ]}
        ]
      },
      "yangin-duman": {
        title: "Yangın/duman",
        questions: [
          { id: "y1", prompt: "Dumanlı koridorda en doğru hareket?", choices: [
            { text: "Eğilip alçaktan ilerlemek", score: 10, feedback: "Doğru. Temiz hava altta olur." },
            { text: "Koşarak geçmek", score: -6, feedback: "Riskli. Duman soluma artar." },
            { text: "Geri dönüp eşyaları almak", score: -10, feedback: "Yanlış. Önce çıkış." }
          ]},
          { id: "y2", prompt: "Kapıyı açmadan önce ne yapmalısın?", choices: [
            { text: "Kapı kolunu kontrol etmek (sıcaksa açmamak)", score: 10, feedback: "Doğru. Arkada alev olabilir." },
            { text: "Hızla açıp kaçmak", score: -8, feedback: "Riskli. Ani alev/duman gelebilir." },
            { text: "Kapıyı kilitlemek", score: -4, feedback: "Gereksiz. Amaç güvenli çıkış." }
          ]},
          { id: "y3", prompt: "Yangında asansör kullanımı?", choices: [
            { text: "Kullanılmaz", score: 10, feedback: "Doğru. Elektrik kesilebilir, duman dolabilir." },
            { text: "Hızlı diye kullanılır", score: -10, feedback: "Yanlış." },
            { text: "Sadece kalabalıkta kullanılır", score: -8, feedback: "Yanlış." }
          ]},
          { id: "y4", prompt: "Duman içindeyken ağız-burun için en iyi seçenek?", choices: [
            { text: "Kıyafetle/bezle kapatıp alçaktan ilerlemek", score: 8, feedback: "Doğru. Solunumu bir miktar azaltır." },
            { text: "Derin nefes almak", score: -10, feedback: "Yanlış. Duman solumayı artırır." },
            { text: "Bağırarak koşmak", score: -6, feedback: "Riskli." }
          ]},
          { id: "y5", prompt: "Çıkışa giderken kapıları neden kapatırız (kilitlemeden)?", choices: [
            { text: "Duman/alev yayılımını yavaşlatmak için", score: 10, feedback: "Doğru. Yayılım azalır." },
            { text: "Kimse geri girmesin diye", score: -4, feedback: "Amaç bu değil; kilitleme yapılmaz." },
            { text: "Daha hızlı çıkmak için", score: -2, feedback: "Doğrudan sebep değil." }
          ]},
          { id: "y6", prompt: "Yangın alarmını duyunca ilk doğru adım?", choices: [
            { text: "Öğretmen talimatı + işaretli çıkış", score: 8, feedback: "Doğru. Panik yapmadan yönlendirmeyi izle." },
            { text: "Arkadaşları arayıp toplanmak", score: -4, feedback: "Riskli. Önce çıkış." },
            { text: "Sosyal medyaya video çekmek", score: -10, feedback: "Yanlış. Zaman kaybı." }
          ]},
          { id: "y7", prompt: "Yangında kapı/duvarın sıcak olduğunu fark edersen?", choices: [
            { text: "O kapıyı açmam, alternatif çıkış ararım", score: 10, feedback: "Doğru. Arkasında alev olabilir." },
            { text: "Hemen açarım", score: -10, feedback: "Yanlış. Alev/duman gelebilir." },
            { text: "Kapıya yaslanırım", score: -8, feedback: "Riskli." }
          ]},
          { id: "y8", prompt: "Dumanlı ortamda hangi yükseklik daha güvenli?", choices: [
            { text: "Yer seviyesine yakın (eğilerek)", score: 10, feedback: "Doğru. Temiz hava altta kalır." },
            { text: "Ayakta yürümek", score: -6, feedback: "Riskli. Daha çok duman solursun." },
            { text: "Sandalyeye çıkıp yüksekten gitmek", score: -10, feedback: "Yanlış." }
          ]},
          { id: "y9", prompt: "Yangında merdiven kullanımıyla ilgili doğru olan?", choices: [
            { text: "Merdiveni kullanırım, asansöre binmem", score: 10, feedback: "Doğru. Asansör tehlikelidir." },
            { text: "Asansör en hızlısı", score: -10, feedback: "Yanlış." },
            { text: "Merdivende koşarım", score: -6, feedback: "Riskli. Düşme olabilir." }
          ]},
          { id: "y10", prompt: "Yangında kalabalık tahliyede doğru davranış?", choices: [
            { text: "İtişmeden sırayla ilerlemek", score: 8, feedback: "Doğru. Panik ve yığılma azalır." },
            { text: "Bağırıp koşarak öne geçmek", score: -8, feedback: "Riskli." },
            { text: "Geri dönüp arkadaş aramak", score: -10, feedback: "Yanlış. Duman riski artar." }
          ]},
          { id: "y11", prompt: "Yangında çıkış tabelası/işaretleri neden önemlidir?", choices: [
            { text: "En güvenli çıkış rotasını gösterir", score: 8, feedback: "Doğru." },
            { text: "Süs amaçlıdır", score: -8, feedback: "Yanlış." },
            { text: "Sadece karanlıkta işe yarar", score: -2, feedback: "Her durumda yönlendirme sağlar." }
          ]},
          { id: "y12", prompt: "Dumanın yoğun olduğu yerde ne yapmamalısın?", choices: [
            { text: "Derin nefes alıp koşmak", score: -10, feedback: "Yanlış. Duman solumayı artırır." },
            { text: "Eğilip kontrollü ilerlemek", score: 8, feedback: "Doğru." },
            { text: "Ağzı-burnu kapatmak", score: 6, feedback: "Doğru." }
          ]},
          { id: "y13", prompt: "Yangında toplanma alanında doğru yaklaşım?", choices: [
            { text: "Yoklama için grupta kalmak", score: 8, feedback: "Doğru." },
            { text: "Bina yakınına dönmek", score: -10, feedback: "Yanlış." },
            { text: "Kalabalıktan ayrılıp dolaşmak", score: -6, feedback: "Riskli." }
          ]},
          { id: "y14", prompt: "Yangın sırasında camı kırıp atlamak neden tehlikeli?", choices: [
            { text: "Cam kesikleri ve yüksekten düşme riski", score: 10, feedback: "Doğru." },
            { text: "Çünkü ses çıkar", score: -2, feedback: "Asıl risk yaralanma/düşme." },
            { text: "Çünkü dışarısı soğuk", score: -2, feedback: "Asıl risk yaralanma/düşme." }
          ]},
          { id: "y15", prompt: "Yangında kapıyı kapatmak (kilitlemeden) ne işe yarar?", choices: [
            { text: "Duman ve alevin yayılmasını yavaşlatır", score: 10, feedback: "Doğru." },
            { text: "Kimse geri giremesin diye", score: -4, feedback: "Amaç bu değil; kilitleme yapılmaz." },
            { text: "Daha hızlı koşmayı sağlar", score: -6, feedback: "Yanlış." }
          ]},
          { id: "y16", prompt: "Yangında ıslak bez/kıyafet kullanımı ne sağlar?", choices: [
            { text: "Dumanı bir miktar filtreleyip solunumu azaltabilir", score: 6, feedback: "Doğru (sınırlı fayda). Asıl amaç hızlı çıkış." },
            { text: "Tam koruma sağlar, bekleyebilirim", score: -8, feedback: "Yanlış. Tam koruma sağlamaz." },
            { text: "Hiç işe yaramaz", score: -2, feedback: "Bir miktar fayda sağlayabilir." }
          ]},
          { id: "y17", prompt: "Yangında panikleyen birini görürsen ne yaparsın?", choices: [
            { text: "Sakinleştirip çıkış yönüne yönlendiririm (kendimi riske atmadan)", score: 6, feedback: "Doğru. Panik kazayı artırır." },
            { text: "Bağırırım", score: -6, feedback: "Riskli. Panik artar." },
            { text: "Video çekerim", score: -10, feedback: "Yanlış." }
          ]},
          { id: "y18", prompt: "Yangında geri dönmek neden tehlikelidir?", choices: [
            { text: "Duman/ısı artar, yön kaybolabilir", score: 10, feedback: "Doğru." },
            { text: "Çünkü zaman kaybı olur", score: -2, feedback: "Zaman kaybı var ama asıl risk duman/ısıdır." },
            { text: "Çünkü kapı kapanır", score: -2, feedback: "Asıl risk duman/ısıdır." }
          ]},
          { id: "y19", prompt: "Yangında elektrik kesilirse neye güvenirsin?", choices: [
            { text: "Çıkış işaretleri ve yönlendirmeler", score: 8, feedback: "Doğru." },
            { text: "Asansöre", score: -10, feedback: "Yanlış." },
            { text: "Rastgele kapılara", score: -6, feedback: "Riskli." }
          ]},
          { id: "y20", prompt: "Yangın alarmı çalınca eşyalarını toplamak doğru mu?", choices: [
            { text: "Hayır, önce güvenli tahliye", score: 10, feedback: "Doğru. Can güvenliği öncelik." },
            { text: "Evet, çantam çok önemli", score: -8, feedback: "Yanlış." },
            { text: "Sadece telefonumu alırım ve oyalanırım", score: -6, feedback: "Riskli. Oyalanma." }
          ]}
        ]
      }
    };

    function buildTest(scnId) {
      const pool = pools[scnId]?.questions || [];
      const recentKey = LS_RECENT_PREFIX + scnId;
      const recent = new Set(readRecent(recentKey));
      const fresh = pool.filter((q) => !recent.has(q.id));
      const source = fresh.length >= TEST_LEN ? fresh : pool;
      const picked = shuffle([...source]).slice(0, Math.min(TEST_LEN, source.length));
      const nextRecent = [...picked.map((q) => q.id), ...Array.from(recent)];
      writeRecent(recentKey, nextRecent);
      return { title: pools[scnId]?.title || "Test", questions: picked };
    }

    let activeScenarioId = sel?.value || "okul-deprem";
    let test = null;
    let qIndex = 0;
    let scenarioScore = 0;
    let lastChoice = null;
    let history = [];

    function getTotal() {
      const n = Number(localStorage.getItem(LS_TOTAL_KEY) || "0");
      return Number.isFinite(n) ? n : 0;
    }
    function setTotal(v) {
      localStorage.setItem(LS_TOTAL_KEY, String(v));
    }

    function setMeta(text) {
      if (meta) meta.textContent = text;
    }

    function show(el, yes) {
      if (!el) return;
      el.hidden = !yes;
    }

    function renderQuestion() {
      if (!test || !test.questions.length) {
        setMeta("Soru havuzu bulunamadı.");
        return;
      }
      const q = test.questions[qIndex];
      if (!q) return;
      if (progressEl) progressEl.textContent = `${test.title} • Soru ${qIndex + 1} / ${test.questions.length}`;
      if (promptEl) promptEl.textContent = q.prompt || "";

      optionsEl.innerHTML = "";
      show(feedbackEl, false);
      btnNext.hidden = true;
      lastChoice = null;

      const choices = q.choices || [];
      choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "scenarioOpt";
        b.textContent = c.text;
        b.addEventListener("click", () => {
          lastChoice = c;
          history.push(c.text);
          // disable all
          Array.from(optionsEl.querySelectorAll("button")).forEach((x) => (x.disabled = true));
          scenarioScore += Number(c.score || 0);
          feedbackEl.className = `scenario__feedback scenario__feedback--${c.score >= 0 ? "ok" : "fail"}`;
          feedbackEl.innerHTML = `<strong>${c.score >= 0 ? "İyi seçim" : "Riskli seçim"}</strong><p>${escapeHtml(
            c.feedback || ""
          )}</p>`;
          show(feedbackEl, true);
          btnNext.hidden = false;
          btnNext.textContent = qIndex + 1 >= test.questions.length ? "Sonucu gör" : "Devam";
        });
        optionsEl.appendChild(b);
      });

      show(qWrap, true);
      show(resultWrap, false);
      setMeta("Seçimini yap.");
    }

    function start() {
      activeScenarioId = sel?.value || "okul-deprem";
      test = buildTest(activeScenarioId);
      qIndex = 0;
      scenarioScore = 0;
      lastChoice = null;
      history = [];
      renderQuestion();
    }

    btnStart?.addEventListener("click", start);
    function finish() {
      show(qWrap, false);
      show(resultWrap, true);
      const totalBefore = getTotal();
      const totalAfter = totalBefore + scenarioScore;
      setTotal(totalAfter);
      const done = readDoneSet();
      done.add(activeScenarioId);
      writeDoneSet(done);

      const badges = new Set(readBadgesLocal());
      if (scenarioScore >= 30) badges.add("Senaryo Testi: Doğru kararlar");
      if (scenarioScore >= 38) badges.add("Senaryo Testi: Soğukkanlı");
      if (scenarioScore >= 44) badges.add("Senaryo Testi: Kriz Lideri");
      if (totalAfter >= 60) badges.add("Senaryo: İstikrar (60+)");
      if (totalAfter >= 120) badges.add("Senaryo: Stratejist (120+)");
      if (done.size >= 3) badges.add("Senaryo: 3/3 Tamamlandı");
      writeBadgesLocal(Array.from(badges));

      if (scoreEl) {
        const s = scenarioScore;
        scoreEl.innerHTML = `<strong>Test puanın:</strong> ${s >= 0 ? "+" : ""}${s} puan<br/><span class="muted small">Her başlatışta havuzdan 5 soru gelir.</span>`;
      }
      if (totalEl) totalEl.innerHTML = `<strong>Toplam puanın:</strong> ${totalAfter}`;
      if (scnBadgesEl) {
        const list = Array.from(badges);
        scnBadgesEl.innerHTML = list.length ? list.map((b) => `<span class="badge">${escapeHtml(b)}</span>`).join("") : "";
      }
      if (pathEl) {
        const items = history.map((h) => `<li>${escapeHtml(h)}</li>`).join("");
        pathEl.innerHTML = `<strong>Seçimlerin</strong>${items ? `<ul>${items}</ul>` : ""}`;
      }
      setMeta("Bitti.");
    }

    btnNext?.addEventListener("click", () => {
      if (!lastChoice) return;
      qIndex += 1;
      if (!test || qIndex >= test.questions.length) finish();
      else renderQuestion();
    });
    btnRestart?.addEventListener("click", start);
    btnReplay?.addEventListener("click", start);
    btnResetTotal?.addEventListener("click", () => {
      setTotal(0);
      if (totalEl) totalEl.innerHTML = "<strong>Toplam puanın:</strong> 0";
      setMeta("Toplam puan sıfırlandı.");
    });

    // İlk metin
    setMeta("Konu seçip 5 soruluk testi başlat.");
    show(qWrap, false);
    show(resultWrap, false);
  }

  /* —— 18–40 Çanta öneri asistanı —— */
  const advPanel = root.querySelector("[data-canta-adviser]");
  const advOpen = root.querySelector("[data-canta-adv-open]");
  if (advPanel && advOpen) {
    const LS_ADV_KEY = "adult_canta_profile_v1";
    const meta = advPanel.querySelector("[data-canta-adv-meta]");
    const out = advPanel.querySelector("[data-canta-adv-out]");
    const flags = Array.from(advPanel.querySelectorAll("[data-canta-flag]"));
    const btnGen = advPanel.querySelector('[data-canta-adv-action="generate"]');
    const btnSave = advPanel.querySelector('[data-canta-adv-action="save"]');
    const btnReset = advPanel.querySelector('[data-canta-adv-action="reset"]');

    function readProfile() {
      try {
        return JSON.parse(localStorage.getItem(LS_ADV_KEY) || "{}");
      } catch {
        return {};
      }
    }
    function writeProfile(p) {
      localStorage.setItem(LS_ADV_KEY, JSON.stringify(p));
    }

    function setMeta(t) {
      if (meta) meta.textContent = t;
    }

    function getState() {
      const s = {};
      flags.forEach((el) => (s[el.getAttribute("data-canta-flag")] = !!el.checked));
      return s;
    }

    function setState(s) {
      flags.forEach((el) => {
        const k = el.getAttribute("data-canta-flag");
        el.checked = !!s?.[k];
      });
    }

    function buildSuggestions(s) {
      const list = [];
      if (s.child) list.push("Çocuklar için: yedek kıyafet, atıştırmalık, küçük hijyen seti");
      if (s.baby)
        list.push("Bebek için: bez, ıslak mendil, pişik kremi, biberon/mama, yedek kıyafet");
      if (s.elder)
        list.push("Yaşlı birey için: ilaç düzeni, gözlük/işitme cihazı pilleri, yedek şarj, basit tıbbi not");
      if (s.pet)
        list.push("Evcil hayvan için: mama/su kabı, taşıma çantası, tasma, mama, atık poşeti, aşı kartı kopyası");
      if (s.meds)
        list.push("Kronik ilaç için: en az 3–7 günlük stok, reçete/fotografi, doz listesi");
      if (list.length === 0) list.push("Ek ihtiyaç seçmedin. Temel çanta checklist’i çoğu kullanıcı için iyi bir başlangıçtır.");
      return list;
    }

    function renderOut(list) {
      if (!out) return;
      out.hidden = false;
      out.innerHTML = `<strong>Önerilen ek ihtiyaçlar</strong><ul>${list
        .map((x) => `<li>${escapeHtml(x)}</li>`)
        .join("")}</ul>`;
    }

    advOpen.addEventListener("click", () => {
      advPanel.hidden = !advPanel.hidden;
      if (!advPanel.hidden) {
        setState(readProfile());
        setMeta("Profil yüklendi. İstersen değiştirip öneri üret.");
      }
    });

    btnGen?.addEventListener("click", () => {
      const s = getState();
      const list = buildSuggestions(s);
      renderOut(list);
      setMeta("Öneriler güncellendi.");
    });

    btnSave?.addEventListener("click", () => {
      writeProfile(getState());
      setMeta("Profil kaydedildi.");
    });

    btnReset?.addEventListener("click", () => {
      setState({});
      if (out) out.hidden = true;
      setMeta("Sıfırlandı.");
    });
  }

  /* —— Referans linkleri (sayfaya gömülü; gerekirse sonra server’dan beslenebilir) —— */
  const refs = {
    kids: [
      {
        label: "AFAD – Deprem Anında Neler Yapmalısınız? (Çök-Kapan-Tutun)",
        href: "https://www.afad.gov.tr/deprem-aninda-neler-yapmalisiniz",
      },
      {
        label: "Türk Kızılay – Çocuk kitapları ve boyama kitabı (Kızılay Haftası)",
        href: "https://www.kizilay.org.tr/kizilayhaftasi/kitaplar.html",
      },
      {
        label: "MEB (Özel Eğitim) – Afet sonrası uyum etkinlikleri kitabı",
        href: "https://orgm.meb.gov.tr/www/ozel-egitim-ihtiyaci-olan-ogrenciler-icin-afet-sonrasi-uyum-etkinlikleri-kitabi-yayimlandi/icerik/2336",
      },
    ],
    teens: [
      {
        label: "PrepareCenter – Teen Prep Kit (13–19 yaş için afet hazırlığı etkinlikleri)",
        href: "https://preparecenter.org/toolkit/teenprepkit/",
      },
      {
        label: "UNICEF Türkiye – Deprem Haftası: çocuklar ve gençler için risk azaltma farkındalığı",
        href: "https://www.unicefturk.org/yazi/1-7-mart-deprem-haftasi-afetlere-karsi-cocuklar-icin-guvenli-bir-gelecek-insa-etmek",
      },
      {
        label: "AFAD – Deprem (AFAD eğitim modülü/rehber sayfası)",
        href: "https://www.afad.gov.tr/afadem/deprem",
      },
    ],
    adults: [
      {
        label: "AFAD – Afet ve Acil Durum Çantası Nasıl Hazırlanmalı?",
        href: "https://www.afad.gov.tr/afet-ve-acil-durum-cantasi-nasil-hazirlanmali",
      },
      { label: "AFAD – Sel", href: "https://www.afad.gov.tr/afadem/sel" },
      { label: "AFAD – Heyelan", href: "https://www.afad.gov.tr/afadem/heyelan" },
      { label: "AFAD – Ormanlarımız Kül Olmasın (Orman yangınları)", href: "https://www.afad.gov.tr/ormanlarimiz-kul-olmasin" },
    ],
    seniors: [
      {
        label: "WHO – Older persons in emergencies (policy & action considerations) (PDF)",
        href: "https://extranet.who.int/agefriendlyworld/wp-content/uploads/2014/06/WHO-Older-Persons-in-Emergencies-Considerations-for-Action-and-Policy-Development-English.pdf",
      },
      {
        label: "AFAD – Afet ve Acil Durum Planı (Aile planı broşürü PDF örneği)",
        href: "https://www.naztic.org.tr/wp-content/uploads/2021/09/AFAD-afet-ve-acil-durum-aile-plani.pdf",
      },
    ],
  };

  function renderRefList(id, items) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = items
      .map(
        (r) =>
          `<li><a class="refLink" href="${r.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            r.label
          )}</a></li>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  /* —— 40+ İlaç listesi (cihazda saklanır) —— */
  const medsRoot = root.querySelector("[data-senior-meds]");
  if (medsRoot) {
    const LS_MEDS_KEY = "senior_meds_list_v1";
    const meta = medsRoot.querySelector("[data-meds-meta]");
    const form = medsRoot.querySelector("[data-meds-form]");
    const listEl = medsRoot.querySelector("[data-meds-list]");
    const inputName = medsRoot.querySelector('[data-meds-input="name"]');
    const inputDose = medsRoot.querySelector('[data-meds-input="dose"]');
    const inputDays = medsRoot.querySelector('[data-meds-input="days"]');
    const inputNote = medsRoot.querySelector('[data-meds-input="note"]');
    const btnPrint = medsRoot.querySelector('[data-meds-action="print"]');
    const btnClear = medsRoot.querySelector('[data-meds-action="clear"]');

    function readMeds() {
      try {
        const data = JSON.parse(localStorage.getItem(LS_MEDS_KEY) || "[]");
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }

    function writeMeds(items) {
      localStorage.setItem(LS_MEDS_KEY, JSON.stringify(items));
    }

    function setMeta(text) {
      if (meta) meta.textContent = text;
    }

    function newId() {
      return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function renderList(items) {
      if (!listEl) return;
      listEl.innerHTML = items
        .map((item) => {
          const bits = [];
          if (item.dose) bits.push(`Doz: ${escapeHtml(item.dose)}`);
          if (item.days) bits.push(`Yedek: ${escapeHtml(String(item.days))} gün`);
          if (item.note) bits.push(escapeHtml(item.note));
          const metaLine = bits.length ? `<div class="medsApp__itemMeta">${bits.join(" · ")}</div>` : "";
          return `<li class="medsApp__item" data-meds-id="${escapeHtml(item.id)}">
            <div class="medsApp__itemMain">
              <strong>${escapeHtml(item.name)}</strong>
              ${metaLine}
            </div>
            <button type="button" class="btn btn--ghost btn--sm" data-meds-remove aria-label="${escapeHtml(
              item.name
            )} ilacını sil">Sil</button>
          </li>`;
        })
        .join("");
      setMeta(
        items.length
          ? `${items.length} ilaç kayıtlı · son güncelleme: ${new Date().toLocaleString("tr-TR")}`
          : "İlaçlarınızı ekleyin; cihazınızda saklanır."
      );
    }

    function printMeds(items) {
      if (!items.length) {
        setMeta("Yazdırmak için önce en az bir ilaç ekleyin.");
        return;
      }
      const rows = items
        .map(
          (item, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.dose || "—")}</td>
            <td>${item.days ? escapeHtml(String(item.days)) + " gün" : "—"}</td>
            <td>${escapeHtml(item.note || "—")}</td>
          </tr>`
        )
        .join("");
      const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"/>
        <title>İlaç listem</title>
        <style>
          body{font-family:system-ui,sans-serif;padding:24px;color:#111}
          h1{font-size:20px;margin:0 0 8px}
          p{color:#555;font-size:13px}
          table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
          th,td{border:1px solid #ccc;padding:8px;text-align:left}
          th{background:#f4f6f9}
        </style></head><body>
        <h1>Acil durum ilaç listem</h1>
        <p>Çantada taşımak için yazdırılmış kopya · ${new Date().toLocaleString("tr-TR")}</p>
        <table>
          <thead><tr><th>#</th><th>İlaç</th><th>Doz</th><th>Yedek</th><th>Not</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </body></html>`;
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        setMeta("Yazdırma penceresi açılamadı. Tarayıcı açılır pencereyi engelliyor olabilir.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }

    let items = readMeds();
    renderList(items);

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (inputName?.value || "").trim();
      if (!name) return;
      const dose = (inputDose?.value || "").trim();
      const daysRaw = (inputDays?.value || "").trim();
      const note = (inputNote?.value || "").trim();
      const days = daysRaw ? Math.max(1, Math.min(90, Number(daysRaw))) : null;
      items = [
        ...items,
        {
          id: newId(),
          name,
          dose,
          days: Number.isFinite(days) ? days : null,
          note,
        },
      ];
      writeMeds(items);
      renderList(items);
      form.reset();
      inputName?.focus();
    });

    listEl?.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-meds-remove]");
      if (!btn) return;
      const li = btn.closest("[data-meds-id]");
      const id = li?.getAttribute("data-meds-id");
      if (!id) return;
      items = items.filter((x) => x.id !== id);
      writeMeds(items);
      renderList(items);
    });

    btnPrint?.addEventListener("click", () => printMeds(items));

    btnClear?.addEventListener("click", () => {
      if (!items.length) return;
      if (!window.confirm("Tüm ilaç kayıtlarını silmek istediğinize emin misiniz?")) return;
      items = [];
      writeMeds(items);
      renderList(items);
    });
  }

  /* —— 40+ Ev güvenlik kontrol listesi —— */
  const homeCheckRoot = root.querySelector("[data-home-check]");
  if (homeCheckRoot) {
    const LS_HOME_KEY = "senior_home_check_v1";
    const listEl = homeCheckRoot.querySelector("[data-home-check-list]");
    const metaEl = homeCheckRoot.querySelector("[data-home-check-meta]");
    const barFill = homeCheckRoot.querySelector("[data-home-check-bar]");
    const resultsEl = homeCheckRoot.querySelector("[data-home-check-results]");
    const btnEvaluate = homeCheckRoot.querySelector('[data-home-check-action="evaluate"]');
    const btnReset = homeCheckRoot.querySelector('[data-home-check-action="reset"]');

    const HOME_CHECK_ITEMS = [
      {
        id: "cabinet",
        label: "Dolaplar ve ağır eşyalar duvara sabit mi?",
        recommend:
          "Dolap, kitaplık ve televizyon gibi devrilebilir eşyaları L demirleri veya kayışlarla duvara sabitleyin.",
        regression:
          "Dolap sabitleme daha önce tamamdı; şimdi eksiklik var. Sarsıntıda devrilme ve yaralanma riski yeniden oluşabilir.",
        persist:
          "Hatırlatma: Bu madde hâlâ tamamlanmadı. Dolap ve ağır eşya sabitlemesi ev içi en kritik önlemlerden biridir.",
      },
      {
        id: "bag",
        label: "Acil durum çantası hazır ve kolay ulaşılabilir yerde mi?",
        recommend:
          "Su, gıda, fener, ilk yardım ve kişisel ihtiyaçları içeren çantayı hazırlayıp kapı veya yatak odası yakınında tutun.",
        regression:
          "Afet çantanız daha önce hazırdı; ancak şimdi eksiklik var. Çantayı yeniden kontrol edip tamamlayın.",
        persist:
          "Hatırlatma: Acil çanta hâlâ hazır değil. Afet sonrası ilk saatlerde elektrik ve markete erişim kesilebilir.",
      },
      {
        id: "meds",
        label: "İlaçlar güncel mi ve birkaç günlük yedek var mı?",
        recommend:
          "Düzenli kullandığınız ilaçların listesini yazın; en az 3–7 günlük yedek stok bulundurun.",
        regression:
          "İlaç yedeği daha önce tamamdı; şimdi eksiklik var. Son kullanma tarihlerini ve stok miktarını yeniden kontrol edin.",
        persist:
          "Hatırlatma: İlaç yedeği hâlâ eksik. Kronik tedavi görenler için bu madde önceliklidir.",
      },
      {
        id: "numbers",
        label: "Acil numaralar (112, AFAD vb.) kayıtlı veya yazılı mı?",
        recommend:
          "112, 110, AFAD ve aile bireylerinin numaralarını telefona kaydedin; ayrıca kağıda yazıp cüzdanda taşıyın.",
        regression:
          "Acil numaralar daha önce kayıtlıydı; şimdi eksik görünüyor. Telefon ve yazılı kopyayı yenileyin.",
        persist:
          "Hatırlatma: Acil numaralar hâlâ kayıtlı değil. Şebeke çökünce telefon rehberine erişim zorlaşabilir.",
      },
      {
        id: "plan",
        label: "Aile buluşma noktası ve iletişim planı belirlendi mi?",
        recommend:
          "Şehir içi ve dışı iletişim kişisi, buluşma noktası ve tahliye yolunu yazılı plana dökün.",
        regression:
          "Aile planı daha önce hazırdı; şimdi eksiklik var. Planı ailenizle tekrar gözden geçirin.",
        persist:
          "Hatırlatma: Aile iletişim planı hâlâ yok. Afet anında koordinasyon en büyük zorluklardan biridir.",
      },
      {
        id: "assembly",
        label: "Mahalle toplanma alanı biliniyor mu?",
        recommend:
          "AFAD toplanma alanları sisteminden evinize yakın güvenli alanı öğrenin ve ailenizle paylaşın.",
        regression:
          "Toplanma alanı bilgisi daha önce tamamdı; şimdi eksik. Konum değiştiyse güncel alanı öğrenin.",
        persist:
          "Hatırlatma: Toplanma alanı hâlâ bilinmiyor. Yakınlarınızla buluşmak için fiziksel bir plan oluşturur.",
      },
      {
        id: "supplies",
        label: "Su ve dayanıkmaz gıda yedeği var mı?",
        recommend:
          "Kişi başı en az birkaç günlük su ve konserve, bisküvi gibi pişirme gerektirmeyen gıda bulundurun.",
        regression:
          "Su ve gıda yedeği daha önce tamamdı; şimdi eksiklik var. Son kullanma tarihlerini kontrol edin.",
        persist:
          "Hatırlatma: Su ve gıda yedeği hâlâ yetersiz. Market ve su şebekesi afet sonrası kesilebilir.",
      },
      {
        id: "power",
        label: "El feneri, yedek pil veya powerbank hazır mı?",
        recommend:
          "El feneri, yedek piller ve şarj cihazını çantaya koyun; düzenli olarak çalıştığını test edin.",
        regression:
          "Aydınlatma/şarj malzemeleri daha önce hazırdı; şimdi eksik. Pilleri ve powerbank doluluğunu kontrol edin.",
        persist:
          "Hatırlatma: Fener veya powerbank hâlâ hazır değil. Gece ve iletişim için kritik öneme sahiptir.",
      },
      {
        id: "docs",
        label: "Kimlik ve sağlık belgesi kopyaları su geçirmez dosyada mı?",
        recommend:
          "Kimlik, reçete ve sağlık raporu fotokopilerini su geçirmez poşet veya dosyada çantaya ekleyin.",
        regression:
          "Belge kopyaları daha önce hazırdı; şimdi eksiklik var. Dosyayı yenileyip çantaya geri koyun.",
        persist:
          "Hatırlatma: Belge kopyaları hâlâ eksik. Hastane ve resmi işlemlerde gerekebilir.",
      },
      {
        id: "exit",
        label: "Tahliye yolu ve kapı girişi engelsiz mi?",
        recommend:
          "Ana kapı ve tahliye güzergâhındaki eşyaları kaldırın; anahtar ve ayakkabıyı kolay ulaşılabilir yerde tutun.",
        regression:
          "Tahliye yolu daha önce açıktı; şimdi engel var. Koridor ve kapı önünü hemen boşaltın.",
        persist:
          "Hatırlatma: Tahliye yolu hâlâ engelli. Afet anında saniyeler önemlidir; yol açık olmalıdır.",
      },
    ];

    function readStore() {
      try {
        const raw = JSON.parse(localStorage.getItem(LS_HOME_KEY) || "{}");
        return {
          answers: raw.answers && typeof raw.answers === "object" ? raw.answers : {},
          runs: Array.isArray(raw.runs) ? raw.runs.slice(-30) : [],
        };
      } catch {
        return { answers: {}, runs: [] };
      }
    }

    function writeStore(store) {
      localStorage.setItem(LS_HOME_KEY, JSON.stringify(store));
      window.dispatchEvent(new CustomEvent("hazirlik-ozet-update"));
    }

    function getAnswersFromDom() {
      const out = {};
      HOME_CHECK_ITEMS.forEach((item) => {
        const el = listEl?.querySelector(`[data-home-check-id="${item.id}"]`);
        out[item.id] = !!el?.checked;
      });
      return out;
    }

    function applyAnswersToDom(answers) {
      HOME_CHECK_ITEMS.forEach((item) => {
        const el = listEl?.querySelector(`[data-home-check-id="${item.id}"]`);
        if (el) el.checked = !!answers[item.id];
      });
      updateProgress();
    }

    function updateProgress() {
      const answers = getAnswersFromDom();
      const done = HOME_CHECK_ITEMS.filter((i) => answers[i.id]).length;
      const total = HOME_CHECK_ITEMS.length;
      const pct = Math.round((done / total) * 100);
      if (barFill) barFill.style.width = `${pct}%`;
      if (metaEl) metaEl.textContent = `${done}/${total} madde işaretlendi`;
      const store = readStore();
      store.answers = answers;
      writeStore(store);
    }

    function renderChecklist() {
      if (!listEl) return;
      listEl.innerHTML = HOME_CHECK_ITEMS.map(
        (item) => `<label class="homeCheck__item">
          <input type="checkbox" data-home-check-id="${escapeHtml(item.id)}"/>
          <span>${escapeHtml(item.label)}</span>
        </label>`
      ).join("");
      listEl.addEventListener("change", updateProgress);
    }

    function evaluate() {
      const current = getAnswersFromDom();
      const store = readStore();
      const prev = store.runs.length ? store.runs[store.runs.length - 1].answers : null;
      const done = HOME_CHECK_ITEMS.filter((i) => current[i.id]).length;
      const total = HOME_CHECK_ITEMS.length;

      const recommends = [];
      const persists = [];
      const regressions = [];
      const improvements = [];

      HOME_CHECK_ITEMS.forEach((item) => {
        const ok = !!current[item.id];
        const wasOk = prev ? !!prev[item.id] : null;

        if (!ok) {
          recommends.push({ label: item.label, text: item.recommend });
          if (prev && wasOk === false) persists.push({ label: item.label, text: item.persist });
          if (prev && wasOk === true) regressions.push({ label: item.label, text: item.regression });
        } else if (prev && wasOk === false) {
          improvements.push({
            label: item.label,
            text: `${item.label.replace(/\?$/, "")} — bu kontrolde tamamlandı. Böyle devam edin.`,
          });
        }
      });

      store.answers = current;
      store.runs.push({ at: new Date().toISOString(), answers: { ...current } });
      writeStore(store);

      if (!resultsEl) return;
      resultsEl.hidden = false;

      let html = `<p class="homeCheck__score">Skor: ${done}/${total}</p>`;
      html += `<p class="muted small">Değerlendirme: ${new Date().toLocaleString("tr-TR")}${
        store.runs.length > 1 ? " · önceki kontrolle karşılaştırıldı" : ""
      }</p>`;

      if (done === total) {
        html += `<section><h4><span class="homeCheck__tag homeCheck__tag--ok">Tamam</span>Tebrikler</h4><p class="muted">Tüm maddeler tamam görünüyor. Ayda bir bu listeyi yeniden kontrol etmeniz önerilir.</p></section>`;
      }

      if (regressions.length) {
        html += `<section><h4><span class="homeCheck__tag homeCheck__tag--alert">Gerileme</span>Önceden tamam, şimdi eksik</h4><ul class="homeCheck__msgList">${regressions
          .map((x) => `<li><strong>${escapeHtml(x.label)}</strong> ${escapeHtml(x.text)}</li>`)
          .join("")}</ul></section>`;
      }

      if (persists.length) {
        html += `<section><h4><span class="homeCheck__tag homeCheck__tag--remind">Hatırlatma</span>Hâlâ tamamlanmayan maddeler</h4><ul class="homeCheck__msgList">${persists
          .map((x) => `<li><strong>${escapeHtml(x.label)}</strong> ${escapeHtml(x.text)}</li>`)
          .join("")}</ul></section>`;
      }

      if (recommends.length) {
        html += `<section><h4><span class="homeCheck__tag homeCheck__tag--warn">Öneri</span>Eksik maddeler için yapılacaklar</h4><ul class="homeCheck__msgList">${recommends
          .map((x) => `<li><strong>${escapeHtml(x.label)}</strong> ${escapeHtml(x.text)}</li>`)
          .join("")}</ul></section>`;
      }

      if (improvements.length) {
        html += `<section><h4><span class="homeCheck__tag homeCheck__tag--ok">İyileşme</span>Önceki kontrole göre düzelenler</h4><ul class="homeCheck__msgList">${improvements
          .map((x) => `<li>${escapeHtml(x.text)}</li>`)
          .join("")}</ul></section>`;
      }

      if (recommends.length === 0 && done < total) {
        html += `<p class="muted">Bazı maddeler işaretlenmedi; yukarıdaki kutuları güncelleyip tekrar değerlendirin.</p>`;
      }

      resultsEl.innerHTML = html;
      resultsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    renderChecklist();
    applyAnswersToDom(readStore().answers);

    btnEvaluate?.addEventListener("click", evaluate);

    btnReset?.addEventListener("click", () => {
      if (!window.confirm("Tüm işaretleri ve kayıtlı kontrol geçmişini silmek istiyor musunuz?")) return;
      writeStore({ answers: {}, runs: [] });
      applyAnswersToDom({});
      if (resultsEl) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = "";
      }
    });
  }

  renderRefList("refKids", refs.kids);
  renderRefList("refTeens", refs.teens);
  renderRefList("refAdults", refs.adults);
  renderRefList("refSeniors", refs.seniors);

  /* —— 2–10 Boyama (mouse + touch; tam ekran modal) —— */
  const coloringModal = document.getElementById("coloringModal");
  const coloringModalHost = document.getElementById("coloringModalHost");
  const coloringModalTitle = document.getElementById("coloringModalTitle");
  let modalColoringCtrl = null;

  function slugify(s) {
    return String(s || "boyama")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  function parseHexColor(hex) {
    const h = String(hex || "#f97316").replace("#", "");
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
        255,
      ];
    }
    return [
      parseInt(h.slice(0, 2), 16) || 0,
      parseInt(h.slice(2, 4), 16) || 0,
      parseInt(h.slice(4, 6), 16) || 0,
      255,
    ];
  }

  function mountColoring(host, { src, title, compact, onReady }) {
    host.classList.add("coloringRoot");
    host.innerHTML = `
      <div class="coloring__toolbar" aria-label="Boyama araçları">
        <span class="coloring__title">${escapeHtml(title)}</span>
        <div class="coloring__tools">
          <button type="button" class="btn btn--ghost btn--sm is-active" data-tool="fill">Doldur</button>
          <button type="button" class="btn btn--ghost btn--sm" data-tool="eraser">Silgi</button>
          <label class="coloring__label">Renk
            <input type="color" value="#f97316" data-tool="color"/>
          </label>
          <button type="button" class="btn btn--ghost btn--sm" data-tool="reset">Sıfırla</button>
          <button type="button" class="btn btn--primary btn--sm" data-tool="download">İndir</button>
          ${compact ? '<button type="button" class="btn btn--ghost btn--sm" data-tool="fullscreen">Tam ekran boya</button>' : ""}
        </div>
      </div>
      <div class="coloring__stage">
        <canvas class="coloring__canvas" aria-label="Boyama alanı"></canvas>
      </div>
      <p class="muted small">Renk seç, boyamak istediğin alana <strong>tıkla</strong>. Çizgilerin dışına taşmaz.</p>
    `;

    const canvas = host.querySelector(".coloring__canvas");
    const stage = host.querySelector(".coloring__stage");
    const btnEraser = host.querySelector('[data-tool="eraser"]');
    const btnFill = host.querySelector('[data-tool="fill"]');
    const inpColor = host.querySelector('[data-tool="color"]');
    const btnReset = host.querySelector('[data-tool="reset"]');
    const btnDownload = host.querySelector('[data-tool="download"]');
    const btnFullscreen = host.querySelector('[data-tool="fullscreen"]');

    const ctx = canvas.getContext("2d", { alpha: true });
    const colorLayer = document.createElement("canvas");
    const colorCtx = colorLayer.getContext("2d", { alpha: true });

    const outlineImg = new Image();
    outlineImg.src = src;

    let outlinePixels = null;
    let outlineOverlay = null;
    let tool = "fill";
    let ready = false;

    const LINE_LUM = 140;
    const FILL_TOLERANCE = 48;

    function setActiveTool(next) {
      tool = next;
      btnEraser.classList.toggle("is-active", tool === "eraser");
      btnFill.classList.toggle("is-active", tool === "fill");
      canvas.style.cursor = tool === "eraser" ? "cell" : "pointer";
    }
    setActiveTool("fill");

    function preserveResize(newW, newH) {
      const oldW = colorLayer.width;
      const oldH = colorLayer.height;
      let snap = null;
      if (oldW > 0 && oldH > 0) {
        snap = document.createElement("canvas");
        snap.width = oldW;
        snap.height = oldH;
        snap.getContext("2d").drawImage(colorLayer, 0, 0);
      }
      colorLayer.width = newW;
      colorLayer.height = newH;
      if (snap) {
        colorCtx.clearRect(0, 0, newW, newH);
        colorCtx.drawImage(snap, 0, 0, newW, newH);
      }
    }

    function resize() {
      if (!outlineImg.naturalWidth) return;
      const rect = stage.getBoundingClientRect();
      const maxW = Math.max(compact ? 260 : 520, Math.floor(rect.width) || 520);
      const ratio = outlineImg.naturalHeight / outlineImg.naturalWidth;
      const cssW = maxW;
      const cssH = Math.round(cssW * ratio);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);

      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
        preserveResize(pxW, pxH);
        cacheOutlineMask();
      }
      redraw();
    }

    function redraw() {
      if (!outlineImg.naturalWidth || !canvas.width || !outlineOverlay) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(colorLayer, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(outlineOverlay, 0, 0, canvas.width, canvas.height);
    }

    function cacheOutlineMask() {
      if (!canvas.width || !outlineImg.naturalWidth) return;
      const oc = document.createElement("canvas");
      oc.width = canvas.width;
      oc.height = canvas.height;
      const octx = oc.getContext("2d");
      octx.drawImage(outlineImg, 0, 0, canvas.width, canvas.height);
      const imgData = octx.getImageData(0, 0, canvas.width, canvas.height);
      outlinePixels = imgData.data;
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (lum >= LINE_LUM) d[i + 3] = 0;
      }
      if (!outlineOverlay) outlineOverlay = document.createElement("canvas");
      outlineOverlay.width = canvas.width;
      outlineOverlay.height = canvas.height;
      outlineOverlay.getContext("2d").putImageData(imgData, 0, 0);
    }

    function isOutlineLine(x, y) {
      if (!outlinePixels) return false;
      const w = canvas.width;
      const i = (y * w + x) * 4;
      const lum = (outlinePixels[i] + outlinePixels[i + 1] + outlinePixels[i + 2]) / 3;
      return lum < LINE_LUM;
    }

    function floodFillAt(px, py) {
      const w = canvas.width;
      const h = canvas.height;
      const x0 = Math.floor(px);
      const y0 = Math.floor(py);
      if (x0 < 0 || x0 >= w || y0 < 0 || y0 >= h) return;
      if (isOutlineLine(x0, y0)) return;

      const img = colorCtx.getImageData(0, 0, w, h);
      const data = img.data;
      const start = (y0 * w + x0) * 4;
      const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
      const fill = tool === "eraser" ? [0, 0, 0, 0] : parseHexColor(inpColor.value);

      if (
        tool !== "eraser" &&
        Math.abs(target[0] - fill[0]) < 8 &&
        Math.abs(target[1] - fill[1]) < 8 &&
        Math.abs(target[2] - fill[2]) < 8 &&
        Math.abs(target[3] - fill[3]) < 8
      ) {
        return;
      }

      const visited = new Uint8Array(w * h);
      const stack = [[x0, y0]];

      function similar(ix) {
        return (
          Math.abs(data[ix] - target[0]) <= FILL_TOLERANCE &&
          Math.abs(data[ix + 1] - target[1]) <= FILL_TOLERANCE &&
          Math.abs(data[ix + 2] - target[2]) <= FILL_TOLERANCE &&
          Math.abs(data[ix + 3] - target[3]) <= FILL_TOLERANCE
        );
      }

      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const vi = y * w + x;
        if (visited[vi]) continue;
        if (isOutlineLine(x, y)) continue;
        const ix = vi * 4;
        if (!similar(ix)) continue;

        visited[vi] = 1;
        data[ix] = fill[0];
        data[ix + 1] = fill[1];
        data[ix + 2] = fill[2];
        data[ix + 3] = fill[3];

        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }

      colorCtx.putImageData(img, 0, 0);
      redraw();
    }

    function pointFromEvent(e) {
      const r = canvas.getBoundingClientRect();
      let cx;
      let cy;
      if (e.touches && e.touches.length) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length) {
        cx = e.changedTouches[0].clientX;
        cy = e.changedTouches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      return {
        x: ((cx - r.left) / r.width) * canvas.width,
        y: ((cy - r.top) / r.height) * canvas.height,
      };
    }

    function fillFromEvent(e) {
      if (!ready) return;
      e.preventDefault?.();
      const p = pointFromEvent(e);
      floodFillAt(p.x, p.y);
    }

    function onOutlineReady() {
      ready = true;
      requestAnimationFrame(() => {
        resize();
        cacheOutlineMask();
        redraw();
        if (typeof onReady === "function") onReady();
      });
    }

    outlineImg.onload = onOutlineReady;
    outlineImg.onerror = () => {
      stage.innerHTML =
        '<p class="muted small" style="padding:12px">Boyama görseli yüklenemedi.</p>';
    };
    if (outlineImg.complete && outlineImg.naturalWidth) onOutlineReady();

    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        fillFromEvent(e);
      },
      { passive: false }
    );

    btnFill.addEventListener("click", () => setActiveTool("fill"));
    btnEraser.addEventListener("click", () => setActiveTool("eraser"));
    btnReset.addEventListener("click", () => {
      colorCtx.clearRect(0, 0, colorLayer.width, colorLayer.height);
      redraw();
    });
    btnDownload.addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = `boyama-${slugify(title)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });

    const ctrl = {
      title,
      src,
      copyPaintTo(other) {
        if (!other || !colorLayer.width) return;
        other.importPaintLayer(colorLayer);
        other.redrawPublic?.();
      },
      importPaintLayer(fromCanvas) {
        if (!fromCanvas.width || !canvas.width) return;
        colorCtx.clearRect(0, 0, colorLayer.width, colorLayer.height);
        colorCtx.drawImage(fromCanvas, 0, 0, colorLayer.width, colorLayer.height);
        redraw();
      },
      redrawPublic: () => {
        cacheOutlineMask();
        redraw();
      },
      destroy() {
        if (ctrl._onResize) window.removeEventListener("resize", ctrl._onResize);
        host.innerHTML = "";
      },
    };

    if (btnFullscreen) {
      btnFullscreen.addEventListener("click", () => openColoringFullscreen(ctrl));
    }

    const onResize = () => {
      resize();
      cacheOutlineMask();
    };
    if (!compact) {
      window.addEventListener("resize", onResize, { passive: true });
      ctrl._onResize = onResize;
    }

    return ctrl;
  }

  function initColoring(el) {
    const src = el.getAttribute("data-coloring-src");
    const title = el.getAttribute("data-coloring-title") || "Boyama";
    if (!src) return;
    const ctrl = mountColoring(el, { src, title, compact: true });
    el._coloringCtrl = ctrl;
  }

  Array.from(root.querySelectorAll("[data-coloring-src]")).forEach((el) => initColoring(el));

  function openColoringFullscreen(inlineCtrl) {
    if (!coloringModal || !coloringModalHost || !inlineCtrl) return;
    if (coloringModalTitle) coloringModalTitle.textContent = inlineCtrl.title || "Boyama";
    if (modalColoringCtrl) modalColoringCtrl.destroy();
    coloringModalHost.innerHTML = "";
    modalColoringCtrl = mountColoring(coloringModalHost, {
      src: inlineCtrl.src,
      title: inlineCtrl.title,
      compact: false,
      onReady: () => {
        if (inlineCtrl && modalColoringCtrl) inlineCtrl.copyPaintTo(modalColoringCtrl);
      },
    });
    const dialogHandler = () => {
      if (inlineCtrl && modalColoringCtrl) modalColoringCtrl.copyPaintTo(inlineCtrl);
      coloringModal.removeEventListener("close", dialogHandler);
    };
    coloringModal.addEventListener("close", dialogHandler);
    if (typeof coloringModal.showModal === "function") coloringModal.showModal();
  }

  /* Poster görselleri: tıkla büyüt */
  const mediaModal = document.getElementById("mediaModal");
  const mediaModalImg = document.getElementById("mediaModalImg");
  const mediaModalTitle = document.getElementById("mediaModalTitle");
  const mediaModalOpen = document.getElementById("mediaModalOpen");

  function openPoster(src, title) {
    if (!mediaModal || !mediaModalImg) {
      window.open(src, "_blank", "noopener,noreferrer");
      return;
    }
    if (mediaModalTitle) mediaModalTitle.textContent = title || "Görsel";
    mediaModalImg.src = src;
    mediaModalImg.alt = title || "Görsel";
    if (mediaModalOpen) mediaModalOpen.href = src;
    if (typeof mediaModal.showModal === "function") mediaModal.showModal();
    else window.open(src, "_blank", "noopener,noreferrer");
  }

  function bindMediaZoom(img) {
    img.classList.add("boyamaImg--zoom");
    const open = () => openPoster(img.currentSrc || img.src, img.alt || "Görsel");
    img.addEventListener("click", open);
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }

  root.querySelectorAll("img.boyamaImg, img.mediaZoom").forEach(bindMediaZoom);

  /* —— 40+ YouTube videoları —— */
  const youtubeModal = document.getElementById("youtubeModal");
  const youtubeIframe = document.getElementById("youtubeModalIframe");
  const youtubeModalTitle = document.getElementById("youtubeModalTitle");
  const youtubeModalOpen = document.getElementById("youtubeModalOpen");

  function openYoutube(id, title) {
    if (!id) return;
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    if (youtubeModalTitle) youtubeModalTitle.textContent = title || "Video";
    if (youtubeModalOpen) youtubeModalOpen.href = watchUrl;
    if (youtubeIframe) {
      youtubeIframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (youtubeModal && typeof youtubeModal.showModal === "function") {
      youtubeModal.showModal();
    } else {
      window.open(watchUrl, "_blank", "noopener,noreferrer");
    }
  }

  function closeYoutube() {
    if (youtubeIframe) youtubeIframe.src = "";
  }

  if (youtubeModal) {
    youtubeModal.addEventListener("close", closeYoutube);
  }

  root.querySelectorAll("[data-youtube-id]").forEach((btn) => {
    const id = btn.getAttribute("data-youtube-id");
    const titleEl = btn.querySelector("[data-yt-title]");
    btn.addEventListener("click", () => {
      openYoutube(id, titleEl?.textContent?.trim() || "Video");
    });
    if (titleEl && id) {
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.title) {
            titleEl.textContent = data.title;
            btn.setAttribute("aria-label", `${data.title} videosunu oynat`);
          }
        })
        .catch(() => {
          titleEl.textContent = "Afet hazırlığı videosu";
        });
    }
  });

  /* —— 2–10 Mini oyunlar: kids-mini-games.js (günlük rotasyon) —— */

  /* —— 10–18 Quiz + rozet —— */
  const quizRoot = root.querySelector('[data-quiz="teen"]');
  if (!quizRoot) return;

  const startBtn = quizRoot.querySelector('[data-quiz-action="start"]');
  const metaEl = quizRoot.querySelector("[data-quiz-meta]");
  const qWrap = quizRoot.querySelector(".quiz__q");
  const resultWrap = quizRoot.querySelector(".quiz__result");
  const progressEl = quizRoot.querySelector("[data-quiz-progress]");
  const questionEl = quizRoot.querySelector("[data-quiz-question]");
  const optionsEl = quizRoot.querySelector("[data-quiz-options]");
  const feedbackEl = quizRoot.querySelector("[data-quiz-feedback]");
  const nextBtn = quizRoot.querySelector('[data-quiz-action="next"]');
  const restartBtn = quizRoot.querySelector('[data-quiz-action="restart"]');
  const scoreEl = quizRoot.querySelector("[data-quiz-score]");
  const badgesEl = quizRoot.querySelector("[data-badges]");

  const LS_KEY = "awareness_badges_v1";

  let data = null;
  let idx = 0;
  let chosen = [];
  let answered = false;

  function readBadges() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeBadges(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }

  function awardBadges(percent) {
    const current = new Set(readBadges());
    if (percent >= 70) current.add("Hazır Başlangıç");
    if (percent >= 85) current.add("Afet Bilgini Güçlendir");
    if (percent >= 95) current.add("Farkındalık Ustası");
    writeBadges(Array.from(current));
  }

  function renderBadges() {
    const list = readBadges();
    if (!badgesEl) return;
    if (list.length === 0) {
      badgesEl.innerHTML = '<p class="muted small">Henüz rozet yok. Quizi tamamlayınca burada görünecek.</p>';
      return;
    }
    badgesEl.innerHTML = list.map((b) => `<span class="badge">${escapeHtml(b)}</span>`).join("");
  }

  function show(state) {
    // state: intro | q | result
    if (state === "q") {
      qWrap.hidden = false;
      resultWrap.hidden = true;
    } else if (state === "result") {
      qWrap.hidden = true;
      resultWrap.hidden = false;
    } else {
      qWrap.hidden = true;
      resultWrap.hidden = true;
    }
  }

  function renderQuestion() {
    answered = false;
    feedbackEl.hidden = true;
    nextBtn.hidden = true;

    const q = data.questions[idx];
    progressEl.textContent = `Soru ${idx + 1} / ${data.questions.length}`;
    questionEl.textContent = q.text;
    optionsEl.innerHTML = q.options
      .map((opt, i) => `<button type="button" class="quizOpt" data-opt="${i}">${escapeHtml(opt)}</button>`)
      .join("");
    optionsEl.querySelectorAll(".quizOpt").forEach((btn) => {
      btn.addEventListener("click", () => pick(Number(btn.getAttribute("data-opt"))));
    });
  }

  function pick(optIdx) {
    if (answered) return;
    answered = true;
    chosen[idx] = optIdx;

    const q = data.questions[idx];
    const ok = optIdx === q.correct;
    optionsEl.querySelectorAll(".quizOpt").forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correct) btn.classList.add("quizOpt--correct");
      else if (i === optIdx && !ok) btn.classList.add("quizOpt--wrong");
    });

    feedbackEl.hidden = false;
    feedbackEl.className = `quiz__feedback quiz__feedback--${ok ? "ok" : "fail"}`;
    feedbackEl.innerHTML = `<strong>${ok ? "Doğru" : "Yanlış"}</strong><p>${escapeHtml(
      q.explanation || ""
    )}</p>`;

    nextBtn.hidden = false;
    nextBtn.textContent = idx + 1 >= data.questions.length ? "Sonucu gör" : "Sonraki";
  }

  function computeScore() {
    let correct = 0;
    data.questions.forEach((q, i) => {
      if (chosen[i] === q.correct) correct += 1;
    });
    const percent = Math.round((correct / data.questions.length) * 100);
    return { correct, total: data.questions.length, percent };
  }

  function renderResult() {
    const s = computeScore();
    awardBadges(s.percent);
    scoreEl.innerHTML = `<div class="quizScore">${s.correct}/${s.total} · <strong>%${s.percent}</strong></div>`;
    renderBadges();
    show("result");
  }

  function start() {
    idx = 0;
    chosen = [];
    renderQuestion();
    show("q");
  }

  startBtn?.addEventListener("click", start);
  nextBtn?.addEventListener("click", () => {
    idx += 1;
    if (idx >= data.questions.length) renderResult();
    else renderQuestion();
  });
  restartBtn?.addEventListener("click", () => {
    show("intro");
    renderBadges();
  });

  renderBadges();

  fetch("/farkindalik-quiz.json")
    .then((r) => {
      if (!r.ok) throw new Error("Quiz yüklenemedi");
      return r.json();
    })
    .then((json) => {
      data = json;
      startBtn.disabled = false;
      metaEl.textContent = `${data.questions.length} soru · Rozet kazan`;
    })
    .catch(() => {
      metaEl.textContent = "Quiz yüklenemedi.";
    });
})();

