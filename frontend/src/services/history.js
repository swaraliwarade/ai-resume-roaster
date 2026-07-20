import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getRoastHistory() {
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.error("Error reading auth session for history:", err);
  }

  const response = await fetch(`${API_URL}/api/history`, {
    headers,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch history");
  }

  return data.roasts;
}