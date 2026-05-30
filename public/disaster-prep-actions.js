/**
 * Öncesinde hazırlık bağlantıları — kayıtlı il ile il riskleri URL'si.
 */
(function () {
  const link = document.querySelector("[data-dynamic-il-risk]");
  if (!link) return;

  let il = "";
  try {
    const raw = localStorage.getItem("afet_portal_profile_v1");
    if (raw) {
      const profile = JSON.parse(raw);
      if (profile && profile.il) il = String(profile.il).trim();
    }
  } catch {
    /* ignore */
  }

  link.href = il
    ? `/il-riskleri?il=${encodeURIComponent(il)}`
    : "/il-riskleri";
})();
