(function () {
  const nav = document.querySelector(".siteHeader__nav");
  if (!nav) return;

  const megas = Array.from(nav.querySelectorAll(".siteNav--mega"));

  function closeAll(except) {
    megas.forEach((m) => {
      if (m === except) return;
      m.classList.remove("is-open");
      const btn = m.querySelector(".siteNav__trigger");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  megas.forEach((mega) => {
    const trigger = mega.querySelector(".siteNav__trigger");
    if (!trigger) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = mega.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) closeAll(mega);
    });
  });

  document.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
})();
