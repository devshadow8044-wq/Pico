import { supabase } from "./supabase";

export async function api(path, options = {}) {
  if (!supabase) throw new Error("Supabase n'est pas encore configuré.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Session expirée. Reconnectez-vous.");
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");
  return result;
}
