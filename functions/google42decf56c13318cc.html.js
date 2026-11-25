// Google Search Console verification file, served at its exact .html path (Pages would otherwise redirect it).
export function onRequest() {
  return new Response("google-site-verification: google42decf56c13318cc.html", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
