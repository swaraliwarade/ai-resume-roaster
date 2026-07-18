const API_URL = import.meta.env.VITE_API_URL;

export async function roastResume(resume) {
  const response = await fetch(
    `${API_URL}/api/roast`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resume }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to generate roast"
    );
  }

  return data;
}