// Helpers shared by the /api functions. STRIPE_SECRET_KEY is set in Cloudflare Pages settings, never in the repo.
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function stripeGet(env, path) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY },
  });
  return { ok: res.ok, data: res.ok ? await res.json() : null };
}
