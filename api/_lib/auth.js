import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration serveur Supabase manquante.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: "Authentification requise.", status: 401 };
  const client = adminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { error: "Session invalide.", status: 401 };
  return { client, user: data.user };
}

export function send(res, status, body) {
  return res.status(status).setHeader("Cache-Control", "no-store").json(body);
}
