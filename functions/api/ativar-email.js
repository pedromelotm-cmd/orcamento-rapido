// Activates Pro from the email used at Stripe checkout: finds a completed checkout session for that email
// with a subscription that is still active. Works without any redirect configured on the payment link.
import { json, stripeGet } from "../../lib/stripe.js";

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export async function onRequestGet({ request, env }) {
  const raw = (new URL(request.url).searchParams.get("email") || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) || raw.length > 200) return json({ ok: false, erro: "Email inválido." }, 400);
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, erro: "Os pagamentos ainda não estão configurados." }, 503);

  const variants = [...new Set([raw, raw.toLowerCase()])];
  for (const email of variants) {
    const q = "checkout/sessions?status=complete&limit=20&customer_details[email]=" + encodeURIComponent(email);
    const { ok, data } = await stripeGet(env, q);
    if (!ok) return json({ ok: false, erro: "Não foi possível confirmar o pagamento. Tente daqui a pouco." }, 502);
    for (const s of data.data || []) {
      const sub = typeof s.subscription === "string" ? s.subscription : s.subscription && s.subscription.id;
      if (!sub) continue;
      const res = await stripeGet(env, "subscriptions/" + sub);
      if (res.ok && ACTIVE.has(res.data.status)) return json({ ok: true, sub });
    }
  }
  return json({ ok: false, erro: "Ainda não encontrámos um pagamento ativo com este email." });
}
