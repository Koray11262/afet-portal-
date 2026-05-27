const AFAD_DUYURULAR_URL = "https://www.afad.gov.tr/duyurular";
const CACHE_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 8;

let cache = { at: 0, data: null };

function decodeHtml(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(href) {
  if (!href) return AFAD_DUYURULAR_URL;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `https://www.afad.gov.tr${href}`;
  return href;
}

function parseAnnouncements(html, limit = DEFAULT_LIMIT) {
  const items = [];
  const blockRegex = /<div class="ministry-announcements">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;

  while ((match = blockRegex.exec(html)) !== null && items.length < limit) {
    const block = match[1];
    const day = (block.match(/<div class="day">(\d+)<\/div>/) || [])[1];
    const month = (block.match(/<div class="month">([^<]+)<\/div>/) || [])[1]?.trim();
    const linkMatch = block.match(/<a class="announce-text" href="([^"]+)">([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    const title = decodeHtml(linkMatch[2].replace(/<[^>]+>/g, " "));
    if (!title) continue;

    items.push({
      title,
      url: normalizeUrl(linkMatch[1]),
      dateLabel: day && month ? `${day} ${month}` : month || "",
    });
  }

  return items;
}

async function fetchFromAfad(limit = DEFAULT_LIMIT) {
  const res = await fetch(AFAD_DUYURULAR_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "AfetPortali/1.0 (+https://github.com/Koray11262/afet-portal-)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`AFAD duyurular sayfası: ${res.status}`);
  }

  const html = await res.text();
  const items = parseAnnouncements(html, limit);

  if (!items.length) {
    throw new Error("AFAD duyuruları ayrıştırılamadı");
  }

  return items;
}

function formatUpdatedAt(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getRecentAnnouncements(limit = DEFAULT_LIMIT) {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const items = await fetchFromAfad(limit);
    const payload = {
      ok: true,
      items: items.slice(0, limit),
      updatedAt: formatUpdatedAt(new Date()),
      source: "AFAD",
      sourceUrl: AFAD_DUYURULAR_URL,
    };
    cache = { at: now, data: payload };
    return payload;
  } catch (err) {
    if (cache.data?.ok) {
      return {
        ...cache.data,
        stale: true,
        error: String(err?.message || err),
      };
    }
    return {
      ok: false,
      items: [],
      updatedAt: null,
      source: "AFAD",
      sourceUrl: AFAD_DUYURULAR_URL,
      error: String(err?.message || err),
    };
  }
}

module.exports = {
  getRecentAnnouncements,
  DEFAULT_LIMIT,
};
