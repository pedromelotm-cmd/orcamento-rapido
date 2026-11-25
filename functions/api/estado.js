// ?config=1 → whether payments are configured; ?sub=sub_... → whether that subscription is still active.
import { json, stripeGet } from "../../lib/stripe.js";

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const configured = Boolean(env.STRIPE_SECRET_KEY);
  if (params.has("config")) return json({ configured });

  const sub = params.get("sub") || "";
  if (!/^sub_[A-Za-z0-9]+$/.test(sub)) return json({ erro: "Subscrição inválida." }, 400);
  if (!configured) return json({ erro: "Pagamentos não configurados." }, 503);

  const { ok, data } = await stripeGet(env, "subscriptions/" + sub);
  if (!ok) return json({ active: false });
  return json({ active: ACTIVE.has(data.status) });
}
