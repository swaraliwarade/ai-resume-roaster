import { supabase } from "./services/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper to get auth headers
async function getAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function roastResume(resume, role = "", jobDescription = "", filename = "") {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/roast`, {
    method: "POST",
    headers,
    body: JSON.stringify({ resume, role, jobDescription, filename }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate roast");
  }

  return data;
}

export async function compareResumes(oldResume, newResume, filenameOld = "", filenameNew = "") {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/roast/compare`, {
    method: "POST",
    headers,
    body: JSON.stringify({ oldResume, newResume, filenameOld, filenameNew }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to compare resumes");
  }

  return data;
}