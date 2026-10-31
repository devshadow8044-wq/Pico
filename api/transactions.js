import { requireUser, send } from "./_lib/auth.js";

export default async function handler(req, res) {
  const auth = await requireUser(req).catch(e => ({ error: e.message, status: 500 }));
  if (auth.error) return send(res, auth.status || 500, { error: auth.error });
  const { client, user } = auth;
  if (req.method === "GET") {
    const { data, error } = await client.from("transactions").select("id,type,amount,method,reference,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) return send(res, 400, { error: error.message });
    return send(res, 200, { transactions: data });
  }
  if (req.method === "POST") {
    const { type, amount, method, reference } = req.body || {};
    const value = Number(amount);
    if (!["deposit", "withdrawal"].includes(type)) return send(res, 400, { error: "Type d’opération invalide." });
    if (!Number.isSafeInteger(value) || value < (type === "deposit" ? 2000 : 1000) || value > 100000000) return send(res, 400, { error: "Montant invalide ou inférieur au minimum." });
    if (!["Wave", "Orange Money", "Free Money", "MTN MoMo"].includes(method)) return send(res, 400, { error: "Moyen de paiement invalide." });
    const { data, error } = await client.from("transactions").insert({
      user_id: user.id, type, amount: value, method,
      reference: typeof reference === "string" ? reference.slice(0, 120) : null
    }).select("id,status,created_at").single();
    if (error) return send(res, 400, { error: error.message });
    return send(res, 201, { transaction: data });
  }
  res.setHeader("Allow", "GET, POST");
  return send(res, 405, { error: "Méthode non autorisée." });
}
