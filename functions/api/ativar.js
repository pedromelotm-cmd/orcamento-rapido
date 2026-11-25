// Called by /obrigado after Stripe checkout: confirms the session was paid and returns the subscription id.
import { json, stripeGet } from "../../lib/stripe.js";

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return json({ ok: false, erro: "Sessão de pagamento inválida." }, 400);
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, erro: "Os pagamentos ainda não estão configurados." }, 503);

  const { ok, data } = await stripeGet(env, "checkout/sessions/" + id);
  if (!ok) return json({ ok: false, erro: "Pagamento não encontrado." }, 404);
  if (data.status !== "complete" || !data.subscription) return json({ ok: false, erro: "O pagamento ainda não foi concluído." }, 402);

  const sub = typeof data.subscription === "string" ? data.subscription : data.subscription.id;
  return json({ ok: true, sub });
}
