#!/usr/bin/env node
/**
 * AFAD toplanma alanı veri senkronizasyonu.
 *
 * Kullanım:
 *   node scripts/sync-toplanma-alanlari.js --github
 *   node scripts/sync-toplanma-alanlari.js --il=İzmir
 *   node scripts/sync-toplanma-alanlari.js --all
 */

const afadToplanma = require("../src/afad-toplanma");

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function parseArgs(argv) {
  const opts = { github: false, all: false, il: null };
  for (const arg of argv) {
    if (arg === "--github") opts.github = true;
    else if (arg === "--all") opts.all = true;
    else if (arg.startsWith("--il=")) opts.il = arg.slice(5).trim();
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.github && !opts.all && !opts.il) {
    log("En az bir seçenek gerekli: --github | --il=Ad | --all");
    process.exit(1);
  }

  if (opts.github) {
    await afadToplanma.importGithubBundle(log);
  }

  if (opts.il) {
    await afadToplanma.syncProvince(opts.il, log);
  }

  if (opts.all) {
    log("Eksik iller AFAD e-Devlet üzerinden çekiliyor (uzun sürebilir)…");
    const count = await afadToplanma.syncAllMissing(log);
    log(`Yeni senkronize edilen il sayısı: ${count}`);
  }

  afadToplanma.reloadIndex();
  const meta = await afadToplanma.getMeta();
  log(`Toplam ${meta.total} alan, ${meta.syncedCount}/${meta.totalIller} il yüklü.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
