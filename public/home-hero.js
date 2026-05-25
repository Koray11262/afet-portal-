(function () {
  const root = document.querySelector(".homeHero");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".homeHero__slide"));
  const dots = Array.from(root.querySelectorAll(".homeHero__dot"));
  let idx = 0;
  let timer = null;

  function show(i) {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle("is-active", n === idx));
    dots.forEach((d, n) => d.classList.toggle("is-active", n === idx));
  }

  dots.forEach((d) => {
    d.addEventListener("click", () => {
      show(Number(d.getAttribute("data-go")));
      resetTimer();
    });
  });

  function resetTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => show(idx + 1), 6000);
  }

  resetTimer();
})();
