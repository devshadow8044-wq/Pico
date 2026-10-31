import { requireUser, send } from "../_lib/auth.js";

export default async function handler(req, res) {
  const auth = await requireUser(req).catch(e => ({ error: e.message, status: 500 }));
  if (auth.error) return send(res, auth.status || 500, { error: auth.error });
  const { client, user } = auth;
  const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin") return send(res, 403, { error: "Accès administrateur refusé." });

  if (req.method === "GET") {
    const { data, error } = await client.from("transactions").select("id,user_id,type,amount,method,reference,status,created_at,profiles(full_name,phone)").order("created_at", { ascending: false }).limit(200);
    if (error) return send(res, 400, { error: error.message });
    return send(res, 200, { transactions: data });
  }
  if (req.method === "PATCH") {
    const { id, status } = req.body || {};
    if (!id || !["approved", "rejected"].includes(status)) return send(res, 400, { error: "Décision invalide." });
    const { data, error } = await client.rpc("admin_review_transaction", {
      p_transaction_id: id, p_new_status: status, p_admin_id: user.id
    });
    if (error) return send(res, 400, { error: error.message });
    return send(res, 200, { result: data });
  }
  res.setHeader("Allow", "GET, PATCH");
  return send(res, 405, { error: "Méthode non autorisée." });
}
