const API_URL = "https://ai-resume-roaster.up.railway.app";

export const roastResume = async (resume) => {
  const response = await fetch(
    new URL("/api/roast", API_URL).toString(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resume }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to roast resume");
  }

  return response.json();
};