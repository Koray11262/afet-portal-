function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function parseCoord(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function withDistance(rows, lat, lng) {
  return rows
    .map((r) => {
      const rLat = parseCoord(r.lat);
      const rLng = parseCoord(r.lng);
      if (rLat == null || rLng == null) return null;
      return {
        id: r.id,
        ad: r.ad,
        il: r.il,
        ilce: r.ilce || null,
        adres: r.adres || null,
        lat: rLat,
        lng: rLng,
        kapasite: r.kapasite != null ? Number(r.kapasite) : null,
        mesafe_km: Math.round(haversineKm(lat, lng, rLat, rLng) * 100) / 100,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.mesafe_km - b.mesafe_km);
}

module.exports = { haversineKm, withDistance };
