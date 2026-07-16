const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

export const roastResume = async (resume) => {
  const response = await fetch(
    `${API_URL}/api/roast`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resume,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to roast resume");
  }

  return response.json();
};