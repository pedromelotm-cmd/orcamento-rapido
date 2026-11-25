// Serve index.html for folder paths ("/" and "/guias/"); all other files are served as-is.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/")) {
      url.pathname += "index.html";
      const res = await env.ASSETS.fetch(new Request(url, request));
      if (res.status !== 404) return res;
    }
    return new Response("Página não encontrada", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
