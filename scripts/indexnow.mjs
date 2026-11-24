// Run after a successful deployment: node scripts/indexnow.mjs / /faq
// Submit only URLs that have actually changed.
const host = "homenageando.com.br";
const key = "d2884b889b6f4a0d955cf82add984e36";
const origin = `https://${host}`;
const args = process.argv.slice(2);
if (!args.length) throw new Error("Informe os caminhos alterados.");
const urlList = [...new Set(args.map(path => {
  const url = new URL(path, origin);
  if (url.origin !== origin || url.search || url.hash) throw new Error("URL inválida: " + path);
  return url.href;
}))];
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `${origin}/${key}.txt`, urlList }),
  signal: AbortSignal.timeout(15000),
});
if (![200, 202].includes(response.status)) throw new Error("IndexNow HTTP " + response.status);
console.log("IndexNow:", response.status, urlList);
